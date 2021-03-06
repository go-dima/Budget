import { Component, OnInit } from '@angular/core';
import { orderBy, uniqBy } from 'lodash';
import { ReplaySubject } from 'rxjs';
import Common from '../common';
import DateUtils from '../date-utils';
import { IAccountSummary } from '../IAccountSummary';
import { ICheckbox } from '../ICheckbox';
import { ITransaction } from '../ITransaction';
import { TransactiosService } from '../transactions.service';

@Component({
  selector: 'pm-accounts-summary',
  templateUrl: './accounts-summary.component.html',
  styleUrls: ['./accounts-summary.component.css']
})
export class AccountsSummaryComponent implements OnInit {
  transactions: ITransaction[];
  accounts: IAccountSummary[] = [];
  byAccount: { [key: string] : ITransaction[]} = {};
  orderedTransactions: ITransaction[];
  selectedCategories: string[];
  relevantProperties: ReplaySubject<ICheckbox[]> = new ReplaySubject<ICheckbox[]>();
  yearlyTransactions: ITransaction[];
  dataLoaded: boolean = false;
  uncheckedCategories: string[] = [
    "\"חו\"\"ל\"",
    "חיסכון",
    "קופת גמל",
    "שונות",
    "חתונה",
    "השקעה",
    "ריבית זכות",
  ]

  constructor(private _transactionsService: TransactiosService) { }

  ngOnInit(): void {
    this.reset();
    this._transactionsService.getAllTransactions().subscribe(
      transactions => {
        this.reset();
        this.orderedTransactions = orderBy(transactions, Common.transactionSortKey, 'desc');
        const yearAgo: string = yearBack(this.orderedTransactions[0].date);
        this.yearlyTransactions = this.orderedTransactions.filter((t: ITransaction) => DateUtils.isBigger(t.date, yearAgo))

        const relevantPropertiesSet: Set<string> = new Set(this.yearlyTransactions.map(transaction => transaction.category));
        this.relevantProperties.next(Array.from(relevantPropertiesSet.values())
                                          .map(c => Common.stringToCheckbox(c, !this.uncheckedCategories.includes(c))))

        this.accounts.push(...uniqBy(this.orderedTransactions, 'account')
                           .filter(t => Common.isSpecialAccount(t.account))
                           .map(accountSummary))
        this.dataLoaded = true
        this.reload();
      });
  }

  private reload() {
    if (!this.dataLoaded)
      return

    this.accounts.forEach(account => {
      let relevantTransactions = this.selectedCategories ?
        this.yearlyTransactions.filter((t: ITransaction) => this.selectedCategories.includes(t.category)) :
        this.yearlyTransactions

      const latestTransaction = this.orderedTransactions.filter(t => t.account == account.name)[0]
      account.balance = latestTransaction ? latestTransaction.balance : 0;

      this.byAccount[account.name] = relevantTransactions.filter((t: ITransaction) => t.account == account.name);
      const latestYearlyTransaction = this.byAccount[account.name][0];
      account.date = latestYearlyTransaction? latestYearlyTransaction.date : "01/01/1900";

      const incomeFilter = (t: ITransaction) => t.amount > 0;
      const expenseFilter = (t: ITransaction) => t.amount < 0;
      account.income_average = this.calcYearlyAverage(this.byAccount[account.name], incomeFilter);
      account.expense_average = this.calcYearlyAverage(this.byAccount[account.name], expenseFilter);
      account.net_average = account.income_average + account.expense_average;
    });
    this.accounts[0].balance = this.accounts.map(a => a.balance).reduce((a,b) => a + b, 0)
    this.accounts[0].date = this.accounts.map(a => a.date).reduce((a, b) => DateUtils.max(a, b))
    this.accounts[0].income_average = this.accounts.map(a => a.income_average).reduce((a,b) => a + b, 0)
    this.accounts[0].expense_average = this.accounts.map(a => a.expense_average).reduce((a,b) => a + b, 0)
    this.accounts[0].net_average = this.accounts.map(a => a.net_average).reduce((a,b) => a + b, 0)
  }

  private calcYearlyAverage(latestTranasactions: ITransaction[], customFilter: (t: ITransaction) => boolean): number {
    if (!latestTranasactions || latestTranasactions.length == 0)
      return 0

    const filteredAmounts: number[] = latestTranasactions.filter(customFilter).map((t: ITransaction) => t.amount);
    const filteredSum = filteredAmounts.length > 0 ? filteredAmounts.reduce((a,b) => a + b, 0) : 0;
    const filteredAvg = filteredSum / 12 || 0;
    return filteredAvg;
  }
  
  reset() {
    this.accounts = [newAccountSummary("Total")]
  }
  
  selectedCategoriesChanged(selectedCategories: string[]) {
    this.selectedCategories = selectedCategories;
    this.reload()
  }
}

function newAccountSummary(newName: string): IAccountSummary {
  return {
    name: newName,
    balance: 0,
    date: "01/01/1900",
    income_average: 0,
    expense_average: 0,
    net_average: 0
  };
}

function accountSummary(transaction: ITransaction): IAccountSummary {
  return newAccountSummary(transaction.account)
}

function yearBack(date: string) : string {
  let year = Number(date.slice(-4))
  let yearBack = date.slice(0, -4) + (year - 1).toString()
  return yearBack;
}



