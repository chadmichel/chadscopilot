import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { TenantInfo } from '../../dto/auth.dto';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    SelectModule,
  ],
  providers: [MessageService],
  template: `
    <div
      class="surface-ground h-screen flex align-items-center justify-content-center"
    >
      <!-- Auth Form (hidden when tenant selection is shown) -->
      <div
        *ngIf="!showTenantSelection"
        class="surface-card p-4 shadow-2 border-round w-full lg:w-4"
      >
        <div class="text-center mb-5">
          <h2>{{ isSignup ? 'Create Account' : 'Sign In' }}</h2>
        </div>

        <div>
          <!-- Signup Button -->
          <div *ngIf="allowSelfSignup" class="signup-section-top">
            <p-button
              label="Create an Account"
              icon="pi pi-user-plus"
              (onClick)="goToSignup()"
              styleClass="w-full mb-3"
            ></p-button>
            <div class="divider">
              <span>or sign in</span>
            </div>
          </div>

          <!-- Passcode Login Form -->
          <div *ngIf="hasPasscodeIntegration" class="mb-4">
            <label for="passcode" class="block text-900 font-medium mb-2">Passcode</label>
            <input
              id="passcode"
              type="password"
              pInputText
              [(ngModel)]="passcode"
              placeholder="Enter your passcode"
              class="w-full mb-3"
              (keyup.enter)="signinWithPasscode()"
            />
            <p-button
              label="Sign In with Passcode"
              icon="pi pi-lock"
              (onClick)="signinWithPasscode()"
              [loading]="loading"
              [disabled]="!passcode"
              styleClass="w-full"
            ></p-button>
            <div *ngIf="hasMicrosoftIntegration || hasGoogleIntegration" class="divider">
              <span>or</span>
            </div>
          </div>

          <!-- OAuth Login Buttons -->
          <p-button
            *ngIf="hasMicrosoftIntegration"
            label="Sign In with Microsoft"
            icon="pi pi-microsoft"
            (onClick)="loginWithMicrosoft()"
            [loading]="loading"
            styleClass="w-full mb-3"
          ></p-button>

          <p-button
            *ngIf="hasGoogleIntegration"
            label="Sign In with Google"
            icon="pi pi-google"
            (onClick)="loginWithGoogle()"
            [loading]="loading"
            styleClass="w-full mb-3"
          ></p-button>
        </div>
      </div>
    </div>

    <!-- Features Link -->
    <div class="text-center mt-4">
      <p class="text-600 mb-3">Want to learn more about our features?</p>
      <p-button
        label="View Features"
        icon="pi pi-star"
        (onClick)="goToFeatures()"
        severity="secondary"
        styleClass="p-button-outlined"
      ></p-button>
    </div>

    <!-- Tenant Selection -->
    <div
      *ngIf="showTenantSelection"
      class="surface-card p-4 shadow-2 border-round w-full lg:w-4"
      style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;"
    >
      <div class="text-center mb-5">
        <h2>Select Tenant</h2>
        <p class="text-600">Choose which tenant you want to access</p>
      </div>

      <!-- Tenant Information -->
      <div class="mb-4 p-3 border-round bg-blue-50 border-1 border-blue-200">
        <div class="flex align-items-start gap-3">
          <i class="pi pi-info-circle text-blue-600 mt-1"></i>
          <div>
            <h4 class="text-blue-900 mb-2">What is a Tenant?</h4>
            <p class="text-blue-800 mb-2">
              A tenant is a separate organization or department. Each tenant 
              has its own data, users, and settings, allowing you to manage 
              different groups independently.
            </p>
            <p class="text-blue-800 text-sm">
              <strong>Note:</strong> You can switch between tenants later by
              going to the Tenant page in the main navigation menu. Click on
              your profile picture in the top right corner and select "Tenant".
            </p>
          </div>
        </div>
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
  `,
  styles: [`
    .signup-section-top {
      margin-bottom: 0.5rem;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 1rem 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e5e7eb;
    }

    .divider span {
      padding: 0 1rem;
      color: #9ca3af;
      font-size: 0.875rem;
    }
  `],
})
export class AuthComponent implements OnInit {
  isSignup = false;
  loading = false;
  hasMicrosoftIntegration = false;
  hasGoogleIntegration = false;
  hasPasscodeIntegration = false;
  allowSelfSignup = false;

  // Passcode auth
  passcode = '';

  // Tenant selection state
  showTenantSelection = false;
  availableTenants: TenantInfo[] = [];
  selectedTenant: TenantInfo | null = null;

  credentials: {
    username?: string;
    password?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadAuthSetup();
  }

  private loadAuthSetup() {
    this.authService.loadAuthSetup().subscribe({
      next: (setup) => {
        const authMethods = setup.data.authMethods || [];
        
        // Check authMethods array first, fall back to legacy integration objects
        this.hasPasscodeIntegration = authMethods.includes('passcode') || !!setup.data.passcodeIntegration;
        this.hasMicrosoftIntegration = authMethods.includes('microsoft') || !!setup.data.microsoftIntegration;
        this.hasGoogleIntegration = authMethods.includes('google') || !!setup.data.googleIntegration;
        this.allowSelfSignup = setup.data.tenant?.allowSelfSignup || setup.data.allowSelfSignup || false;
      },
      error: (error) => {
        console.warn('Failed to load auth setup:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load authentication configuration',
        });
      },
    });
  }

  signin() {
    if (!this.credentials.username || !this.credentials.password) return;

    this.loading = true;
    this.authService
      .signin(this.credentials.username, this.credentials.password)
      .subscribe({
        next: (response) => {
          this.handleAuthResponse(response);
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
          });
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  async loginWithMicrosoft() {
    await this.authService.redirectToMicrosoftLogin();
  }

  async loginWithGoogle() {
    await this.authService.redirectToGoogleLogin();
  }

  signinWithPasscode() {
    if (!this.passcode) return;

    this.loading = true;
    this.authService.signinWithPasscode(this.passcode).subscribe({
      next: (response) => {
        this.handleAuthResponse(response);
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Invalid passcode',
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

  /**
   * Navigate to features page
   */
  goToFeatures() {
    this.router.navigate(['/features']);
  }

  /**
   * Navigate to signup page
   */
  goToSignup() {
    this.router.navigate(['/signup']);
  }
}
