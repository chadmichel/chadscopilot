import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TenantInfo } from '../../../dto/auth.dto';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-auth-microsoft',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, MessageModule, ButtonModule],
  providers: [MessageService],
  template: `
    <div class="flex align-items-center justify-content-center min-h-screen">
      <!-- Processing Microsoft Login -->
      <div
        *ngIf="!showTenantSelection"
        class="surface-card p-4 shadow-2 border-round w-full lg:w-6 text-center"
      >
        <h2>Processing Microsoft Login...</h2>
        <div *ngIf="loading" class="flex justify-content-center my-5">
          <p-progressSpinner></p-progressSpinner>
        </div>
        <p-message
          *ngIf="error"
          severity="error"
          text="There was an error with your login. Please try again."
        ></p-message>
        <button *ngIf="!loading && error" pButton (click)="goToAuth()">
          Try Again
        </button>
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
                <div class="text-sm text-600">Tenant ID: {{ tenant.id }}</div>
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
  `,
  styles: [
    `
      .microsoft-auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
    `,
  ],
})
export class AuthMicrosoftComponent implements OnInit {
  loading: boolean = true;
  error: boolean = false;
  private isProcessing = false; // Add flag to prevent duplicate processing

  // Tenant selection state
  showTenantSelection = false;
  availableTenants: TenantInfo[] = [];
  selectedTenant: TenantInfo | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) {
      this.error = true;
      this.loading = false;
      this.isProcessing = false;
      return;
    }

    const state = this.route.snapshot.queryParamMap.get('session_state') || '';

    // Load auth setup first, then process login
    this.authService.loadAuthSetup().subscribe({
      next: () => {
        this.authService.loginWithMicrosoftCode(code, state).subscribe({
          next: (response) => {
            this.loading = false;
            this.isProcessing = false;
            this.handleAuthResponse(response);
          },
          error: (error) => {
            console.error('Error logging in with MS:', error);
            this.loading = false;
            this.error = true;
            this.isProcessing = false;
          },
        });
      },
      error: (error) => {
        console.error('Error loading auth setup:', error);
        this.loading = false;
        this.error = true;
        this.isProcessing = false;
      },
    });
  }

  goToAuth() {
    this.router.navigate(['/auth']);
  }

  /**
   * Handle authentication response and check for tenant selection
   */
  private handleAuthResponse(response: any) {
    // Check if user has multiple tenants available
    if (response.user.tenants && response.user.tenants.length > 1) {
      this.availableTenants = response.user.tenants;
      this.showTenantSelection = true;
      this.messageService.add({
        severity: 'info',
        summary: 'Select Tenant',
        detail: 'Please select a tenant to continue',
      });
    } else {
      // Single tenant or no tenant selection needed, proceed to home
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
      // Set the selected tenant in the auth service
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
    this.router.navigate(['/auth']);
  }
}
