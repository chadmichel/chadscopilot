import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, PageToolbarComponent],
  template: `
    <div class="admin-page">
      <pb-page-toolbar header="Admin"></pb-page-toolbar>
      <p class="page-subtitle mb-4">System management settings.</p>

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
      </div>
    </div>
  `,
  styles: [
    `
      .admin-page {
        /* Align with the rest of the app: rely on app shell padding */
        padding: 0;
        background: transparent;
      }

      .admin-grid {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .admin-section {
        background: var(--surface-glass);
        border-radius: 12px;
        border: 1px solid var(--app-border);
        padding: 1.5rem;
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--app-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 1rem 0;
        font-family: var(--app-heading-font);
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
        background: var(--surface-muted-glass);
        border: 1px solid var(--app-border);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .admin-card:hover {
        background: color-mix(in srgb, var(--surface-muted-glass), transparent 12%);
        border-color: color-mix(in srgb, var(--theme-primary) 55%, var(--app-border) 45%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .card-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary) 18%, transparent 82%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-icon i {
        font-size: 1.25rem;
      }

      /* Keep semantic icon variants, but theme-tint them (works on any theme) */
      .card-icon.tenants {
        color: color-mix(in srgb, var(--sidebar-accent) 85%, var(--theme-primary) 15%);
        background: color-mix(in srgb, var(--sidebar-accent) 16%, transparent 84%);
      }

      .card-icon.users {
        color: color-mix(in srgb, var(--theme-primary) 65%, #f59e0b 35%);
        background: color-mix(in srgb, var(--theme-primary) 14%, transparent 86%);
      }

      .card-content {
        flex: 1;
      }

      .card-content h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--app-text);
      }

      .card-content p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--app-text-muted);
      }

      .card-arrow {
        color: color-mix(in srgb, var(--app-text-muted), transparent 35%);
        transition: color 0.2s, transform 0.2s;
      }

      .admin-card:hover .card-arrow {
        color: var(--theme-primary);
        transform: translateX(4px);
      }

      @media (max-width: 768px) {
        .admin-page {
          padding: 0;
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
