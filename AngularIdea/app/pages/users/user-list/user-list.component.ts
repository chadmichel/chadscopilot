import { Component } from '@angular/core';
import { ItemListComponent } from '../../../components/item-list/item-list.component';
import { AccountService } from '../../../services/account.service';
import { AuthService } from '../../../services/auth.service';
import { ItemListConfig } from '../../../components/item-list/item-list.types';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class UserListComponent {
  listConfig: ItemListConfig = {
    header: 'Users (Volunteers, Tutors, Coordinators)',
    supportsAdd: true,
    supportsEdit: true,
    supportsDelete: true,
    enableSearch: true,
    defaultSortField: 'username',
    columns: [
      {
        field: 'displayName',
        header: 'Name',
        type: 'text',
        sortable: true,
      },
      {
        field: 'isTutor',
        header: 'Tutor',
        type: 'boolean',
        sortable: true,
      },
      {
        field: 'isCoordinator',
        header: 'Coordinator',
        type: 'boolean',
        sortable: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        where: { tenantId: this.authService.getCurrentTenant()?.id },
      }),
      loadItems: (params) => this.accountService.getAccounts(params),
      deleteItem: (params, item) => this.accountService.deleteAccount(item.id),
    },
  };

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private router: Router
  ) {}

  viewDashboard(user: any) {
    if (user && user.id) {
      this.router.navigate(['/home', user.id]);
    }
  }
}
