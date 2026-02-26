import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { StepsModule } from 'primeng/steps';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, MenuItem } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';

interface SignupCredentials {
  password: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tenantName?: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    StepsModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="signup-container">
      <div class="step-content">
        <div class="form-card">
          <div class="text-center mb-4">
            <h2>Create Account</h2>
            <p class="text-600">Fill in your details to create an account</p>
          </div>

          <div class="field mb-3">
            <label for="email" class="block text-900 font-medium mb-2">Email *</label>
            <input
              id="email"
              type="email"
              pInputText
              [(ngModel)]="credentials.email"
              class="w-full"
              [class.ng-invalid]="submitted && !credentials.email"
              placeholder="Enter your email"
            />
          </div>

          <div class="field mb-3">
            <label for="firstName" class="block text-900 font-medium mb-2">First Name *</label>
            <input
              id="firstName"
              type="text"
              pInputText
              [(ngModel)]="credentials.firstName"
              class="w-full"
              [class.ng-invalid]="submitted && !credentials.firstName"
              placeholder="Enter your first name"
            />
          </div>

          <div class="field mb-3">
            <label for="lastName" class="block text-900 font-medium mb-2">Last Name *</label>
            <input
              id="lastName"
              type="text"
              pInputText
              [(ngModel)]="credentials.lastName"
              class="w-full"
              [class.ng-invalid]="submitted && !credentials.lastName"
              placeholder="Enter your last name"
            />
          </div>

          <div class="field mb-3">
            <label for="phone" class="block text-900 font-medium mb-2">Phone</label>
            <input
              id="phone"
              type="tel"
              pInputText
              [(ngModel)]="credentials.phone"
              class="w-full"
              placeholder="Enter your phone number (optional)"
            />
          </div>

          <div class="field mb-3">
            <label for="password" class="block text-900 font-medium mb-2">Password *</label>
            <p-password
              id="password"
              [(ngModel)]="credentials.password"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              [class.ng-invalid]="submitted && !credentials.password"
              placeholder="Enter your password"
            ></p-password>
          </div>

          <div class="field mb-4">
            <label for="confirmPassword" class="block text-900 font-medium mb-2">Confirm Password *</label>
            <p-password
              id="confirmPassword"
              [(ngModel)]="credentials.confirmPassword"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              [feedback]="false"
              [class.ng-invalid]="submitted && !credentials.confirmPassword"
              placeholder="Confirm your password"
            ></p-password>
          </div>

          <div class="field mb-4">
            <label for="tenantName" class="block text-900 font-medium mb-2">Organization Name</label>
            <input
              id="tenantName"
              type="text"
              pInputText
              [(ngModel)]="credentials.tenantName"
              class="w-full"
              placeholder="Enter your organization name (optional)"
            />
          </div>

          <div class="flex justify-content-between gap-2">
            <p-button
              label="Back to Sign In"
              icon="pi pi-arrow-left"
              (onClick)="goToSignIn()"
              severity="secondary"
            ></p-button>
            <p-button
              label="Create Account"
              icon="pi pi-check"
              (onClick)="signup()"
              [loading]="loading"
            ></p-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signup-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--surface-ground);
    }

    .step-content {
      width: 100%;
      max-width: 500px;
    }

    .form-card {
      background: var(--surface-card);
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .field label {
      color: var(--text-color);
    }
  `],
})
export class SignupComponent implements OnInit {
  loading = false;
  submitted = false;
  
  credentials: SignupCredentials = {
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    tenantName: '',
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Check if user is already authenticated
    this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.router.navigate(['/home']);
      }
    });
  }

  validateForm(): boolean {
    this.submitted = true;

    if (!this.credentials.email || !this.credentials.firstName || 
        !this.credentials.lastName || !this.credentials.password || 
        !this.credentials.confirmPassword) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields',
      });
      return false;
    }

    if (this.credentials.password !== this.credentials.confirmPassword) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Passwords do not match',
      });
      return false;
    }

    if (this.credentials.password.length < 8) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Password must be at least 8 characters',
      });
      return false;
    }

    return true;
  }

  signup() {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;

    this.authService
      .signup({
        username: this.credentials.email,
        password: this.credentials.password,
        email: this.credentials.email,
        firstName: this.credentials.firstName,
        lastName: this.credentials.lastName,
        phone: this.credentials.phone,
        tenantName: this.credentials.tenantName || this.credentials.firstName + "'s Organization",
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Account created successfully. Please sign in.',
          });
          this.loading = false;
          this.router.navigate(['/auth']);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to create account',
          });
          this.loading = false;
        },
      });
  }

  goToSignIn() {
    this.router.navigate(['/auth']);
  }
}
