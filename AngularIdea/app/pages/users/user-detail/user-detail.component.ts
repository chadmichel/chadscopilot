import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemDetailComponent } from '../../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../../components/item-detail/item-detail.types';
import { AccountService } from '../../../services/account.service';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { map } from 'rxjs';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class UserDetailComponent implements OnInit {
  detailConfig: ItemDetailConfig = {
    header: 'User Details',
    isEditable: true,
    supportsAdd: false,
    supportsDelete: false,
    updateSuccessMessage: 'User updated successfully',
    formLayout: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },
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
      {
        key: 'managerId',
        label: 'Manager',
        type: 'select',
        required: false,
        options: [],
        loadOptions: () => {
          return this.accountService.getAccountsForLookup();
        },
      },
      {
        key: 'bio',
        label: 'Bio',
        type: 'textarea',
        required: false,
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'text',
        required: false,
      },
      {
        key: 'isTutor',
        label: 'Is Tutor',
        type: 'checkbox',
        required: false,
      },
      {
        key: 'isCoordinator',
        label: 'Is Coordinator',
        type: 'checkbox',
        required: false,
      },
      {
        key: 'volunteerStatus',
        label: 'Volunteer Status',
        type: 'select',
        required: false,
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
          { label: 'On Leave', value: 'On Leave' },
          { label: 'Pending', value: 'Pending' },
        ],
      },
      {
        key: 'availability',
        label: 'Availability (Days)',
        type: 'multiselect',
        required: false,
        options: [
          { label: 'Monday', value: 'Monday' },
          { label: 'Tuesday', value: 'Tuesday' },
          { label: 'Wednesday', value: 'Wednesday' },
          { label: 'Thursday', value: 'Thursday' },
          { label: 'Friday', value: 'Friday' },
          { label: 'Saturday', value: 'Saturday' },
          { label: 'Sunday', value: 'Sunday' },
        ],
      },
      {
        key: 'timeOfDay',
        label: 'Time of Day',
        type: 'multiselect',
        required: false,
        options: [
          { label: 'Morning', value: 'MOR' },
          { label: 'Afternoon', value: 'AFT' },
          { label: 'Evening', value: 'EVE' },
        ],
      },
      {
        key: 'volunteerStartDate',
        label: 'Volunteer Start Date',
        type: 'date',
        required: false,
      },
      {
        key: 'volunteerNotes',
        label: 'Volunteer Notes',
        type: 'textarea',
        required: false,
      },
    ],
    customToolbarItems: [],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        where: { tenantId: this.authService.getCurrentTenant()?.id },
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) => this.accountService.getAccount(params.id || ''),
      createItem: (params, item) => this.accountService.createAccount(item),
      updateItem: (params, item) =>
        this.accountService.updateAccount(params.id || '', item),
      deleteItem: (params) =>
        this.accountService.deleteAccount(params.id || ''),
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
    // Any initialization code needed

    if (this.authService.isAdmin()) {
      this.detailConfig.formLayout.push({
        key: 'isOwner',
        label: 'Is Owner',
        type: 'checkbox',
        required: false,
      });
      this.detailConfig.formLayout.push({
        key: 'isRootNode',
        label: 'Is Root Node',
        type: 'checkbox',
        required: false,
      });
    }

    // Add View Member button - visibility will be handled in the onClick method
    if (!this.detailConfig.customToolbarItems) {
      this.detailConfig.customToolbarItems = [];
    }
  }

  resetPassword() {
    const userId = this.route.snapshot.params['id'];
    if (!userId || userId === 'new') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot reset password for a new user',
      });
      return;
    }

    this.accountService.resetPassword(userId).subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password reset email has been sent',
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to reset password',
        });
      },
    });
  }

  showTenants() {
    // Navigate to related view
    this.router.navigate(['tenants'], { relativeTo: this.route });
  }

  viewDashboard() {
    const userId = this.route.snapshot.params['id'];
    if (userId && userId !== 'new') {
      this.router.navigate(['/userdashboard', userId]);
    }
  }

  viewUserTeams() {
    const userId = this.route.snapshot.params['id'];
    if (userId && userId !== 'new') {
      this.router.navigate(['teams'], { relativeTo: this.route });
    }
  }

  viewMember() {
    // This method will be called by the item-detail component with the current item data
    // We need to get the contactId from the current item and navigate to the contact detail
    const userId = this.route.snapshot.params['id'];
    if (userId && userId !== 'new') {
      // Load the current user to get the contactId
      this.accountService.getAccount(userId).subscribe({
        next: (user) => {
          if (user && user.contactId) {
            this.router.navigate(['/contacts', user.contactId]);
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'No Member Record',
              detail: 'This user does not have an associated member record.',
            });
          }
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load user data',
          });
        },
      });
    }
  }
}
