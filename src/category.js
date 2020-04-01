/*jshint esversion: 6 */

import {generateUrl} from "@nextcloud/router";
import {getProjectName, selectProject} from "./project";
import * as Notification from "./notification";
import * as constants from "./constants";
import cospend from "./state";
import {getBills} from './bill';

export function getProjectCategories (projectid) {
    $('#billdetail').html('<h2 class="icon-loading-small"></h2>');
    const req = {};
    let url, type;
    if (!cospend.pageIsPublic) {
        req.projectid = projectid;
        url = generateUrl('/apps/cospend/getProjectInfo');
        type = 'POST';
    } else {
        url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password);
        type = 'GET';
    }
    cospend.currentGetProjectsAjax = $.ajax({
        type: type,
        url: url,
        data: req,
        async: true,
    }).done(function (response) {
        if (cospend.currentProjectId !== projectid) {
            selectProject($('.projectitem[projectid="' + projectid + '"]'));
        }
        displayCategories(projectid, response);
    }).always(function () {
    }).fail(function () {
        Notification.showTemporary(t('cospend', 'Failed to get project categories'));
        $('#billdetail').html('');
    });
}

export function displayCategories (projectid, projectInfo) {
    // deselect bill
    $('.billitem').removeClass('selectedbill');
    const categories = projectInfo.categories;
    const projectName = getProjectName(projectid);
    $('#billdetail').html('');
    $('.app-content-list').addClass('showdetails');
    const titleStr = t('cospend', 'Categories of project {name}', {name: projectName});

    const catStr = '<div id="app-details-toggle" tabindex="0" class="icon-confirm"></div>' +
        '<h2 id="catTitle" projectid="' + projectid + '"><span class="icon-category-app-bundles"></span>' + titleStr + '</h2>' +
        '<div id="manage-categories">' +
        '    <div id="categories-div">' +
        '        <div id="add-category-div">' +
        '            <label>' +
        '                <a class="icon icon-add"></a>' +
        '                ' + t('cospend', 'Add category') +
        '            </label>' +
        '            <div id="add-category">' +
        '                <label for="addCategoryIconInput">' + t('cospend', 'Icon') + '</label>'+
        '                <input type="text" value="" maxlength="3" id="addCategoryIconInput">' +
        '                <label for="addCategoryNameInput">' + t('cospend', 'Name') + '</label>' +
        '                <input type="text" value="" maxlength="300" id="addCategoryNameInput">' +
        '                <label for="addCategoryColorInput">' + t('cospend', 'Color') + '</label>' +
        '                <input type="color" value="" id="addCategoryColorInput">' +
        '                <input type="submit" value="" class="icon-add addCategoryOk">' +
        '            </div>' +
        '            <hr/>' +
        '        </div><br/>' +
        '        <label>' +
        '            <a class="icon icon-category-app-bundles"></a>' +
        '            ' + t('cospend', 'Category list') +
        '        </label><br/><br/>' +
        '        <div id="category-list">' +
        '        </div>' +
        '    </div>' +
        '</div>';

    $('#billdetail').html(catStr);
    for (const catId in categories) {
        addCategory(projectid, catId, categories[catId]);
    }
    if (cospend.projects[projectid].myaccesslevel < constants.ACCESS.MAINTENER) {
        $('#add-category-div').hide();
        $('.editOneCategory').hide();
        $('.deleteOneCategory').hide();
    }
    $('#addCategoryIconInput').emojioneArea({
        standalone: true,
        autocomplete: false,
        saveEmojisAs: 'unicode',
        pickerPosition: 'bottom',
    });
}

export function addCategoryDb (projectid, name, icon, color) {
    $('.addCategoryOk').addClass('icon-loading-small');
    const req = {
        name: name,
        icon: icon,
        color: color
    };
    let url;
    if (!cospend.pageIsPublic) {
        req.projectid = projectid;
        url = generateUrl('/apps/cospend/addCategory');
    } else {
        url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/category');
    }
    $.ajax({
        type: 'POST',
        url: url,
        data: req,
        async: true
    }).done(function (response) {
        cospend.projects[projectid].categories[response] = {
            name: name,
            icon: icon,
            color: color
        };
        addCategory(projectid, response, cospend.projects[projectid].categories[response]);
        Notification.showTemporary(t('cospend', 'Category {n} added', {n: name}));
    }).always(function () {
        $('.addCategoryOk').removeClass('icon-loading-small');
    }).fail(function (response) {
        Notification.showTemporary(
            t('cospend', 'Failed to add category') +
            ': ' + (response.responseJSON.message || response.responseText)
        );
    });
}

