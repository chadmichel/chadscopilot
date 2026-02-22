import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { ToolSettingsService, Tool } from '../services/tool-settings.service';
import { TasksService, Task } from '../services/tasks.service';
import { ProjectsService, Project } from '../services/projects.service';

type TabId = 'plan' | 'design' | 'tasks';

interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  template: `
    @if (workspace) {
      <div class="detail-container">
        <div class="detail-header">
          <button class="back-btn" (click)="goBack()" aria-label="Back to workspaces">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>{{ workspace.name }}</h2>
          <span class="path-badge">{{ workspace.folderPath }}</span>
          @if (editorTool) {
            <button class="editor-btn" (click)="openEditor()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              {{ editorTool.title }}
            </button>
          }
        </div>

        <div class="split-layout">
          <div class="agent-panel" [class.collapsed]="agentCollapsed">
            @if (!agentCollapsed) {
              <app-chat [workspaceId]="workspace.id" [folderPath]="workspace.folderPath"></app-chat>
            } @else {
              <div class="collapsed-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span>Agent</span>
              </div>
            }
            <button class="panel-toggle agent-toggle" (click)="agentCollapsed = !agentCollapsed"
                    [attr.aria-label]="agentCollapsed ? 'Expand agent' : 'Collapse agent'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                @if (agentCollapsed) {
                  <path d="M9 18l6-6-6-6"/>
                } @else {
                  <path d="M15 18l-6-6 6-6"/>
                }
              </svg>
            </button>
          </div>

          <div class="right-panel" [class.collapsed]="tabsCollapsed">
            @if (!tabsCollapsed) {
              <div class="tab-bar">
                @for (tab of tabs; track tab.id) {
                  <button
                    class="tab"
                    [class.active]="activeTab === tab.id"
                    (click)="activeTab = tab.id"
                  >{{ tab.label }}</button>
                }
              </div>

              <div class="tab-content">
                @switch (activeTab) {
                  @case ('plan') {
                    <div class="placeholder">
                      <p>Plan view coming soon.</p>
                    </div>
                  }
                  @case ('design') {
                    <div class="placeholder">
                      <p>Design view coming soon.</p>
                    </div>
                  }
                  @case ('tasks') {
                    @if (workspaceTasks.length === 0) {
                      <div class="placeholder">
                        @if (!workspace.taskToolId) {
                          <p>No task tool configured. Use the gear icon on the Workspaces page to set one.</p>
                        } @else if (!workspace.taskOrganization) {
                          <p>No organization selected. Configure one in workspace settings.</p>
                        } @else {
                          <p>No active tasks for this organization.</p>
                        }
                      </div>
                    } @else {
                      <div class="task-board">
                        <div class="task-column">
                          <div class="task-col-header">
                            <span class="task-col-title">Backlog</span>
                            <span class="task-col-count">{{ backlogTasks.length }}</span>
                          </div>
                          <div class="task-col-body">
                            @for (task of backlogTasks; track task.id) {
                              <div class="task-card pending">
                                <div class="task-card-title">{{ task.title }}</div>
                                @if (task.description) {
                                  <div class="task-card-desc">{{ task.description }}</div>
                                }
                              </div>
                            }
                            @if (backlogTasks.length === 0) {
                              <div class="task-col-empty">No tasks</div>
                            }
                          </div>
                        </div>
                        <div class="task-column">
                          <div class="task-col-header">
                            <span class="task-col-title">In Progress</span>
                            <span class="task-col-count">{{ inProgressTasks.length }}</span>
                          </div>
                          <div class="task-col-body">
                            @for (task of inProgressTasks; track task.id) {
                              <div class="task-card in-progress">
                                <div class="task-card-title">{{ task.title }}</div>
                                @if (task.description) {
                                  <div class="task-card-desc">{{ task.description }}</div>
                                }
                              </div>
                            }
                            @if (inProgressTasks.length === 0) {
                              <div class="task-col-empty">No tasks</div>
                            }
                          </div>
                        </div>
                        <div class="task-column">
                          <div class="task-col-header">
                            <span class="task-col-title">Complete</span>
                            <span class="task-col-count">{{ completeTasks.length }}</span>
                          </div>
                          <div class="task-col-body">
                            @for (task of completeTasks; track task.id) {
                              <div class="task-card done">
                                <div class="task-card-title">{{ task.title }}</div>
                                @if (task.description) {
                                  <div class="task-card-desc">{{ task.description }}</div>
                                }
                              </div>
                            }
                            @if (completeTasks.length === 0) {
                              <div class="task-col-empty">No tasks</div>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  }
                }
              </div>
            } @else {
              <div class="collapsed-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M16 13H8"/>
                  <path d="M16 17H8"/>
                  <path d="M10 9H8"/>
                </svg>
                <span>{{ activeTab | titlecase }}</span>
              </div>
            }
            <button class="panel-toggle tabs-toggle" (click)="tabsCollapsed = !tabsCollapsed"
                    [attr.aria-label]="tabsCollapsed ? 'Expand panel' : 'Collapse panel'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                @if (tabsCollapsed) {
                  <path d="M15 18l-6-6 6-6"/>
                } @else {
                  <path d="M9 18l6-6-6-6"/>
                }
              </svg>
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="not-found">
        <h2>Workspace not found</h2>
        <p>This workspace may have been removed.</p>
        <button class="back-link" (click)="goBack()">Back to Workspaces</button>
      </div>
    }
  `,
  styles: [
    `
      .detail-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      /* Header */
      .detail-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--app-text-muted);
        cursor: pointer;
        transition: background-color 0.15s, color 0.15s;
      }
      .back-btn:hover {
        background: var(--app-surface);
        color: var(--app-text);
      }
      h2 {
        font-size: 15px;
        font-weight: 600;
        color: var(--app-text);
        margin: 0;
      }
      .path-badge {
        font-size: 11px;
        color: var(--app-text-muted);
        background: var(--app-surface);
        padding: 3px 10px;
        border-radius: 4px;
        border: 1px solid var(--app-border);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
      }

      /* Editor button */
      .editor-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        padding: 6px 14px;
        background: transparent;
        color: var(--theme-primary);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .editor-btn:hover {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        border-color: var(--theme-primary);
      }

      /* Split layout */
      .split-layout {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      .agent-panel {
        flex: 1;
        min-width: 0;
        border-right: 1px solid var(--app-border);
        overflow: hidden;
        position: relative;
        transition: flex 0.2s ease;
      }
      .agent-panel.collapsed {
        flex: 0 0 44px;
        min-width: 44px;
      }
      .right-panel {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        transition: flex 0.2s ease;
      }
      .right-panel.collapsed {
        flex: 0 0 44px;
        min-width: 44px;
        border-left: none;
      }

      /* Collapsed label */
      .collapsed-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-top: 16px;
        color: var(--app-text-muted);
        opacity: 0.6;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .collapsed-label svg {
        color: var(--theme-primary);
        opacity: 0.7;
      }
      .collapsed-label span {
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }

      /* Panel toggle buttons */
      .panel-toggle {
        position: absolute;
        top: 8px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--app-border);
        border-radius: 4px;
        background: var(--app-surface);
        color: var(--app-text-muted);
        cursor: pointer;
        transition: color 0.15s, background-color 0.15s;
        z-index: 1;
      }
      .panel-toggle:hover {
        color: var(--app-text);
        background: var(--app-background);
      }
      .agent-toggle {
        right: 8px;
      }
      .agent-panel.collapsed .agent-toggle {
        right: auto;
        left: 50%;
        top: auto;
        bottom: 12px;
        transform: translateX(-50%);
      }
      .tabs-toggle {
        left: 8px;
      }
      .right-panel.collapsed .tabs-toggle {
        left: 50%;
        top: auto;
        bottom: 12px;
        transform: translateX(-50%);
      }

      /* Tabs */
      .tab-bar {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
        gap: 4px;
      }
      .tab {
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 500;
        color: var(--app-text-muted);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
      }
      .tab:hover {
        color: var(--app-text);
      }
      .tab.active {
        color: var(--theme-primary);
        border-bottom-color: var(--theme-primary);
      }

      /* Tab content */
      .tab-content {
        flex: 1;
        overflow: hidden;
      }
      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--app-text-muted);
        font-size: 14px;
      }

      /* Task board */
      .task-board {
        display: flex;
        gap: 12px;
        flex: 1;
        overflow: hidden;
        padding: 12px 16px;
      }
      .task-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .task-col-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .task-col-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--app-text);
      }
      .task-col-count {
        font-size: 10px;
        font-weight: 600;
        color: var(--app-text-muted);
        background: var(--app-surface);
        padding: 1px 7px;
        border-radius: 10px;
        border: 1px solid var(--app-border);
      }
      .task-col-body {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .task-col-empty {
        text-align: center;
        padding: 20px 8px;
        font-size: 11px;
        color: var(--app-text-muted);
        opacity: 0.5;
      }
      .task-card {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        padding: 10px 12px;
        border-left: 3px solid var(--app-text-muted);
      }
      .task-card.pending {
        border-left-color: var(--app-text-muted);
      }
      .task-card.in-progress {
        border-left-color: var(--theme-primary);
      }
      .task-card.done {
        border-left-color: #22c55e;
      }
      .task-card-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text);
        line-height: 1.4;
      }
      .task-card-desc {
        font-size: 11px;
        color: var(--app-text-muted);
        margin-top: 4px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Not found */
      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--app-text-muted);
        gap: 8px;
      }
      .not-found h2 {
        font-size: 18px;
        color: var(--app-text);
      }
      .not-found p {
        font-size: 14px;
        color: var(--app-text-muted);
      }
      .back-link {
        margin-top: 12px;
        padding: 8px 16px;
        background-color: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .back-link:hover {
        background-color: var(--theme-primary-hover);
      }
    `,
  ],
})
export class WorkspaceDetailComponent implements OnInit {
  workspace: Workspace | undefined;
  activeTab: TabId = 'plan';
  agentCollapsed = false;
  tabsCollapsed = false;
  editorTool: Tool | null = null;

