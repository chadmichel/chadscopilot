import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { IntegrationService } from '../../services/integration.service';
import { IntegrationDto, IntegrationType } from '../../dto/integration.dto';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { environment } from '../../../environments/environment';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    PageToolbarComponent,
  ],
  template: `
    <div class="integrations-page">
      <pb-page-toolbar header="Integrations">
          <button
            pButton
            type="button"
            icon="pi pi-plus"
            label="New"
            (click)="createIntegration()"
          ></button>
      </pb-page-toolbar>
      <p class="page-subtitle mb-4">
        Per-tenant integration instances for GitHub and Azure DevOps.
      </p>

      <!-- Global sync status -->
      <div class="sync-card content-card">
        <div class="sync-left">
          <div class="sync-title">
            <span>Sync to backend</span>
            <p-tag
              *ngIf="environmentMock"
              value="Mock"
              severity="secondary"
            ></p-tag>
            <p-tag
              *ngIf="!environmentMock && !isOnline"
              value="Offline"
              severity="secondary"
            ></p-tag>
            <p-tag
              *ngIf="!environmentMock && isOnline && syncing"
              value="Syncing"
              severity="info"
            ></p-tag>
            <p-tag
              *ngIf="!environmentMock && isOnline && !syncing && lastError"
              value="Error"
              severity="danger"
            ></p-tag>
            <p-tag
              *ngIf="!environmentMock && isOnline && !syncing && !lastError && pendingTotal > 0"
              [value]="pendingTotal + ' pending'"
              severity="warn"
            ></p-tag>
            <p-tag
              *ngIf="!environmentMock && isOnline && !syncing && !lastError && pendingTotal === 0"
              value="Up to date"
              severity="success"
            ></p-tag>
          </div>
          <div class="sync-subtitle">
            <ng-container *ngIf="environmentMock">
              Mock mode: sync is simulated.
            </ng-container>
            <ng-container *ngIf="!environmentMock">
              <span *ngIf="lastSyncAt">Last sync: {{ formatShortTime(lastSyncAt) }}</span>
              <span *ngIf="!lastSyncAt">No successful sync yet.</span>
              <span *ngIf="lastError" class="sync-error"> · {{ lastError }}</span>
            </ng-container>
          </div>
          <div class="sync-queue" *ngIf="!environmentMock">
            <span class="pill">Boards: {{ pendingBoards }}</span>
            <span class="pill">Projects: {{ pendingProjects }}</span>
            <span class="pill">Tasks: {{ pendingTasks }}</span>
          </div>
        </div>

        <div class="sync-right">
          <button
            pButton
            type="button"
            icon="pi pi-list"
            label="Sync Items"
            severity="secondary"
            [outlined]="true"
            (click)="goToSyncItems()"
          ></button>
          <button
            pButton
            type="button"
            icon="pi pi-refresh"
            label="Sync now"
            [disabled]="environmentMock || !isOnline || syncing"
            (click)="syncNow()"
          ></button>
          <p-progressSpinner
            *ngIf="syncing"
            strokeWidth="4"
            [style]="{ width: '24px', height: '24px' }"
          ></p-progressSpinner>
        </div>
      </div>

      <!-- GitHub Projects Quick Link -->
      <div class="github-quick-link content-card" (click)="goToGitHub()">
        <div class="gh-left">
          <i class="pi pi-github gh-icon"></i>
          <div class="gh-info">
            <div class="gh-title">GitHub Projects</div>
            <div class="gh-desc">Connect your GitHub account and import projects as boards</div>
          </div>
        </div>
        <i class="pi pi-chevron-right"></i>
      </div>

      <!-- Azure DevOps Quick Link -->
      <div class="github-quick-link content-card" (click)="goToAzureDevOps()">
        <div class="gh-left">
          <i class="pi pi-microsoft gh-icon"></i>
          <div class="gh-info">
            <div class="gh-title">Azure DevOps</div>
            <div class="gh-desc">Connect your Azure DevOps organization and import work items as tasks</div>
          </div>
        </div>
        <i class="pi pi-chevron-right"></i>
      </div>

      <!-- Integrations list -->
      <div class="integrations-grid" *ngIf="!loading; else loadingTpl">
        <p-card *ngFor="let i of integrations" styleClass="integration-card">
          <ng-template pTemplate="header">
            <div class="integration-header">
              <div class="integration-title">
                <div class="name">{{ i.name }}</div>
                <div class="meta">
                  <p-tag [value]="typeLabel(i.type)" severity="secondary"></p-tag>
                  <p-tag
                    [value]="(i.status || 'disconnected')"
                    [severity]="statusSeverity(i.status)"
                  ></p-tag>
                  <span class="sync-mini" [class.muted]="pendingTotal === 0">
                    {{ integrationSyncLabel() }}
                  </span>
                </div>
              </div>
            </div>
          </ng-template>

          <div class="integration-body">
            <div class="row" *ngIf="i.description">
              <span class="label">Description</span>
              <span class="value">{{ i.description }}</span>
            </div>
            <div class="row">
              <span class="label">Linked projects</span>
              <span class="value">{{ (i.projectIds?.length || 0) + '' }}</span>
            </div>
            <div class="row" *ngIf="i.updatedAt">
              <span class="label">Updated</span>
              <span class="value">{{ formatShortTime(i.updatedAt) }}</span>
            </div>
          </div>

          <ng-template pTemplate="footer">
            <div class="integration-actions">
              <button
                pButton
                type="button"
                label="Configure"
                icon="pi pi-cog"
                severity="secondary"
                [outlined]="true"
                (click)="openIntegration(i.id!)"
              ></button>
              <button
                pButton
                type="button"
                label="Sync"
                icon="pi pi-refresh"
                [disabled]="environmentMock || !isOnline || syncing"
                (click)="syncNow()"
              ></button>
            </div>
          </ng-template>
        </p-card>

        <div *ngIf="integrations.length === 0" class="empty">
          No integrations yet. Click <b>New</b> to create one.
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading">
          <p-progressSpinner
            strokeWidth="4"
            [style]="{ width: '40px', height: '40px' }"
          ></p-progressSpinner>
          <span>Loading integrations…</span>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      /* Align with other pages: rely on app shell padding, don't tint wallpaper */
      .integrations-page {
        padding: 0;
        background: transparent;
      }

      .integrations-page .header-actions {
        display: flex;
        gap: 0.5rem;
      }

      .sync-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .sync-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        color: var(--app-text);
      }

      .sync-subtitle {
        margin-top: 0.25rem;
        color: var(--app-text-muted);
        font-size: 0.9rem;
      }

      .sync-error {
        color: color-mix(in srgb, #ef4444, var(--app-text) 40%);
      }

      .sync-queue {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.6rem;
      }

      .pill {
        border: 1px solid var(--app-border);
        background: var(--surface-muted-glass);
        color: var(--app-text-muted);
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.75rem;
      }

      .sync-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .integrations-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      @media (max-width: 900px) {
        .integrations-grid {
          grid-template-columns: 1fr;
        }
      }

      :host ::ng-deep .integration-card .p-card-body {
        padding-top: 0.75rem;
      }

      :host ::ng-deep .integration-card {
        transition: transform 0.15s ease, box-shadow 0.15s ease,
          border-color 0.15s ease;
        overflow: hidden;
      }

      :host ::ng-deep .integration-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(
          in srgb,
          var(--theme-primary) 35%,
          var(--app-border) 65%
        );
      }

      :host-context(html[data-theme='arcade80s'])
        :host
        ::ng-deep
        .integration-card:hover {
        box-shadow: 0 0 0 1px
            color-mix(in srgb, var(--theme-primary) 45%, transparent 55%),
          0 18px 44px rgba(0, 245, 255, 0.16);
      }

      :host-context(html[data-theme='grunge90s'])
        :host
        ::ng-deep
        .integration-card:hover {
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
      }

      .integration-header {
        padding: 0.9rem 1rem 0;
      }

      .name {
        font-weight: 800;
        color: var(--app-text);
        font-size: 1.05rem;
      }

      .meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }

      .sync-mini {
        font-size: 0.8rem;
        color: var(--app-text-muted);
      }

      .integration-body {
        display: grid;
        gap: 0.5rem;
      }

      .row {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 0.75rem;
        align-items: baseline;
      }

      .label {
        color: var(--app-text-muted);
        font-size: 0.85rem;
      }

      .value {
        color: var(--app-text);
      }

      .integration-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 0 1rem 1rem;
      }

      .loading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        color: var(--app-text-muted);
      }

      .empty {
        grid-column: 1 / -1;
        padding: 1rem;
        border: 1px dashed var(--app-border);
        border-radius: 12px;
        color: var(--app-text-muted);
        text-align: center;
        background: var(--surface-glass);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .github-quick-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        margin-bottom: 1rem;
        cursor: pointer;
        transition: border-color 0.15s ease, transform 0.15s ease;
      }

      .github-quick-link:hover {
        border-color: color-mix(in srgb, var(--theme-primary) 40%, var(--app-border) 60%);
        transform: translateY(-1px);
      }

      .gh-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .gh-icon {
        font-size: 2rem;
        color: var(--app-text);
      }

      .gh-title {
        font-weight: 700;
        color: var(--app-text);
        font-size: 1.05rem;
      }

      .gh-desc {
        color: var(--app-text-muted);
        font-size: 0.9rem;
        margin-top: 0.15rem;
      }

      .github-quick-link .pi-chevron-right {
        color: var(--app-text-muted);
      }
    `,
  ],
})
export class IntegrationsComponent implements OnInit, OnDestroy {
  integrations: Array<IntegrationDto & { id?: string }> = [];
  loading = true;

