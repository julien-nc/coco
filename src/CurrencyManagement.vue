<template>
<div id="manage-currencies">
	<div id="main-currency-div">
		<label>
			<a class="icon icon-tag"></a>{{ t('cospend', 'Main currency') }}
		</label>
		<div id="main-currency-label" v-show="!editMode">
			<label id="main-currency-label-label">{{ project.currencyname || t('cospend', 'None') }}</label>
			<input type="submit" value="" class="icon-rename editMainCurrency"
				v-show="project.myaccesslevel >= constants.ACCESS.MAINTENER"
				v-on:click="editMode=true; $nextTick(() => $refs.mainCurrencyEdit.focus());"/>
		</div>
		<div id="main-currency-edit" v-show="editMode">
			<input type="text" maxlength="64" :value="project.currencyname || ''"
				class="editMainCurrencyInput" :placeholder="t('cospend', 'Main currency name')"
				ref="mainCurrencyEdit"
				v-on:keyup.enter="onEditMainOkClick"
				@focus="$event.target.select()"/>
			<input type="submit" value="" class="icon-close editMainCurrencyClose" v-on:click="editMode=false"/>
			<input type="submit" value="" class="icon-checkmark editMainCurrencyOk" @click="onEditMainOkClick"/>
		</div>
	</div>
	<hr>
	<div id="currencies-div">
		<div id="add-currency-div" v-show="project.myaccesslevel >= constants.ACCESS.MAINTENER">
			<label>
				<a class="icon icon-add"></a>{{ t('cospend', 'Add currency') }}
			</label>
			<div id="add-currency">
				<label for="addCurrencyNameInput">{{ t('cospend', 'Name') }}</label>
				<input type="text" value="" maxlength="64" id="addCurrencyNameInput"
					v-on:keyup.enter="onAddCurrency"
					ref="newCurrencyName" :placeholder="t('cospend', 'New currency name')"/>
				<label for="addCurrencyRateInput">{{ t('cospend', 'Exchange rate to main currency') }}</label>
				<input type="number" value="1" id="addCurrencyRateInput"
					v-on:keyup.enter="onAddCurrency"
					ref="newCurrencyRate" step="0.0001" min="0"/>
				<label class="addCurrencyRateHint">{{ t('cospend', '(1 of this currency = X of main currency)') }}</label>
				<button class="addCurrencyOk" @click="onAddCurrency">
					<span class="icon-add"></span>
					<span>{{ t('cospend', 'Add this currency') }}</span>
				</button>
			</div>
			<hr>
		</div>
		<br>
		<label>
			<a class="icon icon-currencies"></a>{{ t('cospend', 'Currency list') }}
		</label>
		<CurrencyList
			:currencies="currencies"
			:editionAccess="project.myaccesslevel >= constants.ACCESS.MAINTENER"
			v-on:delete="onDeleteCurrency"
			v-on:edit="onEditCurrency"
		/>
	</div>
</div>
</template>

<script>
import cospend from './state';
import CurrencyList from './components/CurrencyList';
import {generateUrl} from '@nextcloud/router';
import * as Notification from './notification';
import * as constants from './constants';
import {editProject} from './project';

