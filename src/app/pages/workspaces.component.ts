import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { ToolSettingsService, Tool } from '../services/tool-settings.service';
import { ProjectsService } from '../services/projects.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <button class="add-btn" (click)="showAddForm = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Workspace
        </button>
      </div>

      @if (showAddForm) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>New Workspace</h3>
            <div class="form-group">
              <label for="workspaceName">Workspace Name</label>
              <input
                id="workspaceName"
                type="text"
                [(ngModel)]="newName"
                placeholder="My Workspace"
                (keydown.enter)="addWorkspace()"
                autofocus
              />
            </div>
            <div class="form-group">
              <label for="folderPath">Folder Path</label>
              <div class="input-with-button">
                <input
                  id="folderPath"
                  type="text"
                  [(ngModel)]="newFolderPath"
                  placeholder="/path/to/workspace"
                  (keydown.enter)="addWorkspace()"
                />
                <button type="button" class="browse-btn" (click)="pickFolder()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  Browse
                </button>
              </div>
            </div>
            <div class="modal-actions">
              <button class="cancel-btn" (click)="closeModal()">Cancel</button>
              <button
                class="confirm-btn"
                (click)="addWorkspace()"
                [disabled]="!newName.trim() || !newFolderPath.trim()"
              >Add</button>
            </div>
          </div>
        </div>
      }

      <!-- Configure workspace modal -->
      @if (configWorkspace) {
        <div class="modal-overlay" (click)="closeConfig()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Configure {{ configWorkspace.name }}</h3>
            <div class="form-group">
              <label>Editor Tool</label>
              <select
                [ngModel]="configWorkspace.editorToolId"
                (ngModelChange)="configWorkspace.editorToolId = $event; configDirty = true"
              >
                <option value="">None</option>
                @for (tool of editorTools; track tool.id) {
                  <option [value]="tool.id">{{ tool.title }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Task Tool</label>
              <select
                [ngModel]="configWorkspace.taskToolId"
                (ngModelChange)="onTaskToolChange($event)"
              >
                <option value="">None</option>
                @for (tool of taskTools; track tool.id) {
                  <option [value]="tool.id">{{ tool.title }}</option>
                }
              </select>
            </div>
            @if (configWorkspace.taskToolId && configOrganizations.length > 0) {
              <div class="form-group">
                <label>Organization</label>
                <select
                  [ngModel]="configWorkspace.taskOrganization"
                  (ngModelChange)="onOrgChange($event)"
                >
                  <option value="">None</option>
                  @for (org of configOrganizations; track org) {
                    <option [value]="org">{{ org }}</option>
                  }
                </select>
              </div>
            }
            @if (configWorkspace.taskOrganization && configProjects.length > 0) {
              <div class="form-group">
                <label>Project</label>
                <select
                  [ngModel]="configWorkspace.taskToolExternalId"
                  (ngModelChange)="configWorkspace.taskToolExternalId = $event; configDirty = true"
                >
                  <option value="">None</option>
                  @for (proj of configProjects; track proj.externalId) {
                    <option [value]="proj.externalId">{{ proj.name }}</option>
                  }
                </select>
              </div>
            }
            <div class="modal-actions">
              <button class="cancel-btn" (click)="closeConfig()">Cancel</button>
              <button
                class="confirm-btn"
                (click)="saveConfig()"
                [disabled]="!configDirty"
              >Save</button>
            </div>
          </div>
        </div>
      }

      @if (workspaceService.workspaces.length === 0 && !showAddForm) {
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No workspaces yet</p>
          <span class="empty-hint">Create a workspace to get started with a scoped Copilot agent.</span>
        </div>
      } @else {
        <div class="workspace-list">
          @for (workspace of workspaceService.workspaces; track workspace.id) {
            <div class="workspace-row">
              <div class="row-main" (click)="openWorkspace(workspace.id)">
                <svg class="row-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="row-name">{{ workspace.name }}</span>
                <span class="row-path">{{ workspace.folderPath }}</span>
              </div>
              <button class="gear-btn" (click)="openConfig(workspace)" aria-label="Configure workspace">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <svg class="row-chevron" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   (click)="openWorkspace(workspace.id)">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px 28px;
        color: var(--app-text);
        height: 100%;
        overflow-y: auto;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
      .add-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: transparent;
        color: var(--theme-primary);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .add-btn:hover {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        border-color: var(--theme-primary);
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .modal {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 12px;
        padding: 28px;
        width: 440px;
        max-width: 90vw;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideUp {
        from { transform: translateY(16px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .modal h3 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 20px;
        color: var(--app-text);
        margin-top: 0;
      }
      .form-group {
        margin-bottom: 16px;
      }
      .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text-muted);
        margin-bottom: 6px;
      }
      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: all 0.15s;
      }
      .form-group input::placeholder {
        color: var(--app-text-muted);
        opacity: 0.4;
      }
      .form-group input:focus,
      .form-group select:focus {
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary), transparent 85%);
      }
      .form-group select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 32px;
        cursor: pointer;
      }
      .form-group select option {
        background: var(--app-surface);
        color: var(--app-text);
      }

      .input-with-button {
        display: flex;
        gap: 8px;
      }
      .input-with-button input {
        flex: 1;
      }
      .browse-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 12px;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .browse-btn:hover {
        border-color: var(--theme-primary);
      }
      .browse-btn svg {
        color: var(--theme-primary);
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }
      .cancel-btn {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .cancel-btn:hover {
        background: var(--app-background);
      }
      .confirm-btn {
        padding: 8px 20px;
        background-color: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .confirm-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .confirm-btn:hover:not(:disabled) {
        background-color: var(--theme-primary-hover);
      }

      /* Empty state */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60%;
        color: var(--app-text-muted);
        gap: 12px;
        opacity: 0.5;
      }
      .empty-state svg {
        color: var(--theme-primary);
        opacity: 0.6;
      }
      .empty-state p {
        font-size: 16px;
        color: var(--app-text);
        font-weight: 600;
        margin: 0;
      }
      .empty-hint {
        font-size: 13px;
        color: var(--app-text-muted);
      }

      /* Workspace list */
      .workspace-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workspace-row {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 12px 0 0;
        border-radius: 8px;
        transition: background-color 0.12s;
      }
      .workspace-row:hover {
        background: var(--app-surface);
      }
      .row-main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
        padding: 10px 0 10px 12px;
        cursor: pointer;
      }
      .row-icon {
        flex-shrink: 0;
        color: var(--theme-primary);
        opacity: 0.7;
      }
      .row-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--app-text);
        white-space: nowrap;
      }
      .row-path {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        color: var(--app-text-muted);
        opacity: 0.6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Gear button */
      .gear-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--app-text-muted);
        opacity: 0;
        cursor: pointer;
        transition: all 0.15s;
      }
      .workspace-row:hover .gear-btn {
        opacity: 0.5;
      }
      .gear-btn:hover {
        opacity: 1 !important;
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
      }

      .row-chevron {
        flex-shrink: 0;
        color: var(--app-text-muted);
        opacity: 0.3;
        cursor: pointer;
      }
      .workspace-row:hover .row-chevron {
        opacity: 0.6;
      }
    `,
  ],
})
export class WorkspacesComponent implements OnInit {
  showAddForm = false;
  newName = '';
  newFolderPath = '';

  // Configure modal
  configWorkspace: Workspace | null = null;
  configDirty = false;
  editorTools: Tool[] = [];
  taskTools: Tool[] = [];
  configOrganizations: string[] = [];
  configProjects: { externalId: string; name: string }[] = [];

  constructor(
    public workspaceService: WorkspaceService,
    private toolSettingsService: ToolSettingsService,
    private projectsService: ProjectsService,
    private router: Router
  ) {
    this.workspaceService.loadWorkspaces();
  }

  async ngOnInit(): Promise<void> {
    localStorage.removeItem('chadscopilot_last_workspace_id');
    await this.toolSettingsService.loadTools();
    this.editorTools = this.toolSettingsService.tools.filter(t => t.toolType === 'editor');
    this.taskTools = this.toolSettingsService.tools.filter(
      t => t.toolType === 'project management' || t.toolType === 'repository'
    );
  }

  async addWorkspace(): Promise<void> {
    const name = this.newName.trim();
    const folderPath = this.newFolderPath.trim();
    if (!name || !folderPath) return;

    const workspace = await this.workspaceService.addWorkspace(name, folderPath);
    this.closeModal();
    this.router.navigate(['/workspaces', workspace.id]);
  }

  async pickFolder(): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.selectDirectory) {
      const path = await electronAPI.selectDirectory();
      if (path) {
        this.newFolderPath = path;
        if (!this.newName.trim()) {
          const parts = path.split(/[/\\]/);
          const folderName = parts[parts.length - 1] || parts[parts.length - 2];
          if (folderName) {
            this.newName = folderName;
          }
        }
      }
    }
  }

  closeModal(): void {
    this.showAddForm = false;
    this.newName = '';
    this.newFolderPath = '';
  }

  openWorkspace(id: string): void {
    this.router.navigate(['/workspaces', id]);
  }

  async openConfig(workspace: Workspace): Promise<void> {
    this.configWorkspace = { ...workspace };
    this.configDirty = false;
    this.configOrganizations = [];
    this.configProjects = [];
    if (workspace.taskToolId) {
      await this.loadOrganizationsForTool(workspace.taskToolId);
      if (workspace.taskOrganization) {
        await this.loadProjectsForOrg(workspace.taskToolId, workspace.taskOrganization);
      }
    }
  }

  closeConfig(): void {
    this.configWorkspace = null;
    this.configDirty = false;
    this.configOrganizations = [];
    this.configProjects = [];
  }

  async onTaskToolChange(toolId: string): Promise<void> {
    if (!this.configWorkspace) return;
    this.configWorkspace.taskToolId = toolId;
    this.configWorkspace.taskOrganization = '';
    this.configWorkspace.taskToolExternalId = '';
    this.configDirty = true;
    this.configOrganizations = [];
    this.configProjects = [];
    if (toolId) {
      await this.loadOrganizationsForTool(toolId);
      // Auto-select if only one org
      if (this.configOrganizations.length === 1) {
        this.configWorkspace.taskOrganization = this.configOrganizations[0];
        await this.loadProjectsForOrg(toolId, this.configOrganizations[0]);
        if (this.configProjects.length === 1) {
          this.configWorkspace.taskToolExternalId = this.configProjects[0].externalId;
        }
      }
    }
  }

  async onOrgChange(org: string): Promise<void> {
    if (!this.configWorkspace) return;
    this.configWorkspace.taskOrganization = org;
    this.configWorkspace.taskToolExternalId = '';
    this.configDirty = true;
    this.configProjects = [];
    if (org && this.configWorkspace.taskToolId) {
      await this.loadProjectsForOrg(this.configWorkspace.taskToolId, org);
      if (this.configProjects.length === 1) {
        this.configWorkspace.taskToolExternalId = this.configProjects[0].externalId;
      }
    }
  }

  private async loadOrganizationsForTool(toolId: string): Promise<void> {
    const projects = await this.projectsService.getByToolId(toolId);
    const orgs = new Set<string>();
    for (const p of projects) {
      if (p.organizationId) orgs.add(p.organizationId);
    }
    // Also check the tool's own organization field
    const tool = this.taskTools.find(t => t.id === toolId);
    if (tool?.organization) orgs.add(tool.organization);
    this.configOrganizations = [...orgs];
  }

  private async loadProjectsForOrg(toolId: string, org: string): Promise<void> {
    const projects = await this.projectsService.getByToolId(toolId);
    this.configProjects = projects
      .filter(p => p.organizationId === org)
      .map(p => ({ externalId: p.externalId, name: p.name }));
  }

  async saveConfig(): Promise<void> {
    if (!this.configWorkspace || !this.configDirty) return;
    await this.workspaceService.updateWorkspace(this.configWorkspace.id, {
      editorToolId: this.configWorkspace.editorToolId,
      taskToolId: this.configWorkspace.taskToolId,
      taskOrganization: this.configWorkspace.taskOrganization,
      taskToolExternalId: this.configWorkspace.taskToolExternalId,
    });
    this.closeConfig();
  }
}
