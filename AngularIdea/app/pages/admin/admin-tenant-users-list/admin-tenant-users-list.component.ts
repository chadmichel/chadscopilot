import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ItemListComponent } from '../../../components/item-list/item-list.component';
import { ItemListConfig } from '../../../components/item-list/item-list.types';
import { AccountService } from '../../../services/account.service';
import { SelectDialogComponent } from '../../../components/select-dialog/select-dialog.component';
import { SelectDialogConfig } from '../../../components/select-dialog/select-dialog.types';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TenantService } from '../../../services/tenant.service';

@Component({
  selector: 'app-admin-tenant-users-list',
  standalone: true,
  imports: [
    CommonModule,
    ItemListComponent,
    SelectDialogComponent,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <pb-item-list #list [config]="listConfig"></pb-item-list>
    <app-select-dialog
      #selectDialog
      [config]="selectDialogConfig"
    ></app-select-dialog>
  `,
})
export class AdminTenantUsersListComponent implements OnInit {
  @ViewChild('selectDialog') selectDialog!: SelectDialogComponent;
  @ViewChild('list') list!: ItemListComponent;

  tenantId: string = '';
  tenantName: string = '';

  listConfig: ItemListConfig = {
    header: 'Tenant Users',
    supportsAdd: false,
    supportsEdit: false,
    supportsDelete: true,
    enableSearch: true,
    customToolbarItems: [
      {
        label: 'Add Users',
        icon: 'pi pi-user-plus',
        onClick: () => this.addUsers(),
      },
    ],
    columns: [
      {
        field: 'id',
        header: 'ID',
        type: 'id',
        mobileHide: true,
      },
      {
        field: 'username',
        header: 'Username',
        type: 'text',
      },
      {
        field: 'email',
        header: 'Email',
        type: 'text',
      },
      {
        field: 'firstName',
        header: 'First Name',
        type: 'text',
        mobileHide: true,
      },
      {
        field: 'lastName',
        header: 'Last Name',
        type: 'text',
        mobileHide: true,
      },
      {
        field: 'createdAt',
        header: 'Created',
        type: 'date',
        format: 'short',
        mobileHide: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        filter: queryParams['filter'] || '',
        tenantId: this.tenantId,
      }),
      loadItems: (params) => this.accountService.getAccounts(params),
      deleteItem: (params, item) =>
        this.tenantService.removeUserFromTenant(this.tenantId, item.id),
    },
  };

  selectDialogConfig: SelectDialogConfig<any> = {
    header: 'Select Users to Add',
    columns: [
      {
        field: 'username',
        header: 'Username',
        type: 'text',
      },
      {
        field: 'email',
        header: 'Email',
        type: 'text',
      },
      {
        field: 'firstName',
        header: 'First Name',
        type: 'text',
      },
      {
        field: 'lastName',
        header: 'Last Name',
        type: 'text',
      },
    ],
    dataService: {
      loadItems: (params) => {
        return this.accountService.getAccounts({
          ...params,
          all: true,
          tenantId: this.tenantId,
          excludeMine: true,
        });
      },
      selectItems: async (items) => {
        const promises = items.map(async (user) => {
          return firstValueFrom(
            this.tenantService.addUserToTenant(this.tenantId, user.id)
          );
        });

        try {
          await Promise.all(promises);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${items.length} users added to tenant`,
          });
          this.list.loadData({
            skip: 0,
            take: 10,
            tenantId: this.tenantId,
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to add users to tenant',
          });
          console.error('Error adding users to tenant', error);
        }
      },
    },
  };

  constructor(
    private accountService: AccountService,
    private tenantService: TenantService,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.tenantId = this.route.snapshot.params['id'];
    this.loadTenantInfo();
  }

  private async loadTenantInfo() {
    try {
      const tenant = await firstValueFrom(
        this.tenantService.getTenant(this.tenantId)
      );
      this.tenantName = tenant.name;
    } catch (error) {
      console.error('Error loading tenant details:', error);
    }
  }

  addUsers() {
    this.selectDialog.show();
  }
}
