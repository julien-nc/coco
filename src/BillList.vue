<template>
    <div id="bill-list" class="app-content-list">
        <h2 class="icon-loading-small" v-show="false"></h2>
        <BillItem
            v-for="(bill, index) in reverseBills"
            :key="bill.id"
            :bill="bill"
            :projectId="projectId"
            :index="nbBills - index"
            :nbbills="nbBills"
            :selected="bill.id === selectedBillId"
            :editionAccess="editionAccess"
            v-on:clicked="onItemClicked"
            v-on:delete="onItemDeleted"/>
    </div>
</template>

<script>
import BillItem from './components/BillItem';
import {generateUrl} from '@nextcloud/router';
import * as Notification from './notification';
import cospend from './state';
import * as constants from './constants';
import {displayBill} from './bill';

export default {
    name: 'BillList',

    components: {
        BillItem
    },

	data: function() {
		return {
            projectId: cospend.currentProjectId,
            bills: cospend.billLists[cospend.currentProjectId],
            editionAccess: (cospend.projects[cospend.currentProjectId].myaccesslevel > constants.ACCESS.VIEWER),
            loading: true,
            selectedBillId: cospend.selectedBillId
		};
    },

	computed: {
        nbBills: function() {
            return this.bills.length;
        },
        reverseBills: function() {
            return this.bills.slice().reverse();
        }
    },

    methods: {
        onItemClicked: function(bill) {
            this.selectedBillId = bill.id;
            displayBill(this.projectId, bill.id);
        },
        onItemDeleted: function(bill) {
            if (bill.id === 0) {
                this.bills.splice(this.bills.indexOf(bill), 1);
            } else {
                this.deleteBill(bill);
            }
        },
        deleteBill: function(bill) {
            const that = this;
            const req = {};
            let url;
            if (!cospend.pageIsPublic) {
                url = generateUrl('/apps/cospend/projects/' + this.projectId + '/bills/' + bill.id);
            } else {
                url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/bills/' + bill.id);
            }
            $.ajax({
                type: 'DELETE',
                url: url,
                data: req,
                async: true,
            }).done(function() {
                that.bills.splice(that.bills.indexOf(bill), 1);
                delete cospend.bills[that.projectId][bill.id];
                //updateProjectBalances(projectid);
                Notification.showTemporary(t('cospend', 'Bill deleted'));
            }).always(function() {
            }).fail(function(response) {
                Notification.showTemporary(
                    t('cospend', 'Failed to delete bill') +
                    ': ' + response.responseJSON
                );
            });
        }
    }
}
</script>

<style scoped lang="scss">

</style>