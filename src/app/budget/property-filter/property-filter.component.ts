import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { ICheckbox } from '../ICheckbox';
import { TransactiosService } from '../transactions.service';
import { ITransaction } from '../ITransaction';
import * as _ from 'lodash';
import { ReplaySubject } from 'rxjs';
import Common from '../common';

@Component({
  selector: 'pm-property-filter',
  templateUrl: './property-filter.component.html',
  styleUrls: ['./property-filter.component.css']
})
export class PropertyFilterComponent implements OnInit {
  @Input() filterProperty: string;
  @Input() customProperties: ReplaySubject<ICheckbox[]>;
  @Input() showInline: boolean = false;
  @Input() showToggleButton: boolean = true;
  @Output() selectedProperties: EventEmitter<string[]> = new EventEmitter<string[]>();
  properties: ICheckbox[];
  errorMessage: string;

  constructor(private _transactionsService: TransactiosService) { }

  ngOnInit() {
    let self = this;
    if (this.filterProperty) {
      this._transactionsService.getAllTransactions().subscribe(
        transactions => {
          this.properties = _.uniqBy(transactions, this.filterProperty)
                            .map(transaction => transactionToCheckbox(transaction, self.filterProperty))
                            .sort((a, b) => b.name.localeCompare(a.name))
                            .reverse()
          this.selectedPropertiesChanged(null);
        },
        error => this.errorMessage = error
      );
    }
    if (this.customProperties) {
      this.customProperties.subscribe(
        categories => {
          this.properties = categories
          this.selectedPropertiesChanged(null)
        }
      )
    } 
  }
  
  selectedPropertiesChanged(event: any) {
    let checkedProperties = this.properties.filter((prop: ICheckbox) => prop.isChecked)
                                           .map(prop => prop.name);
    this.selectedProperties.emit(checkedProperties);
  }

  toggleSelection(selection: boolean) {
    this.properties.forEach(prop => prop.isChecked = selection)
    this.selectedPropertiesChanged(null)
  }
}

function transactionToCheckbox(transaction: ITransaction, filterProperty: string): ICheckbox {
    return Common.stringToCheckbox(_.get(transaction, filterProperty))
}
