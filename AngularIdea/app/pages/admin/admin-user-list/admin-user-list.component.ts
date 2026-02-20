import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemListComponent } from '../../../components/item-list/item-list.component';
import { ItemListConfig } from '../../../components/item-list/item-list.types';
import { AccountService } from '../../../services/account.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-user-list',
  standalone: true,
  imports: [CommonModule, ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class AdminUserListComponent {
  listConfig: ItemListConfig = {
    header: 'All Users',
    supportsAdd: true,
    supportsEdit: true,
    supportsDelete: false,
    enableSearch: true,
    defaultSortField: 'username',
    columns: [
      {
        field: 'id',
        header: 'ID',
        type: 'id',
        sortable: true,
        mobileHide: true,
      },
      {
        field: 'email',
        header: 'Email',
        type: 'text',
        sortable: true,
      },
      {
        field: 'firstName',
        header: 'First Name',
        type: 'text',
        sortable: true,
        mobileHide: true,
      },
      {
        field: 'lastName',
        header: 'Last Name',
        type: 'text',
        sortable: true,
        mobileHide: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        all: true,
      }),
      loadItems: (params) => this.accountService.getAccounts(params),
      deleteItem: (params, item) => this.accountService.deleteAccount(item.id),
    },
    onEdit: (item) => {
      this.router.navigate(['users', item.id]);
    },
  };

  constructor(private accountService: AccountService, private router: Router) {}
}