  environmentMock = environment.mock;
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  syncing = false;
  pendingBoards = 0;
  pendingProjects = 0;
  pendingTasks = 0;
  pendingTotal = 0;
  lastSyncAt: string | null = null;
  lastError: string | null = null;

  private sub = new Subscription();

  constructor(
    private router: Router,
    private integrationService: IntegrationService,
    private offlineSync: OfflineSyncService
  ) { }

  ngOnInit(): void {
    this.loadIntegrations();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    }

    this.sub.add(
      this.offlineSync.syncing$.subscribe((v) => (this.syncing = v))
    );
    this.sub.add(
      this.offlineSync.queueSummary$.subscribe((s) => {
        this.pendingBoards = s.boards || 0;
        this.pendingProjects = s.projects || 0;
        this.pendingTasks = s.tasks || 0;
        this.pendingTotal = s.total || 0;
      })
    );
    this.sub.add(
      this.offlineSync.lastSyncAt$.subscribe((v) => (this.lastSyncAt = v))
    );
    this.sub.add(
      this.offlineSync.lastError$.subscribe((v) => (this.lastError = v))
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
  }

  private onOnline = () => {
    this.isOnline = true;
  };
  private onOffline = () => {
    this.isOnline = false;
  };

  private loadIntegrations(): void {
    this.loading = true;
    this.integrationService.getIntegrations({ take: 200, skip: 0 }).subscribe({
      next: (res) => {
        const items =
          (res.items || []).map((it: any) => ({
            id: it.id,
            ...(it.item || {}),
          })) || [];
        this.integrations = items;
        this.loading = false;
      },
      error: () => {
        this.integrations = [];
        this.loading = false;
      },
    });
  }