  // Tasks for this workspace
  workspaceTasks: Task[] = [];

  tabs: Tab[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'design', label: 'Design' },
    { id: 'tasks', label: 'Tasks' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workspaceService: WorkspaceService,
    private toolSettingsService: ToolSettingsService,
    private tasksService: TasksService,
    private projectsService: ProjectsService,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.workspace = this.workspaceService.getWorkspace(id);
      if (this.workspace) {
        localStorage.setItem('chadscopilot_last_workspace_id', id);
        await this.loadEditorTool();
        await this.loadWorkspaceTasks();
      } else {
        localStorage.removeItem('chadscopilot_last_workspace_id');
      }
    }
  }

  get backlogTasks(): Task[] {
    return this.workspaceTasks.filter(t => t.status === 'pending');
  }

  get inProgressTasks(): Task[] {
    return this.workspaceTasks.filter(t => t.status === 'in_progress');
  }

  get completeTasks(): Task[] {
    return this.workspaceTasks.filter(t => t.status === 'done');
  }

  private async loadEditorTool(): Promise<void> {
    if (!this.workspace?.editorToolId) return;
    if (this.toolSettingsService.tools.length === 0) {
      await this.toolSettingsService.loadTools();
    }
    this.editorTool = this.toolSettingsService.tools.find(
      (t) => t.id === this.workspace!.editorToolId
    ) ?? null;
  }

  private async loadWorkspaceTasks(): Promise<void> {
    if (!this.workspace?.taskToolId || !this.workspace?.taskOrganization) return;

    // Load projects for this tool + organization
    const projects = await this.projectsService.getByToolId(this.workspace.taskToolId);
    const orgProjects = projects.filter(
      p => p.organizationId === this.workspace!.taskOrganization
    );
    const projectExternalIds = new Set(orgProjects.map(p => p.externalId));

    // Load all tasks and filter to this tool's projects
    await this.tasksService.loadTasks();
    this.workspaceTasks = this.tasksService.tasks.filter(task => {
      if (task.toolId !== this.workspace!.taskToolId) return false;
      try {
        const extra = JSON.parse(task.extra);
        return projectExternalIds.has(extra.githubProjectId);
      } catch {
        return false;
      }
    });
  }

  async openEditor(): Promise<void> {
    if (!this.editorTool || !this.workspace) return;
    const electron = (window as any).electronAPI;
    const title = this.editorTool.title.toLowerCase();
    const folderPath = this.workspace.folderPath;
    const cliPath = this.editorTool.localPath || undefined;

    if (title.includes('vs code') || title.includes('vscode') || title.includes('visual studio code')) {
      await electron?.vscodeOpen?.(folderPath, cliPath);
    } else if (title.includes('cursor')) {
      await electron?.cursorOpen?.(folderPath, cliPath);
    } else if (title.includes('antigravity')) {
      await electron?.antigravityOpen?.(folderPath, cliPath);
    }
  }

  goBack(): void {
    this.router.navigate(['/workspaces']);
  }
}
