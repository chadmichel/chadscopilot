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
import { CheckboxModule } from 'primeng/checkbox';

import { AzureDevOpsService } from '../../../services/azure-devops.service';
import { AzureDevOpsSyncService } from '../../../services/azure-devops-sync.service';
import {
  AzureDevOpsUserProfile,
  AzureDevOpsProject,
  AzureDevOpsWorkItemType,
  AzureDevOpsWorkItemState,
  AzureDevOpsFieldMapping,
  AzureDevOpsIntegration,
  AzureDevOpsSyncStatus,
  StateMappingRow,
} from '../../../dto/azure-devops.dto';
import { TaskStatus } from '../../../dto/task.dto';

@Component({
  selector: 'app-azure-devops-integration',
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
    CheckboxModule,
  ],
  providers: [MessageService],
  template: `
    <div class="ado-integration-page">
      <div class="page-header">
        <div>
          <div class="page-title">
            <i class="pi pi-microsoft" style="margin-right: 0.5rem;"></i>
            Azure DevOps
          </div>
          <div class="page-subtitle">
            Connect your Azure DevOps organization and import work items as tasks.
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
            <div class="avatar-placeholder">
              <i class="pi pi-user"></i>
            </div>
            <div class="user-details">
              <div class="user-name">{{ user.displayName }}</div>
              <div class="user-login">{{ organization }}</div>
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
            <p>To connect, you need:</p>
            <ol>
              <li>Your Azure DevOps organization name (from <code>dev.azure.com/&#123;organization&#125;</code>)</li>
              <li>A Personal Access Token with these scopes:
                <ul>
                  <li><code>Work Items (Read & Write)</code></li>
                  <li><code>Project and Team (Read)</code></li>
                </ul>
              </li>
            </ol>
            <a
              href="https://dev.azure.com/_usersSettings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              class="create-token-link"
            >
              <i class="pi pi-external-link"></i>
              Create a PAT in Azure DevOps
            </a>
          </div>

          <div class="input-row">
            <label>Organization</label>
            <div class="p-inputgroup">
              <span class="p-inputgroup-addon">
                <i class="pi pi-building"></i>
              </span>
              <input
                type="text"
                pInputText
                [(ngModel)]="orgInput"
                placeholder="myorganization"
                [disabled]="connecting"
              />
            </div>
          </div>

          <div class="input-row">
            <label>Personal Access Token</label>
            <div class="p-inputgroup">
              <span class="p-inputgroup-addon">
                <i class="pi pi-key"></i>
              </span>
              <input
                type="password"
                pInputText
                [(ngModel)]="patInput"
                placeholder="xxxxxxxxxx"
                [disabled]="connecting"
              />
            </div>
          </div>

          <button
            pButton
            type="button"
            icon="pi pi-check"
            label="Connect"
            [disabled]="!orgInput || !patInput || connecting"
            [loading]="connecting"
            (click)="connect()"
          ></button>

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
          <button
            pButton
            type="button"
            icon="pi pi-refresh"
            label="Refresh"
            severity="secondary"
            [outlined]="true"
            [disabled]="loadingProjects"
            (click)="loadProjects()"
          ></button>
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
          <p>No Azure DevOps projects found for your organization.</p>
        </div>

        <div *ngIf="!loadingProjects && projects.length > 0" class="projects-list">
          <div
            *ngFor="let project of projects"
            class="project-item"
            [class.imported]="isProjectImported(project)"
          >
            <div class="project-info">
              <div class="project-title">
                {{ project.name }}
              </div>
              <div class="project-meta">
                <span class="visibility-badge" [class.private]="project.visibility === 'private'">
                  {{ project.visibility }}
                </span>
                <span *ngIf="project.description" class="project-desc">
                  {{ project.description }}
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
                <a [href]="integration.projectUrl" target="_blank" rel="noopener">
                  {{ integration.name }}
                </a>
              </td>
              <td>
                <button
                  pButton
                  type="button"
                  [label]="integration.projectName"
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
        [header]="'Import: ' + (selectedProject?.name || '')"
        [modal]="true"
        [style]="{ width: '650px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div *ngIf="selectedProject" class="import-dialog-content">
          <p class="import-intro">
            This will create a new board "<strong>{{ selectedProject.name }}</strong>" and import work items as tasks.
          </p>

          <p-divider></p-divider>

          <div *ngIf="loadingWorkItemTypes" class="loading-types">
            <p-progressSpinner
              strokeWidth="4"
              [style]="{ width: '24px', height: '24px' }"
            ></p-progressSpinner>
            <span>Loading work item types...</span>
          </div>

          <div *ngIf="!loadingWorkItemTypes">
            <h4>Work Item Types</h4>
            <p class="mapping-instructions">
              Select which work item types to import.
            </p>

            <div class="work-item-types">
              <div *ngFor="let type of availableWorkItemTypes" class="type-checkbox">
                <p-checkbox
                  [(ngModel)]="selectedWorkItemTypes"
                  [value]="type.name"
                  (onChange)="updateStateMappings()"
                ></p-checkbox>
                <label class="checkbox-label">{{ type.name }}</label>
              </div>
            </div>

            <p-divider></p-divider>

            <h4>State Mapping</h4>
            <p class="mapping-instructions">
              Map Azure DevOps states to local task statuses.
            </p>

            <div *ngIf="stateMappings.length > 0" class="status-mappings">
              <div class="mapping-header">
                <span>Azure DevOps State</span>
                <span>Local Status</span>
              </div>
              <div *ngFor="let mapping of stateMappings" class="mapping-row">
                <span class="ado-value">
                  {{ mapping.adoState.name }}
                  <span class="state-category">({{ mapping.adoState.category }})</span>
                </span>
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

            <div *ngIf="stateMappings.length === 0" class="no-states-warning">
              <i class="pi pi-info-circle"></i>
              <span>
                Select work item types to configure state mapping.
              </span>
            </div>
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
            [disabled]="selectedWorkItemTypes.length === 0"
            (click)="importProject()"
          ></button>
        </ng-template>
      </p-dialog>

      <p-toast position="top-right"></p-toast>
    </div>
  `,
  styles: [
    `
      .ado-integration-page {
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

      .avatar-placeholder {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid var(--app-border);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-glass);
        color: var(--app-text-muted);
        font-size: 1.5rem;
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

      .pat-instructions ol,
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

      .input-row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .input-row label {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--app-text);
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
      .empty-projects,
      .loading-types {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--app-text-muted);
        gap: 0.75rem;
      }

      .loading-types {
        flex-direction: row;
        padding: 1rem;
      }

      .empty-projects i {
        font-size: 2.5rem;
        opacity: 0.5;
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

      .project-meta {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.25rem;
        font-size: 0.85rem;
        color: var(--app-text-muted);
      }

      .visibility-badge {
        text-transform: capitalize;
      }

      .visibility-badge.private {
        color: color-mix(in srgb, #f59e0b 70%, var(--app-text) 30%);
      }

      .project-desc {
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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

      .work-item-types {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      .type-checkbox {
        min-width: 150px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .checkbox-label {
        color: var(--app-text);
        cursor: pointer;
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

      .ado-value {
        color: var(--app-text);
        font-family: monospace;
        font-size: 0.9rem;
      }

      .state-category {
        color: var(--app-text-muted);
        font-size: 0.8rem;
        margin-left: 0.5rem;
      }

      .no-states-warning {
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
export class AzureDevOpsIntegrationComponent implements OnInit, OnDestroy {
  // Connection state
  isConnected = false;
  user: AzureDevOpsUserProfile | null = null;
  organization = '';
  orgInput = '';
  patInput = '';
  connecting = false;
  connectionError = '';

  // Projects state
  projects: AzureDevOpsProject[] = [];
  loadingProjects = false;

  // Integrations state
  integrations: AzureDevOpsIntegration[] = [];
  syncStatusMap = new Map<string, AzureDevOpsSyncStatus>();

  // Import dialog state
  importDialogVisible = false;
  selectedProject: AzureDevOpsProject | null = null;
  loadingWorkItemTypes = false;
  availableWorkItemTypes: AzureDevOpsWorkItemType[] = [];
  selectedWorkItemTypes: string[] = ['Task', 'Bug'];
  stateMappings: StateMappingRow[] = [];
  importing = false;

  localStatusOptions = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'On Deck', value: 'ondeck' },
    { label: 'In Progress', value: 'inprocess' },
    { label: 'Complete', value: 'complete' },
  ];

  private subs = new Subscription();

  constructor(
    private router: Router,
    private adoService: AzureDevOpsService,
    private adoSyncService: AzureDevOpsSyncService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.adoService.connected$.subscribe((connected) => {
        this.isConnected = connected;
        if (connected) {
          this.organization = this.adoService.getOrganization() || '';
          this.loadProjects();
        }
      })
    );

    this.subs.add(
      this.adoService.user$.subscribe((user) => {
        this.user = user;
      })
    );

    this.subs.add(
      this.adoSyncService.integrations$.subscribe((integrations) => {
        this.integrations = integrations;
      })
    );

    this.subs.add(
      this.adoSyncService.syncStatus$.subscribe((statusMap) => {
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
    if (!this.orgInput.trim() || !this.patInput.trim()) return;

    this.connecting = true;
    this.connectionError = '';

    try {
      await this.adoService.setCredentials(this.orgInput.trim(), this.patInput.trim());
      this.orgInput = '';
      this.patInput = '';
      this.messageService.add({
        severity: 'success',
        summary: 'Connected',
        detail: 'Successfully connected to Azure DevOps',
      });
    } catch (err: any) {
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
    this.adoService.clearCredentials();
    this.projects = [];
    this.messageService.add({
      severity: 'info',
      summary: 'Disconnected',
      detail: 'Azure DevOps connection removed',
    });
  }

  // ============ Projects ============

  async loadProjects(): Promise<void> {
    this.loadingProjects = true;
    try {
      this.projects = await this.adoService.getProjects();
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err.message || 'Failed to load projects',
      });
    } finally {
      this.loadingProjects = false;
    }
  }

  isProjectImported(project: AzureDevOpsProject): boolean {
    return this.integrations.some((i) => i.projectId === project.id);
  }

  isSyncing(project: AzureDevOpsProject): boolean {
    const integration = this.integrations.find((i) => i.projectId === project.id);
    if (!integration) return false;
    return this.syncStatusMap.get(integration.id)?.inProgress || false;
  }

  async syncProject(project: AzureDevOpsProject): Promise<void> {
    const integration = this.integrations.find((i) => i.projectId === project.id);
    if (!integration) return;

    try {
      const result = await this.adoSyncService.syncProject(integration.id);
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

  openBoard(project: AzureDevOpsProject): void {
    const integration = this.integrations.find((i) => i.projectId === project.id);
    if (integration) {
      this.router.navigate(['/boards', integration.boardId]);
    }
  }

  // ============ Import Dialog ============

  async openImportDialog(project: AzureDevOpsProject): Promise<void> {
    this.selectedProject = project;
    this.selectedWorkItemTypes = ['Task', 'Bug'];
    this.stateMappings = [];
    this.importDialogVisible = true;

    this.loadingWorkItemTypes = true;
    try {
      this.availableWorkItemTypes = await this.adoService.getWorkItemTypes(project.name);
      this.updateStateMappings();
    } catch (err: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err.message || 'Failed to load work item types',
      });
    } finally {
      this.loadingWorkItemTypes = false;
    }
  }

  closeImportDialog(): void {
    this.importDialogVisible = false;
    this.selectedProject = null;
    this.availableWorkItemTypes = [];
    this.selectedWorkItemTypes = [];
    this.stateMappings = [];
  }

  updateStateMappings(): void {
    const allStates = new Map<string, AzureDevOpsWorkItemState>();

    for (const typeName of this.selectedWorkItemTypes) {
      const type = this.availableWorkItemTypes.find((t) => t.name === typeName);
      if (type) {
        for (const state of type.states) {
          if (!allStates.has(state.name)) {
            allStates.set(state.name, state);
          }
        }
      }
    }

    this.stateMappings = Array.from(allStates.values()).map((state) => ({
      adoState: state,
      localStatus: this.guessLocalStatus(state),
    }));
  }

  private guessLocalStatus(state: AzureDevOpsWorkItemState): TaskStatus | null {
    const category = state.category;
    const lower = state.name.toLowerCase();

    if (category === 'Proposed') return 'backlog';
    if (category === 'InProgress') return 'inprocess';
    if (category === 'Resolved') return 'ondeck';
    if (category === 'Completed') return 'complete';
    if (category === 'Removed') return null;

    if (lower.includes('new') || lower.includes('to do') || lower.includes('proposed')) {
      return 'backlog';
    }
    if (lower.includes('active') || lower.includes('in progress') || lower.includes('committed')) {
      return 'inprocess';
    }
    if (lower.includes('resolved') || lower.includes('approved')) {
      return 'ondeck';
    }
    if (lower.includes('done') || lower.includes('closed')) {
      return 'complete';
    }

    return null;
  }

  async importProject(): Promise<void> {
    if (!this.selectedProject || this.selectedWorkItemTypes.length === 0) return;

    this.importing = true;

    try {
      const valueMap: Record<string, string> = {};
      const reverseMap: Record<string, string> = {};

      for (const mapping of this.stateMappings) {
        if (mapping.localStatus) {
          valueMap[mapping.adoState.name] = mapping.localStatus;
          reverseMap[mapping.localStatus] = mapping.adoState.name;
        }
      }

      const fieldMappings: AzureDevOpsFieldMapping[] = [
        {
          adoFieldName: 'System.State',
          adoFieldDisplayName: 'State',
          localField: 'status',
          valueMap,
          reverseMap,
        },
      ];

      const integration = await this.adoSyncService.importProject(
        this.selectedProject,
        this.selectedWorkItemTypes,
        fieldMappings
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Import Complete',
        detail: `Project "${this.selectedProject.name}" imported successfully`,
      });

      this.closeImportDialog();
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

  getSyncStatus(integrationId: string): AzureDevOpsSyncStatus | undefined {
    return this.syncStatusMap.get(integrationId);
  }

  async syncIntegration(integrationId: string): Promise<void> {
    try {
      const result = await this.adoSyncService.syncProject(integrationId);
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
    this.adoSyncService.deleteIntegration(integrationId);
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
