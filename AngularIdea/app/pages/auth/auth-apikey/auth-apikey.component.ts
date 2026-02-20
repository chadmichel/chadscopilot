import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { TenantInfo } from '../../../dto/auth.dto';

@Component({
  selector: 'app-auth-apikey',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div
      class="surface-ground h-screen flex align-items-center justify-content-center"
    >
      <!-- API Key Auth Form (hidden when tenant selection is shown) -->
      <div
        *ngIf="!showTenantSelection"
        class="surface-card p-4 shadow-2 border-round w-full lg:w-4"
      >
        <div class="text-center mb-5">
          <i class="pi pi-key text-4xl text-primary mb-3"></i>
          <h2>Sign In with API Key</h2>
          <p class="text-600">Enter your API key to authenticate</p>
        </div>

        <div class="mb-4">
          <label for="apiKey" class="block text-900 font-medium mb-2"
            >API Key</label
          >
          <input
            id="apiKey"
            type="password"
            pInputText
            [(ngModel)]="apiKey"
            class="w-full"
            placeholder="Enter your API key"
            (keyup.enter)="signInWithApiKey()"
          />
        </div>

        <p-button
          label="Sign In"
          icon="pi pi-sign-in"
          (onClick)="signInWithApiKey()"
          [loading]="loading"
          [disabled]="!apiKey"
          styleClass="w-full"
        ></p-button>

        <div class="text-center mt-4">
          <a href="/auth" class="text-primary cursor-pointer hover:underline">
            Back to Sign In
          </a>
        </div>
      </div>

      <!-- Tenant Selection -->
      <div
        *ngIf="showTenantSelection"
        class="surface-card p-4 shadow-2 border-round w-full lg:w-4"
      >
        <div class="text-center mb-5">
          <h2>Select Tenant</h2>
          <p class="text-600">Choose which tenant you want to access</p>
        </div>

        <div class="flex flex-column gap-3">
          <div
            *ngFor="let tenant of availableTenants"
            class="p-3 border-round cursor-pointer transition-colors transition-duration-150"
            [class.bg-primary-50]="selectedTenant?.id === tenant.id"
            [class.border-primary]="selectedTenant?.id === tenant.id"
            [class.border-1]="selectedTenant?.id === tenant.id"
            (click)="selectedTenant = tenant"
          >
            <div class="flex align-items-center justify-content-between">
              <div>
                <div class="font-medium text-900">{{ tenant.name }}</div>
              </div>
              <i
                *ngIf="selectedTenant?.id === tenant.id"
                class="pi pi-check text-primary"
              ></i>
            </div>
          </div>
        </div>

        <div class="flex justify-content-center gap-2 mt-4">
          <p-button
            label="Cancel"
            (onClick)="onTenantSelectionCancelled()"
            severity="secondary"
          ></p-button>
          <p-button
            label="Continue"
            (onClick)="onTenantSelected()"
            [disabled]="!selectedTenant"
          ></p-button>
        </div>
      </div>
    </div>

    <p-toast></p-toast>
  `,
})
export class AuthApiKeyComponent {
  apiKey: string = '';
  loading: boolean = false;

  // Tenant selection state
  showTenantSelection = false;
  availableTenants: TenantInfo[] = [];
  selectedTenant: TenantInfo | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  signInWithApiKey() {
    if (!this.apiKey) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter an API key',
      });
      return;
    }

    this.loading = true;
    this.authService.signinWithApiKey(this.apiKey).subscribe({
      next: (response) => {
        this.handleAuthResponse(response);
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Invalid API key',
        });
        this.loading = false;
      },
    });
  }

  /**
   * Handle authentication response and check for tenant selection
   */
  private handleAuthResponse(response: any) {
    // Check if user has multiple tenants available
    if (response.user?.tenants && response.user.tenants.length > 1) {
      this.availableTenants = response.user.tenants;
      this.showTenantSelection = true;
      this.messageService.add({
        severity: 'info',
        summary: 'Select Tenant',
        detail: 'Please select a tenant to continue',
      });
    } else if (response.user?.tenants && response.user.tenants.length === 1) {
      // Auto-select the single tenant
      const singleTenant = response.user.tenants[0];
      this.authService.selectTenant(singleTenant);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Logged in to ${singleTenant.name}`,
      });
      this.router.navigate(['/home']);
    } else {
      // No tenant selection needed, proceed to home
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Login successful',
      });
      this.router.navigate(['/home']);
    }
  }

  /**
   * Handle tenant selection
   */
  onTenantSelected() {
    if (this.selectedTenant) {
      this.authService.selectTenant(this.selectedTenant);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Logged in to ${this.selectedTenant.name}`,
      });
      this.router.navigate(['/home']);
    }
  }

  /**
   * Cancel tenant selection and logout
   */
  onTenantSelectionCancelled() {
    this.authService.logout();
    this.showTenantSelection = false;
    this.availableTenants = [];
    this.selectedTenant = null;
  }
}
