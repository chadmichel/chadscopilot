import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { PasswordModule } from 'primeng/password';

import { GitHubService } from '../../../services/github.service';
import { GitHubSyncService } from '../../../services/github-sync.service';
import {
  GitHubUserProfile,
  GitHubProject,
  GitHubProjectField,
  GitHubFieldOption,
  FieldMapping,
  GitHubIntegration,
  SyncStatus,
} from '../../../dto/github.dto';
import { TaskStatus } from '../../../dto/task.dto';

interface StatusMappingRow {
  githubOption: GitHubFieldOption;
  localStatus: TaskStatus | null;
}

@Component({
  selector: 'app-github-integration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ProgressSpinnerModule,
    DialogModule,
    SelectModule,
    TableModule,
    ToastModule,
    DividerModule,
    TooltipModule,
    PasswordModule,
  ],
  providers: [MessageService],
  template: `
    <div class="github-integration-page">
      <div class="page-header">
        <div>
          <div class="page-title">
            <i class="pi pi-github" style="margin-right: 0.5rem;"></i>
            GitHub Projects
          </div>
          <div class="page-subtitle">
            Connect your GitHub account and import projects as boards.
          </div>
        </div>
        <div class="header-actions">
          <button
            pButton
            type="button"
            icon="pi pi-arrow-left"
            label="Back"
            severity="secondary"
            [outlined]="true"
            (click)="goBack()"
          ></button>
        </div>
      </div>

      <!-- Connection Card -->
      <div class="content-card connection-card">
        <div class="card-header">
          <h3>
            <i class="pi pi-link"></i>
            Connection
          </h3>
          <p-tag
            *ngIf="isConnected"
            value="Connected"
            severity="success"
          ></p-tag>
          <p-tag
            *ngIf="!isConnected"
            value="Not Connected"
            severity="secondary"
          ></p-tag>
        </div>

        <!-- Connected State -->
        <div *ngIf="isConnected && user" class="connected-info">
          <div class="user-info">
            <img
              *ngIf="user.avatarUrl"
              [src]="user.avatarUrl"
              [alt]="user.login"
              class="avatar"
            />
            <div class="user-details">
              <div class="user-name">{{ user.name || user.login }}</div>
              <div class="user-login">&#64;{{ user.login }}</div>
            </div>
          </div>
          <button
            pButton
            type="button"
            icon="pi pi-sign-out"
            label="Disconnect"
            severity="danger"
            [outlined]="true"
            (click)="disconnect()"
          ></button>
        </div>

        <!-- Not Connected State -->
        <div *ngIf="!isConnected" class="connect-form">
          <div class="pat-instructions">
            <p>
              To connect, create a GitHub Personal Access Token (PAT) with the following permissions:
            </p>
            <ul>
              <li><code>read:project</code> - Read access to projects</li>
              <li><code>project</code> - Full control of projects (for bi-directional sync)</li>
              <li><code>repo</code> - Full control of private repositories (if syncing private repos)</li>
            </ul>
            <a
              href="https://github.com/settings/tokens/new?scopes=project,repo&description=WhenIsDone%20Integration"
              target="_blank"
              rel="noopener noreferrer"
              class="create-token-link"
            >
              <i class="pi pi-external-link"></i>
              Create a new token on GitHub
            </a>
          </div>

          <div class="pat-input-row">
            <div class="p-inputgroup">
              <span class="p-inputgroup-addon">
                <i class="pi pi-key"></i>
              </span>
              <input
                type="password"
                pInputText
                [(ngModel)]="patInput"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                [disabled]="connecting"
              />
            </div>
            <button
              pButton
              type="button"
              icon="pi pi-check"
              label="Connect"
              [disabled]="!patInput || connecting"
              [loading]="connecting"
              (click)="connect()"
            ></button>
          </div>

          <div *ngIf="connectionError" class="error-message">
            <i class="pi pi-exclamation-triangle"></i>
            {{ connectionError }}
          </div>
        </div>
      </div>

      <!-- Projects List (only when connected) -->
      <div *ngIf="isConnected" class="content-card projects-card">
        <div class="card-header">
          <h3>
            <i class="pi pi-list"></i>
            Your Projects
          </h3>
          <div class="header-filters">
            <span class="p-input-icon-left" *ngIf="availableOwners.length > 1">
              <i class="pi pi-filter"></i>
              <p-select
                [options]="availableOwners"
                [(ngModel)]="selectedOwner"
                placeholder="All Owners"
                [showClear]="true"
                appendTo="body"
                [style]="{ width: '150px' }"
              ></p-select>
            </span>
            <div class="p-inputgroup org-search-group">
              <input
                type="text"
                pInputText
                [(ngModel)]="orgSearchInput"
                placeholder="Org login"
                [disabled]="loadingProjects"
                (keyup.enter)="fetchOrgProjects()"
              />
              <button
                pButton
                type="button"
                icon="pi pi-search"
                pTooltip="Fetch Org Projects"
                [disabled]="!orgSearchInput || loadingProjects"
                (click)="fetchOrgProjects()"
              ></button>
            </div>
            <button
              pButton
              type="button"
              icon="pi pi-refresh"
              pTooltip="Refresh All"
              severity="secondary"
              [outlined]="true"
              [disabled]="loadingProjects"
              (click)="loadProjects()"
            ></button>
          </div>
        </div>

        <div *ngIf="loadingProjects" class="loading-projects">
          <p-progressSpinner
            strokeWidth="4"
            [style]="{ width: '32px', height: '32px' }"
          ></p-progressSpinner>
          <span>Loading projects...</span>
        </div>

        <div *ngIf="!loadingProjects && projects.length === 0" class="empty-projects">
          <i class="pi pi-inbox"></i>
          <p>No GitHub Projects found for your account.</p>
          <a
            href="https://github.com/new/project"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create a project on GitHub
          </a>
        </div>

        <div *ngIf="!loadingProjects && filteredProjects.length > 0" class="projects-list">
          <div
            *ngFor="let project of filteredProjects"
            class="project-item"
            [class.imported]="isProjectImported(project)"
          >
            <div class="project-info">
              <div class="project-title">
                {{ project.title }}
                <span class="project-number">#{{ project.number }}</span>
              </div>
              <div class="project-meta">
                <p-tag 
                  [value]="project.ownerLogin" 
                  [severity]="project.ownerType === 'organization' ? 'info' : 'secondary'"
                  [rounded]="true"
                  styleClass="owner-tag"
                ></p-tag>
                <span *ngIf="project.closed" class="closed-badge">Closed</span>
                <span class="field-count">
                  {{ project.fields.length }} field(s)
                </span>
              </div>
            </div>

            <div class="project-actions">
              <ng-container *ngIf="!isProjectImported(project)">
                <button
                  pButton
                  type="button"
                  icon="pi pi-download"
                  label="Import"
                  (click)="openImportDialog(project)"
                ></button>
              </ng-container>
              <ng-container *ngIf="isProjectImported(project)">
                <p-tag value="Imported" severity="success"></p-tag>
                <button
                  pButton
                  type="button"
                  icon="pi pi-sync"
                  label="Sync"
                  severity="secondary"
                  [outlined]="true"
                  [loading]="isSyncing(project)"
                  (click)="syncProject(project)"
                ></button>
                <button
                  pButton
                  type="button"
                  icon="pi pi-external-link"
                  pTooltip="Open Board"
                  severity="secondary"
                  [outlined]="true"
                  (click)="openBoard(project)"
                ></button>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <!-- Existing Integrations -->
      <div *ngIf="integrations.length > 0" class="content-card integrations-card">
        <div class="card-header">
          <h3>
            <i class="pi pi-link"></i>
            Active Integrations
          </h3>
        </div>

        <p-table [value]="integrations" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Project</th>
              <th>Board</th>
              <th>Last Sync</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-integration>
            <tr>
              <td>
                <a [href]="integration.githubProjectUrl" target="_blank" rel="noopener">
                  {{ integration.name }}
                </a>
              </td>
              <td>
                <button
                  pButton
                  type="button"
                  [label]="integration.name"
                  class="p-button-link p-0"
                  (click)="navigateToBoard(integration.boardId)"
                ></button>
              </td>
              <td>
                <span *ngIf="integration.lastSyncAt">
                  {{ formatTime(integration.lastSyncAt) }}
                </span>
                <span *ngIf="!integration.lastSyncAt" class="muted">Never</span>
              </td>
              <td>
                <p-tag
                  *ngIf="getSyncStatus(integration.id)?.inProgress"
                  value="Syncing"
                  severity="info"
                ></p-tag>
                <p-tag
                  *ngIf="getSyncStatus(integration.id)?.error"
                  value="Error"
                  severity="danger"
                  [pTooltip]="getSyncStatus(integration.id)?.error"
                ></p-tag>
                <p-tag
                  *ngIf="!getSyncStatus(integration.id)?.inProgress && !getSyncStatus(integration.id)?.error"
                  value="OK"
                  severity="success"
                ></p-tag>
              </td>
              <td>
                <button
                  pButton
                  type="button"
                  icon="pi pi-sync"
                  pTooltip="Sync Now"
                  severity="secondary"
                  [outlined]="true"
                  [loading]="getSyncStatus(integration.id)?.inProgress ?? false"
                  (click)="syncIntegration(integration.id)"
                ></button>
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  pTooltip="Remove Integration"
                  severity="danger"
                  [outlined]="true"
                  (click)="removeIntegration(integration.id)"
                  style="margin-left: 0.5rem;"
                ></button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Import Dialog -->
      <p-dialog
        [(visible)]="importDialogVisible"
        [header]="'Import: ' + (selectedProject?.title || '')"
        [modal]="true"
        [style]="{ width: '600px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div *ngIf="selectedProject" class="import-dialog-content">
          <p class="import-intro">
            This will create a new board "<strong>{{ selectedProject.title }}</strong>" and import all items from the GitHub project.
          </p>

          <p-divider></p-divider>

          <h4>Status Field Mapping</h4>
          <p class="mapping-instructions">
            Select a Status field from GitHub and map its values to local task statuses.
          </p>

          <div class="field-select">
            <label>GitHub Status Field</label>
            <p-select
              [options]="statusFields"
              [(ngModel)]="selectedStatusField"
              optionLabel="name"
              placeholder="Select a field"
              [style]="{ width: '100%' }"
              (onChange)="onStatusFieldChange()"
            ></p-select>
          </div>

          <div *ngIf="selectedStatusField && statusMappings.length > 0" class="status-mappings">
            <div class="mapping-header">
              <span>GitHub Value</span>
              <span>Local Status</span>
            </div>
            <div *ngFor="let mapping of statusMappings" class="mapping-row">
              <span class="github-value">{{ mapping.githubOption.name }}</span>
              <p-select
                [options]="localStatusOptions"
                [(ngModel)]="mapping.localStatus"
                optionLabel="label"
                optionValue="value"
                placeholder="Select status"
                [style]="{ width: '200px' }"
              ></p-select>
            </div>
          </div>

          <div *ngIf="!selectedStatusField" class="no-field-warning">
            <i class="pi pi-info-circle"></i>
            <span>
              No Status field selected. Items will be imported with "Backlog" status.
            </span>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <button
            pButton
            type="button"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            [outlined]="true"
            (click)="closeImportDialog()"
          ></button>
          <button
            pButton
            type="button"
            label="Import Project"
            icon="pi pi-download"
            [loading]="importing"
            (click)="importProject()"
          ></button>
        </ng-template>
      </p-dialog>

      <p-toast position="top-right"></p-toast>
    </div>
  `,
  styles: [
    `
      .github-integration-page {
        padding: 0;
        background: transparent;
      }

      .content-card {
        margin-bottom: 1rem;
        padding: 1.25rem;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      .card-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--app-text);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .header-filters {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .org-search-group {
        width: 250px;
      }

      .org-search-group input {
        width: 100%;
        padding: 0.25rem 0.5rem;
        font-size: 0.85rem;
      }

      .org-search-group button {
        padding: 0.25rem 0.5rem;
      }

      /* Connection Card */
      .connected-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--surface-muted-glass);
        border-radius: 8px;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid var(--app-border);
      }

      .user-name {
        font-weight: 700;
        color: var(--app-text);
      }

      .user-login {
        color: var(--app-text-muted);
        font-size: 0.9rem;
      }

      .connect-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .pat-instructions {
        padding: 1rem;
        background: var(--surface-muted-glass);
        border-radius: 8px;
        font-size: 0.9rem;
        color: var(--app-text-muted);
      }

      .pat-instructions p {
        margin: 0 0 0.5rem 0;
      }

      .pat-instructions ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
      }

      .pat-instructions li {
        margin-bottom: 0.25rem;
      }

      .pat-instructions code {
        background: var(--surface-glass);
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.85rem;
      }

      .create-token-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        color: var(--theme-primary);
        text-decoration: none;
      }

      .create-token-link:hover {
        text-decoration: underline;
      }

      .pat-input-row {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .pat-input-row .p-inputgroup {
        flex: 1;
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: color-mix(in srgb, #ef4444 15%, var(--surface-glass) 85%);
        border: 1px solid color-mix(in srgb, #ef4444 30%, transparent 70%);
        border-radius: 8px;
        color: color-mix(in srgb, #ef4444 70%, var(--app-text) 30%);
        font-size: 0.9rem;
      }

      /* Projects Card */
      .loading-projects,
      .empty-projects {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--app-text-muted);
        gap: 0.75rem;
      }

      .empty-projects i {
        font-size: 2.5rem;
        opacity: 0.5;
      }

      .empty-projects a {
        color: var(--theme-primary);
      }

      .projects-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .project-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--surface-muted-glass);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }

      .project-item:hover {
        border-color: color-mix(in srgb, var(--theme-primary) 40%, var(--app-border) 60%);
      }

      .project-item.imported {
        border-color: color-mix(in srgb, #22c55e 30%, var(--app-border) 70%);
        background: color-mix(in srgb, #22c55e 5%, var(--surface-muted-glass) 95%);
      }

      .project-title {
        font-weight: 700;
        color: var(--app-text);
      }

      .project-number {
        color: var(--app-text-muted);
        font-weight: 400;
        margin-left: 0.5rem;
      }

      .project-meta {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.25rem;
        font-size: 0.85rem;
        color: var(--app-text-muted);
      }

      .closed-badge {
        color: color-mix(in srgb, #ef4444 70%, var(--app-text) 30%);
      }

      :host ::ng-deep .owner-tag {
        font-size: 0.75rem;
        height: 1.5rem;
        padding: 0 0.5rem;
      }

      .project-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      /* Import Dialog */
      .import-dialog-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .import-intro {
        margin: 0;
        color: var(--app-text-muted);
      }

      .mapping-instructions {
        margin: 0;
        font-size: 0.9rem;
        color: var(--app-text-muted);
      }

      .field-select {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .field-select label {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--app-text);
      }

      .status-mappings {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .mapping-header {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 1rem;
        padding: 0.5rem 0;
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--app-text-muted);
        border-bottom: 1px solid var(--app-border);
      }

      .mapping-row {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 1rem;
        align-items: center;
        padding: 0.5rem 0;
      }

      .github-value {
        color: var(--app-text);
        font-family: monospace;
        font-size: 0.9rem;
      }

      .no-field-warning {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: color-mix(in srgb, #f59e0b 10%, var(--surface-glass) 90%);
        border: 1px solid color-mix(in srgb, #f59e0b 25%, transparent 75%);
        border-radius: 8px;
        color: color-mix(in srgb, #f59e0b 70%, var(--app-text) 30%);
        font-size: 0.9rem;
      }

      /* Integrations Table */
      .integrations-card :host ::ng-deep .p-datatable {
        background: transparent;
      }

      .muted {
        color: var(--app-text-muted);
      }
    `,
  ],
})
export class GitHubIntegrationComponent implements OnInit, OnDestroy {
  // Connection state
  isConnected = false;
  user: GitHubUserProfile | null = null;
  patInput = '';
  connecting = false;
  connectionError = '';