export default {
	name: 'CurrencyManagement',

	components: {
		CurrencyList
	},

	data: function() {
		return {
			currencies: cospend.projects[cospend.currentProjectId].currencies,
			project: cospend.projects[cospend.currentProjectId],
			constants: constants,
			editMode: false
		};
	},

	methods: {
		onEditMainOkClick: function() {
			const newVal = this.$refs.mainCurrencyEdit.value;
			editProject(this.project.id, this.project.name , null, null, null, newVal);
			this.editMode = false;
		},
		onAddCurrency: function() {
			const name = this.$refs.newCurrencyName.value;
			const rate = parseFloat(this.$refs.newCurrencyRate.value);
			if (name === null || name === '') {
				Notification.showTemporary(t('cospend', 'Currency name should not be empty'));
				return;
			}
			if (isNaN(rate)) {
				Notification.showTemporary(t('cospend', 'Exchange rate should be a number'));
				return;
			}
			const req = {
				name: name,
				rate: rate
			};
			let url;
			if (!cospend.pageIsPublic) {
				req.projectid = this.project.id;
				url = generateUrl('/apps/cospend/addCurrency');
			} else {
				url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/currency');
			}
			const that = this;
			$.ajax({
				type: 'POST',
				url: url,
				data: req,
				async: true
			}).done(function(response) {
				that.project.currencies.push({
					name: name,
					exchange_rate: rate,
					id: response
				});
				Notification.showTemporary(t('cospend', 'Currency {n} added', {n: name}));
				that.$refs.newCurrencyName.value = '';
				that.$refs.newCurrencyRate.value = 1;
			}).always(function() {
			}).fail(function(response) {
				Notification.showTemporary(
					t('cospend', 'Failed to add currency') +
					': ' + (response.responseJSON.message || response.responseText)
				);
			});
		},
		onDeleteCurrency: function(currency) {
			const that = this;
			const req = {};
			let url, type;
			if (!cospend.pageIsPublic) {
				req.projectid = cospend.currentProjectId;
				req.currencyid = currency.id;
				url = generateUrl('/apps/cospend/deleteCurrency');
				type = 'POST';
			} else {
				type = 'DELETE';
				url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/currency/' + currency.id);
			}
			$.ajax({
				type: type,
				url: url,
				data: req,
				async: true
			}).done(function() {
				let iToDel = null;
				for (let i = 0; i < that.currencies.length; i++) {
					if (parseInt(that.currencies[i].id) === parseInt(currency.id)) {
						iToDel = i;
						break;
					}
				}
				if (iToDel !== null) {
					that.currencies.splice(iToDel, 1);
				}
			}).always(function() {
			}).fail(function(response) {
				Notification.showTemporary(
					t('cospend', 'Failed to delete currency') +
					': ' + response.responseJSON.message
				);
			});
		},

		onEditCurrency: function(currency, backupCurrency) {
			if (currency.name === '') {
				Notification.showTemporary(t('cospend', 'Currency name should not be empty'));
				currency.name = backupCurrency.name;
				currency.exchange_rate = backupCurrency.exchange_rate;
				return;
			}
			const req = {
				name: currency.name,
				rate: currency.exchange_rate
			};
			let url, type;
			if (!cospend.pageIsPublic) {
				req.projectid = cospend.currentProjectId;
				req.currencyid = currency.id;
				url = generateUrl('/apps/cospend/editCurrency');
				type = 'POST';
			} else {
				url = generateUrl('/apps/cospend/api/projects/' + cospend.projectid + '/' + cospend.password + '/currency/' + currency.id);
				type = 'PUT';
			}
			$.ajax({
				type: type,
				url: url,
				data: req,
				async: true
			}).done(function() {
			}).always(function() {
			}).fail(function(response) {
				// backup
				currency.name = backupCurrency.name;
				currency.exchange_rate = backupCurrency.exchange_rate;
				Notification.showTemporary(
					t('cospend', 'Failed to edit currency') +
					'; ' + response.responseJSON.message || response.responseJSON
				);
			});
		},
	},
}
</script>

<style scoped lang="scss">
.editMainCurrency {
    width: 36px !important;
}
.editMainCurrencyInput {
    width: 96%;
}
#main-currency-edit {
	display: grid;
    grid-template: 1fr / 150px 37px 37px;
}
#main-currency-edit input[type=submit] {
    margin-left: -5px;
    border-radius: 0;
    width: 36px !important;
}
.addCurrencyOk {
    background-color: #46ba61;
    color: white;
}
#main-currency-edit,
#add-currency,
#main-currency-label {
    margin-left: 37px;
}
#main-currency-label {
    width: 160px;
    display: grid;
    grid-template: 1fr / 1fr 1fr;
}
#add-currency {
    display: grid;
    grid-template: 1fr / 300px 100px;
}
.addCurrencyRateHint {
    grid-column: 1/3;
}
#main-currency-label-label,
#add-currency label {
    line-height: 40px;
}
</style>