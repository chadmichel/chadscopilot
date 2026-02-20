import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ItemListComponent } from '../../../components/item-list/item-list.component';
import { ItemListConfig } from '../../../components/item-list/item-list.types';

import { AccountService } from '../../../services/account.service';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { SelectDialogComponent } from '../../../components/select-dialog/select-dialog.component';
import { SelectDialogConfig } from '../../../components/select-dialog/select-dialog.types';
import { DialogModule } from 'primeng/dialog'; // Add this
import { TenantService } from '../../../services/tenant.service';

@Component({
  selector: 'app-users-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    ItemListComponent,
    ToastModule,
    SelectDialogComponent, // Make sure this is imported correctly
    DialogModule, // Add this
  ],
  providers: [
    TenantService,
    AccountService,
    MessageService,
    ConfirmationService,
  ],
  template: `
    <pb-item-list #list [config]="listConfig"></pb-item-list>
    <app-select-dialog
      #selectDialog
      [config]="selectDialogConfig"
    ></app-select-dialog>
  `,
})
export class UsersTenantListComponent implements OnInit {
  @ViewChild('selectDialog') selectDialog!: SelectDialogComponent;
  @ViewChild('list') list!: ItemListComponent;

  userId: string = '';

  listConfig: ItemListConfig = {
    header: 'User Tenants',
    supportsAdd: false,
    supportsEdit: false,
    supportsDelete: true,
    defaultSortField: 'name',
    enableSearch: true,
    customToolbarItems: [
      {
        label: 'Link Tenant',
        icon: 'pi pi-link',
        onClick: () => this.addTenant(),
      },
    ],
    columns: [
      {
        field: 'id',
        header: 'ID',
        type: 'id',
        sortable: true,
      },
      {
        field: 'name',
        header: 'Name',
        type: 'text',
        sortable: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        userId: this.userId,
      }),
      loadItems: (params) => {
        const tenants = this.tenantService.getTenants(params);
        return tenants;
      },
      deleteItem: (params, item) =>
        this.tenantService.removeUserFromTenant(item.id, this.userId),
    },
  };

  selectDialogConfig: SelectDialogConfig<any> = {
    header: 'Select Tenants',
    columns: [
      {
        field: 'name',
        header: 'Name',
        type: 'text',
      },
    ],
    dataService: {
      loadItems: (params) => {
        return this.tenantService.getTenants({
          ...params,
          userId: this.userId,
          all: true,
          excludeMine: true,
        });
      },
      selectItems: async (items) => {
        const requests = items.map(async (item) => {
          await firstValueFrom(
            this.tenantService.addUserToTenant(item.id, this.userId)
          );
        });
        Promise.all(requests).then(() => {
          this.list.loadData({
            skip: 0,
            take: 10,
            userId: this.userId,
          });
        });
      },
    },
  };

  constructor(
    private tenantService: TenantService,
    private accountService: AccountService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.params['id'];
    console.log('userId', this.userId);
  }

  addTenant() {
    this.selectDialog.show();
  }
}
