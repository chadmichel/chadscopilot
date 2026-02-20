import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { AuthService } from '../../../services/auth.service';
import { TenantService } from '../../../services/tenant.service';
import { TenantDto } from '../../../dto/tenant.dto';
import { ShortDatePipe } from '../../../pipes/short-date.pipe';
import { TenantInfo } from '../../../dto/auth.dto';

@Component({
  selector: 'app-admin-tenant',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    ShortDatePipe,
    DialogModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="tenant-container">
      <p-card header="Current Tenant" styleClass="h-full">
        <div class="header-section">
          <div class="header-content">
            <h2>Tenant Information</h2>
            <p class="subtitle">
              View your current tenant details
            </p>
          </div>
          <div class="header-actions">
            <button
              pButton
              label="Refresh"
              icon="pi pi-refresh"
              class="p-button-outlined"
              [disabled]="loading"
              (click)="loadData()"
            ></button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-container">
          <p-progressSpinner styleClass="w-4rem h-4rem"></p-progressSpinner>
          <p>Loading tenant information...</p>
        </div>

        <!-- Content -->
        <div *ngIf="!loading" class="content-section">
          <!-- Current Tenant -->
          <div class="info-card tenant-card">
            <div class="card-header">
              <i class="pi pi-building" style="font-size: 1.5rem; color: #007bff;"></i>
              <h3>Current Tenant</h3>
              <div class="card-actions" *ngIf="availableTenants.length > 1">
                <button
                  pButton
                  label="Switch Tenant"
                  icon="pi pi-arrow-right-arrow-left"
                  class="p-button-outlined p-button-sm"
                  (click)="showTenantSwitchDialog()"
                  [disabled]="loading"
                ></button>
              </div>
            </div>

            <div *ngIf="currentTenant" class="card-content">
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">{{ currentTenant.name }}</span>
              </div>
              <div class="info-row" *ngIf="currentTenant.description">
                <span class="label">Description:</span>
                <span class="value">{{ currentTenant.description }}</span>
              </div>
              <div class="info-row">
                <span class="label">ID:</span>
                <span class="value id-value">{{ tenantId }}</span>
              </div>
              <div class="info-row" *ngIf="currentTenant.createdAt">
                <span class="label">Created:</span>
                <span class="value">{{ currentTenant.createdAt | shortDate }}</span>
              </div>
            </div>

            <div *ngIf="!currentTenant" class="empty-state">
              <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: #ffc107;"></i>
              <p>No tenant information available</p>
            </div>
          </div>

          <!-- User Information -->
          <div class="info-card user-card">
            <div class="card-header">
              <i class="pi pi-user" style="font-size: 1.5rem; color: #6f42c1;"></i>
              <h3>Current User</h3>
            </div>

            <div class="card-content">
              <div class="info-row">
                <span class="label">User ID:</span>
                <span class="value id-value">{{ authService.getUserId() }}</span>
              </div>
              <div class="info-row" *ngIf="userProfile?.firstName || userProfile?.lastName">
                <span class="label">Name:</span>
                <span class="value">{{ userProfile?.firstName }} {{ userProfile?.lastName }}</span>
              </div>
              <div class="info-row" *ngIf="userProfile?.email">
                <span class="label">Email:</span>
                <span class="value">{{ userProfile?.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Role:</span>
                <span class="value role-badge" [class.admin]="authService.isAdmin()">
                  {{ authService.isAdmin() ? 'Admin' : 'User' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div *ngIf="!loading" class="actions-section">
          <div class="action-buttons">
            <button
              pButton
              label="Back to Admin"
              icon="pi pi-arrow-left"
              class="p-button-outlined"
              (click)="goToAdmin()"
            ></button>
            <button
              pButton
              label="Manage All Tenants"
              icon="pi pi-building"
              class="p-button-outlined"
              (click)="viewAllTenants()"
              *ngIf="authService.isAdmin()"
            ></button>
          </div>
        </div>
      </p-card>
    </div>

    <!-- Tenant Switch Dialog -->
    <p-dialog
      header="Switch Tenant"
      [(visible)]="showSwitchDialog"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '500px' }"
    >
      <div class="tenant-switch-content">
        <p class="dialog-description">Select a tenant to switch to.</p>

        <div class="tenant-list">
          <div
            *ngFor="let tenant of availableTenants"
            class="tenant-option"
            [class.selected]="selectedTenant?.id === tenant.id"
            (click)="selectTenant(tenant)"
          >
            <div class="tenant-info">
              <h4>{{ tenant.name }}</h4>
              <small class="tenant-id">ID: {{ tenant.id }}</small>
            </div>
            <div class="tenant-actions">
              <i class="pi pi-check" *ngIf="selectedTenant?.id === tenant.id" style="color: #28a745;"></i>
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="dialog-footer">
          <button pButton label="Cancel" class="p-button-text" (click)="cancelTenantSwitch()"></button>
          <button pButton label="Switch" [disabled]="!selectedTenant" (click)="confirmTenantSwitch()"></button>
        </div>
      </ng-template>
    </p-dialog>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .tenant-container { padding: 1rem; max-width: 1200px; margin: 0 auto; }
    .header-section { display: flex; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #e9ecef; }
    .header-content h2 { margin: 0 0 0.5rem 0; color: #495057; }
    .subtitle { margin: 0; color: #6c757d; }
    .loading-container { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: 1rem; }
    .content-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .info-card { background: #fff; border: 1px solid #dee2e6; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .tenant-card { border-left: 4px solid #007bff; }
    .user-card { border-left: 4px solid #6f42c1; }
    .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
    .card-header h3 { margin: 0; flex: 1; }
    .card-content { display: flex; flex-direction: column; gap: 1rem; }
    .info-row { display: flex; justify-content: space-between; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; }
    .label { font-weight: 600; color: #495057; }
    .value { color: #212529; }
    .id-value { font-family: monospace; font-size: 0.75rem; color: #6c757d; background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .role-badge { background: #e9ecef; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; }
    .role-badge.admin { background: #d4edda; color: #155724; }
    .empty-state { text-align: center; padding: 2rem; color: #6c757d; }
    .actions-section { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e9ecef; }
    .action-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .tenant-switch-content { padding: 1rem 0; }
    .dialog-description { margin: 0 0 1.5rem 0; color: #6c757d; }
    .tenant-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto; }
    .tenant-option { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer; }
    .tenant-option:hover { border-color: #007bff; }
    .tenant-option.selected { border-color: #007bff; background: #e3f2fd; }
    .tenant-info h4 { margin: 0 0 0.5rem 0; }
    .tenant-id { color: #6c757d; font-family: monospace; }
    .dialog-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
  `],
})
export class AdminTenantComponent implements OnInit {
  tenantId: string = '';
  currentTenant: TenantDto | null = null;
  userProfile: any = null;
  loading: boolean = false;

  // Tenant switching
  showSwitchDialog: boolean = false;
  availableTenants: TenantInfo[] = [];
  selectedTenant: TenantInfo | null = null;

  constructor(
    public authService: AuthService,
    private tenantService: TenantService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    const currentTenantInfo = this.authService.getCurrentTenant();
    this.userProfile = this.authService.getCurrentProfile();
    this.availableTenants = this.authService.getUserTenants() || [];

    if (currentTenantInfo) {
      this.tenantId = currentTenantInfo.id;
      this.tenantService.getTenant(currentTenantInfo.id).subscribe({
        next: (tenant) => {
          this.currentTenant = tenant;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading tenant details:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load tenant details',
          });
          this.loading = false;
        },
      });
    } else {
      this.loading = false;
    }
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  viewAllTenants(): void {
    this.router.navigate(['/admin/tenants']);
  }

  showTenantSwitchDialog(): void {
    this.showSwitchDialog = true;
    this.selectedTenant = null;
  }

  selectTenant(tenant: TenantInfo): void {
    this.selectedTenant = tenant;
  }

  cancelTenantSwitch(): void {
    this.showSwitchDialog = false;
    this.selectedTenant = null;
  }

  confirmTenantSwitch(): void {
    if (!this.selectedTenant) return;

    this.authService.selectTenant(this.selectedTenant);
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Switched to tenant "${this.selectedTenant.name}"`,
    });

    this.showSwitchDialog = false;
    this.selectedTenant = null;
    this.loadData();
  }
}