export function addCategory (projectid, catId, category) {
    const catStr = '<div class="one-category" projectid="' + projectid + '" categoryid="' + catId + '">' +
        '    <div class="one-category-label">' +
        '        <label class="one-category-label-icon">' + (category.icon || '') + '</label>' +
        '        <label class="one-category-label-label">' + category.name + '</label>' +
        '        <input class="one-category-label-color" type="color" value="' + category.color + '" readonly/>' +
        '        <input type="submit" value="" class="icon-rename editOneCategory">' +
        '        <input type="submit" value="" class="icon-delete deleteOneCategory">' +
        '    </div>' +
        '    <div class="one-category-edit">' +
        '        <label>' + t('cospend', 'Icon') + '</label>' +
        '        <input type="text" value="' + (category.icon || '') + '" maxlength="3" class="editCategoryIconInput">' +
        '        <label>' + t('cospend', 'Name') + '</label>' +
        '        <input type="text" value="' + category.name + '" maxlength="300" class="editCategoryNameInput">' +
        '        <label>' + t('cospend', 'Color') + '</label>' +
        '        <input type="color" value="' + category.color + '" class="editCategoryColorInput">' +
        '        <input type="submit" value="" class="icon-close editCategoryClose">' +
        '        <input type="submit" value="" class="icon-checkmark editCategoryOk">' +
        '    </div>' +
        '</div>';
    $('#category-list').append(catStr);
    $('.one-category[categoryid='+catId+'] .editCategoryIconInput').emojioneArea({
        standalone: true,
        autocomplete: false,
        saveEmojisAs: 'unicode',
        pickerPosition: 'bottom',
    });
}

export function deleteCategoryDb (projectid, categoryId) {
    $('.one-category[categoryid=' + categoryId + '] .deleteOneCategory').addClass('icon-loading-small');
    const req = {};
    let url, type;
    if (!cospend.pageIsPublic) {
        req.projectid = projectid;
        req.categoryid = categoryId;
        url = generateUrl('/apps/cospend/deleteCategory');
        type = 'POST';
    } else {
        type = 'DELETE';
        url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/category/' + categoryId);
    }
    $.ajax({
        type: type,
        url: url,
        data: req,
        async: true
    }).done(function () {
        $('.one-category[categoryid=' + categoryId + ']').remove();
        delete cospend.projects[projectid].categories[categoryId];
        // reload bill list
        getBills(projectid);
    }).always(function () {
        $('.one-category[categoryid=' + categoryId + '] .deleteOneCategory').removeClass('icon-loading-small');
    }).fail(function (response) {
        Notification.showTemporary(
            t('cospend', 'Failed to delete category') +
            ': ' + response.responseJSON.message);
    });
}

export function editCategoryDb (projectid, categoryId, name, icon, color) {
    $('.one-category[categoryid=' + categoryId + '] .editCategoryOk').addClass('icon-loading-small');
    const req = {
        name: name,
        icon: icon,
        color: color
    };
    let url, type;
    if (!cospend.pageIsPublic) {
        req.projectid = projectid;
        req.categoryid = categoryId;
        url = generateUrl('/apps/cospend/editCategory');
        type = 'POST';
    } else {
        url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/category/' + categoryId);
        type = 'PUT';
    }
    $.ajax({
        type: type,
        url: url,
        data: req,
        async: true
    }).done(function () {
        $('.one-category[categoryid=' + categoryId + '] .one-category-edit').hide();
        $('.one-category[categoryid=' + categoryId + '] .one-category-label').show()
            .find('.one-category-label-label').text(name);
        $('.one-category[categoryid=' + categoryId + '] .one-category-label .one-category-label-icon').text(icon || '');
        $('.one-category[categoryid=' + categoryId + '] .one-category-label .one-category-label-color').val(color);
        cospend.projects[projectid].categories[categoryId].name = name;
        cospend.projects[projectid].categories[categoryId].icon = icon;
        cospend.projects[projectid].categories[categoryId].color = color;
        // reload bill list
        getBills(projectid);
    }).always(function () {
        $('.one-category[categoryid=' + categoryId + '] .editCategoryOk').removeClass('icon-loading-small');
    }).fail(function (response) {
        Notification.showTemporary(
            t('cospend', 'Failed to edit category') +
            ': ' + response.responseJSON.message
        );
    });
}