  // Projects state
  projects: GitHubProject[] = [];
  loadingProjects = false;
  selectedOwner: string | null = null;
  orgSearchInput = '';

  // Integrations state
  integrations: GitHubIntegration[] = [];
  syncStatusMap = new Map<string, SyncStatus>();

  // Import dialog state
  importDialogVisible = false;
  selectedProject: GitHubProject | null = null;
  statusFields: GitHubProjectField[] = [];
  selectedStatusField: GitHubProjectField | null = null;
  statusMappings: StatusMappingRow[] = [];
  importing = false;

  localStatusOptions = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'On Deck', value: 'ondeck' },
    { label: 'In Progress', value: 'inprocess' },
    { label: 'Complete', value: 'complete' },
  ];

  get availableOwners(): string[] {
    const owners = new Set(this.projects.map(p => p.ownerLogin));
    return Array.from(owners).sort();
  }

  get filteredProjects(): GitHubProject[] {
    if (!this.selectedOwner) return this.projects;
    return this.projects.filter(p => p.ownerLogin === this.selectedOwner);
  }

  private subs = new Subscription();

  constructor(
    private router: Router,
    private githubService: GitHubService,
    private githubSyncService: GitHubSyncService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    console.log('[GitHub UI] ngOnInit called');
    // Subscribe to connection state
    this.subs.add(
      this.githubService.connected$.subscribe((connected) => {
        console.log('[GitHub UI] connected$ changed:', connected);
        this.isConnected = connected;
        if (connected) {
          console.log('[GitHub UI] Connected, loading projects...');
          this.loadProjects();
        }
      })
    );

    this.subs.add(
      this.githubService.user$.subscribe((user) => {
        console.log('[GitHub UI] user$ changed:', user);
        this.user = user;
      })
    );

    // Subscribe to integrations
    this.subs.add(
      this.githubSyncService.integrations$.subscribe((integrations) => {
        console.log('[GitHub UI] integrations$ changed:', integrations.length, 'integrations');
        this.integrations = integrations;
      })
    );

    // Subscribe to sync status
    this.subs.add(
      this.githubSyncService.syncStatus$.subscribe((statusMap) => {
        this.syncStatusMap = statusMap;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/integrations']);
  }

  // ============ Connection ============

  async connect(): Promise<void> {
    console.log('[GitHub UI] connect() called');
    if (!this.patInput.trim()) return;

    this.connecting = true;
    this.connectionError = '';

    try {
      console.log('[GitHub UI] Setting token...');
      await this.githubService.setToken(this.patInput.trim());
      console.log('[GitHub UI] Token set successfully');
      this.patInput = '';
      this.messageService.add({
        severity: 'success',
        summary: 'Connected',
        detail: 'Successfully connected to GitHub',
      });
    } catch (err: any) {
      console.error('[GitHub UI] Connection error:', err);
      this.connectionError = err.message || 'Failed to connect';
      this.messageService.add({
        severity: 'error',
        summary: 'Connection Failed',
        detail: this.connectionError,
      });
    } finally {
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.githubService.clearToken();
    this.projects = [];
    this.messageService.add({
      severity: 'info',
      summary: 'Disconnected',
      detail: 'GitHub connection removed',
    });
  }

  // ============ Projects ============

  async loadProjects(): Promise<void> {
    console.log('[GitHub UI] loadProjects called');
    this.loadingProjects = true;
    try {
      console.log('[GitHub UI] Calling githubService.getUserProjects()...');
      this.projects = await this.githubService.getUserProjects();
      console.log('[GitHub UI] Projects loaded:', this.projects);
    } catch (err: any) {
      console.error('[GitHub UI] Error loading projects:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err.message || 'Failed to load projects',
      });
    } finally {
      this.loadingProjects = false;
      console.log('[GitHub UI] loadProjects finished, projects count:', this.projects.length);
    }
  }

  async fetchOrgProjects(): Promise<void> {
    if (!this.orgSearchInput.trim()) return;

    const orgLogin = this.orgSearchInput.trim();
    this.loadingProjects = true;
    try {
      console.log(`[GitHub UI] Explicitly fetching projects for org: ${orgLogin}`);
      const orgProjects = await this.githubService.getOrgProjects(orgLogin);

      // Merge with existing projects, avoiding duplicates by ID
      const existingIds = new Set(this.projects.map(p => p.id));
      const newProjects = orgProjects.filter(p => !existingIds.has(p.id));

      this.projects = [...this.projects, ...newProjects];
      this.selectedOwner = orgLogin; // Switch filter to this org
      this.orgSearchInput = '';

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Found ${orgProjects.length} projects for organization "${orgLogin}"`,
      });
    } catch (err: any) {
      console.error('[GitHub UI] Error fetching org projects:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Search Failed',
        detail: err.message || 'Could not find organization or access denied',
      });
    } finally {
      this.loadingProjects = false;
    }
  }

  isProjectImported(project: GitHubProject): boolean {
    return this.integrations.some((i) => i.githubProjectId === project.id);
  }

  isSyncing(project: GitHubProject): boolean {
    const integration = this.integrations.find(
      (i) => i.githubProjectId === project.id
    );
    if (!integration) return false;
    return this.syncStatusMap.get(integration.id)?.inProgress || false;
  }

  async syncProject(project: GitHubProject): Promise<void> {
    const integration = this.integrations.find(
      (i) => i.githubProjectId === project.id
    );
    if (!integration) return;

    try {
      const result = await this.githubSyncService.syncProject(integration.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Sync Complete',
        detail: `Created: ${result.created}, Updated: ${result.updated}, Unchanged: ${result.unchanged}`,
      });
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sync Failed',
        detail: err.message || 'Failed to sync project',
      });
    }
  }

  openBoard(project: GitHubProject): void {
    const integration = this.integrations.find(
      (i) => i.githubProjectId === project.id
    );
    if (integration) {
      this.router.navigate(['/boards', integration.boardId]);
    }
  }

  // ============ Import Dialog ============

  openImportDialog(project: GitHubProject): void {
    this.selectedProject = project;
    this.statusFields = project.fields.filter(
      (f) => f.options && f.options.length > 0
    );
    this.selectedStatusField = null;
    this.statusMappings = [];
    this.importDialogVisible = true;
  }

  closeImportDialog(): void {
    this.importDialogVisible = false;
    this.selectedProject = null;
    this.selectedStatusField = null;
    this.statusMappings = [];
  }

  onStatusFieldChange(): void {
    if (!this.selectedStatusField || !this.selectedStatusField.options) {
      this.statusMappings = [];
      return;
    }

    // Auto-map common status names
    this.statusMappings = this.selectedStatusField.options.map((opt) => ({
      githubOption: opt,
      localStatus: this.guessLocalStatus(opt.name),
    }));
  }

  private guessLocalStatus(name: string): TaskStatus | null {
    const lower = name.toLowerCase();
    if (lower.includes('backlog') || lower.includes('todo') || lower.includes('new')) {
      return 'backlog';
    }
    if (lower.includes('deck') || lower.includes('ready') || lower.includes('next')) {
      return 'ondeck';
    }
    if (lower.includes('progress') || lower.includes('doing') || lower.includes('active') || lower.includes('in review')) {
      return 'inprocess';
    }
    if (lower.includes('done') || lower.includes('complete') || lower.includes('closed') || lower.includes('finished')) {
      return 'complete';
    }
    return null;
  }

  async importProject(): Promise<void> {
    if (!this.selectedProject) return;

    this.importing = true;

    try {
      // Build field mappings
      const fieldMappings: FieldMapping[] = [];

      if (this.selectedStatusField && this.statusMappings.length > 0) {
        const valueMap: Record<string, string> = {};
        const reverseMap: Record<string, string> = {};

        for (const mapping of this.statusMappings) {
          if (mapping.localStatus) {
            valueMap[mapping.githubOption.name] = mapping.localStatus;
            reverseMap[mapping.localStatus] = mapping.githubOption.id;
          }
        }

        fieldMappings.push({
          githubFieldId: this.selectedStatusField.id,
          githubFieldName: this.selectedStatusField.name,
          localField: 'status',
          valueMap,
          reverseMap,
        });
      }

      const integration = await this.githubSyncService.importProject(
        this.selectedProject,
        fieldMappings
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Import Complete',
        detail: `Project "${this.selectedProject.title}" imported successfully`,
      });

      this.closeImportDialog();

      // Navigate to the new board
      this.router.navigate(['/boards', integration.boardId]);
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Import Failed',
        detail: err.message || 'Failed to import project',
      });
    } finally {
      this.importing = false;
    }
  }

  // ============ Integrations Table ============

  getSyncStatus(integrationId: string): SyncStatus | undefined {
    return this.syncStatusMap.get(integrationId);
  }

  async syncIntegration(integrationId: string): Promise<void> {
    try {
      const result = await this.githubSyncService.syncProject(integrationId);
      this.messageService.add({
        severity: 'success',
        summary: 'Sync Complete',
        detail: `Created: ${result.created}, Updated: ${result.updated}`,
      });
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sync Failed',
        detail: err.message,
      });
    }
  }

  removeIntegration(integrationId: string): void {
    this.githubSyncService.deleteIntegration(integrationId);
    this.messageService.add({
      severity: 'info',
      summary: 'Removed',
      detail: 'Integration removed (board preserved)',
    });
  }

  navigateToBoard(boardId: string): void {
    this.router.navigate(['/boards', boardId]);
  }

  formatTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