  createIntegration(): void {
    this.router.navigate(['/', 'integrations', 'new']);
  }

  openIntegration(id: string): void {
    this.router.navigate(['/', 'integrations', id]);
  }

  syncNow(): void {
    this.offlineSync.syncAll().subscribe({ next: () => { }, error: () => { } });
  }

  goToSyncItems(): void {
    this.router.navigate(['/syncitems']);
  }

  goToGitHub(): void {
    this.router.navigate(['/integrations/github']);
  }

  goToAzureDevOps(): void {
    this.router.navigate(['/integrations/azuredevops']);
  }

  typeLabel(type: IntegrationType): string {
    switch (type) {
      case 'github_repo':
        return 'GitHub Repository';
      case 'github_project':
        return 'GitHub Project';
      case 'azure_devops_project':
        return 'Azure DevOps Project';
      default:
        return String(type);
    }
  }

  statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'secondary' {
    if (status === 'connected') return 'success';
    if (status === 'error') return 'danger';
    return 'secondary';
  }

  integrationSyncLabel(): string {
    if (this.environmentMock) return 'Mock sync';
    if (!this.isOnline) return 'Offline';
    if (this.syncing) return 'Syncing…';
    if (this.lastError) return 'Sync error';
    if (this.pendingTotal > 0) return `${this.pendingTotal} pending`;
    return this.lastSyncAt ? `Synced ${this.formatShortTime(this.lastSyncAt)}` : 'Up to date';
  }

  formatShortTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }
}

