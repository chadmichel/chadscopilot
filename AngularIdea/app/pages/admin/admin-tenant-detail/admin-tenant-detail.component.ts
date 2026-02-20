import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemDetailComponent } from '../../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../../components/item-detail/item-detail.types';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TenantService } from '../../../services/tenant.service';

@Component({
  selector: 'app-admin-tenant-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class AdminTenantDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'Tenant Details',
    isEditable: true,
    supportsAdd: false,
    supportsDelete: true,
    updateSuccessMessage: 'Tenant updated successfully',
    breadcrumbField: 'name',
    formLayout: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
    ],
    customToolbarItems: [
      {
        label: 'Users',
        icon: 'pi pi-users',
        onClick: () => this.showTenantUsers(),
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) => this.tenantService.getTenant(params.id || ''),
      createItem: (params, item) => this.tenantService.createTenant(item),
      updateItem: (params, item) =>
        this.tenantService.updateTenant(params.id || '', item),
      deleteItem: (params) => this.tenantService.deleteTenant(params.id || ''),
    },
  };

  constructor(
    private tenantService: TenantService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  showTenantUsers() {
    const tenantId = this.route.snapshot.params['id'];
    this.router.navigate(['/admin/tenants', tenantId, 'users']);
  }
}
