import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1 class="page-title">Admin</h1>
        <p class="page-subtitle">System configuration and management settings.</p>
      </div>

      <div class="admin-grid">
        <!-- System Section -->
        <div class="admin-section">
          <h2 class="section-title">System</h2>
          <div class="cards-row">
            <div class="admin-card" (click)="router.navigate(['/admin/tenant'])">
              <div class="card-icon current-tenant">
                <i class="pi pi-building"></i>
              </div>
              <div class="card-content">
                <h3>Current Tenant</h3>
                <p>View and switch your active tenant</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/admin/tenants'])" *ngIf="isAdmin">
              <div class="card-icon tenants">
                <i class="pi pi-th-large"></i>
              </div>
              <div class="card-content">
                <h3>All Tenants</h3>
                <p>Manage all tenants across the system</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/admin/users'])" *ngIf="isAdmin">
              <div class="card-icon users">
                <i class="pi pi-users"></i>
              </div>
              <div class="card-content">
                <h3>Users</h3>
                <p>Manage all users across the system</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>
          </div>
        </div>

        <!-- Configuration Section -->
        <div class="admin-section">
          <h2 class="section-title">Configuration</h2>
          <div class="cards-row">
            <div class="admin-card" (click)="router.navigate(['/admin/vehicles'])">
              <div class="card-icon vehicles">
                <i class="pi pi-truck"></i>
              </div>
              <div class="card-content">
                <h3>Vehicles</h3>
                <p>Manage transportation vehicles</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/admin/drivers'])">
              <div class="card-icon drivers">
                <i class="pi pi-user"></i>
              </div>
              <div class="card-content">
                <h3>Drivers</h3>
                <p>Manage transportation drivers</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/admin/exam-types'])">
              <div class="card-icon exams">
                <i class="pi pi-file-edit"></i>
              </div>
              <div class="card-content">
                <h3>Exam Types</h3>
                <p>Configure assessment and exam types</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/admin/locations'])">
              <div class="card-icon locations">
                <i class="pi pi-map-marker"></i>
              </div>
              <div class="card-content">
                <h3>Locations</h3>
                <p>Manage centers, libraries, and sites</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/users'])">
              <div class="card-icon volunteers">
                <i class="pi pi-users"></i>
              </div>
              <div class="card-content">
                <h3>Users & Tutors</h3>
                <p>Manage user profiles, tutors, and coordinators</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>

            <div class="admin-card" (click)="router.navigate(['/admin/goals'])">
              <div class="card-icon goals">
                <i class="pi pi-flag"></i>
              </div>
              <div class="card-content">
                <h3>Goals</h3>
                <p>Configure student goals and progression levels</p>
              </div>
              <i class="pi pi-chevron-right card-arrow"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-page {
        padding: 1.5rem 2rem;
        background: #f8fafc;
        min-height: calc(100vh - 100px);
      }

      .admin-grid {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .admin-section {
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 1.5rem;
      }

      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 1rem 0;
      }

      .cards-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }

      .admin-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: #fafafa;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .admin-card:hover {
        background: #f1f5f9;
        border-color: #0d9488;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .card-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        background: #e0f2f1;
        color: #0d9488;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-icon i {
        font-size: 1.25rem;
      }

      .card-icon.vehicles {
        background: #fff7ed;
        color: #ea580c;
      }

      .card-icon.drivers {
        background: #f0fdf4;
        color: #16a34a;
      }

      .card-icon.exams {
        background: #ede9fe;
        color: #7c3aed;
      }

      .card-icon.locations {
        background: #dbeafe;
        color: #2563eb;
      }

      .card-icon.volunteers {
        background: #fce7f3;
        color: #db2777;
      }

      .card-icon.current-tenant {
        background: #e0f2f1;
        color: #0d9488;
      }

      .card-icon.tenants {
        background: #f0fdf4;
        color: #16a34a;
      }

      .card-icon.users {
        background: #fef3c7;
        color: #d97706;
      }

      .card-icon.goals {
        background: #fef2f2;
        color: #dc2626;
      }

      .card-content {
        flex: 1;
      }

      .card-content h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #1e293b;
      }

      .card-content p {
        margin: 0;
        font-size: 0.85rem;
        color: #64748b;
      }

      .card-arrow {
        color: #cbd5e1;
        transition: color 0.2s, transform 0.2s;
      }

      .admin-card:hover .card-arrow {
        color: #0d9488;
        transform: translateX(4px);
      }

      @media (max-width: 768px) {
        .admin-page {
          padding: 1rem;
        }

        .cards-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminComponent implements OnInit {
  isAdmin: boolean = false;

  constructor(
    public router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
  }
}
