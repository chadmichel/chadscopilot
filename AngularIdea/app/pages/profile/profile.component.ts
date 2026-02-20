import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ItemDetailComponent } from '../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../components/item-detail/item-detail.types';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ToastModule, ItemDetailComponent],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class ProfileComponent {
  detailConfig: ItemDetailConfig = {
    header: 'Profile',
    isEditable: false,
    supportsAdd: false,
    supportsDelete: false,
    updateSuccessMessage: 'User updated successfully',
    breadcrumbField: 'username',
    formLayout: [
      {
        key: 'username',
        label: 'Username',
        type: 'text',
        required: true,
        newOnly: true,
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        newOnly: true,
      },
      { key: 'email', label: 'Email', type: 'text', required: true },
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
      },
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },

      // New fields
      {
        key: 'title',
        label: 'Job Title',
        type: 'text',
      },
    ],
    customToolbarItems: [
      {
        label: 'Profile Photo',
        icon: 'pi pi-image',
        onClick: () => this.viewProfilePhoto(),
      },
      {
        label: 'Tenant',
        icon: 'pi pi-building',
        onClick: () => this.viewTenant(),
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) =>
        this.accountService.getAccount(this.authService.getUserId()),
      createItem: (params, item) => this.accountService.createAccount(item),
      updateItem: (params, item) =>
        this.accountService.updateAccount(this.authService.getUserId(), item),
      deleteItem: (params) =>
        this.accountService.deleteAccount(this.authService.getUserId()),
    },
  };

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    if (this.authService.isAdmin()) {
      this.detailConfig.customToolbarItems?.push({
        label: 'User',
        icon: 'pi pi-user',
        onClick: () =>
          this.router.navigate(['users', this.authService.getUserId()]),
      });
    }
  }

  resetPassword() {
    const userId = this.authService.getUserId();
    if (!userId || userId === 'new') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot reset password for a new user',
      });
      return;
    }

    // Here you'd typically call a password reset API
    this.messageService.add({
      severity: 'info',
      summary: 'Password Reset',
      detail: 'Password reset functionality would be implemented here',
    });
  }

  showTenants() {
    const userId = this.authService.getUserId();
    if (!userId || userId === 'new') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Save the user first to manage tenants',
      });
      return;
    }

    this.router.navigate(['tenants'], { relativeTo: this.route });
  }

  viewDashboard() {
    const userId = this.authService.getUserId();
    if (!userId || userId === 'new') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Save the user first to view dashboard',
      });
      return;
    }

    this.router.navigate(['/home', userId]);
  }

  viewTime() {
    this.router.navigate(['time'], { relativeTo: this.route });
  }

  viewProfilePhoto() {
    this.router.navigate(['photo', this.authService.getUserId()], {
      relativeTo: this.route,
    });
  }

  viewTenant() {
    this.router.navigate(['/admin/tenant']);
  }
}
