import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TasksService, Task } from '../services/tasks.service';
import { ProjectsService, Project } from '../services/projects.service';
import { ToolSettingsService } from '../services/tool-settings.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <select
            class="project-filter"
            [(ngModel)]="selectedProjectId"
          >
            <option value="all">All Projects</option>
            @for (project of projects; track project.id) {
              <option [value]="project.externalId">{{ project.name }}</option>
            }
          </select>
          <button 
            class="sync-btn" 
            (click)="sync()" 
            [disabled]="syncing"
            title="Sync tasks from GitHub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" stroke-width="2.5" [class.spinning]="syncing">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            {{ syncing ? 'Syncing...' : 'Sync' }}
          </button>
        </div>
      </div>

      @if (filteredTasks.length === 0 && !loading) {
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <h3>No tasks yet</h3>
          <p>Sync a GitHub project from the Tools page to see tasks here.</p>
        </div>
      } @else {
        <div class="board" cdkDropListGroup>
          <!-- Backlog -->
          <div class="column">
            <div class="column-header">
              <span class="column-title">Backlog</span>
              <span class="column-count">{{ backlogTasks.length }}</span>
            </div>
            <div 
              class="column-body" 
              cdkDropList 
              [cdkDropListData]="backlogTasks"
              (cdkDropListDropped)="onDrop($event, 'pending')"
            >
              @for (task of backlogTasks; track task.id) {
                <div class="task-card pending" cdkDrag [cdkDragData]="task" (click)="showTaskDetail(task)">
                  <div class="task-title">{{ task.title }}</div>
                  @if (task.description) {
                    <div class="task-desc">{{ task.description }}</div>
                  }
                  @if (getProjectName(task); as projectName) {
                    <span class="task-project">{{ projectName }}</span>
                  }
                </div>
              }
              @if (backlogTasks.length === 0) {
                <div class="column-empty">No tasks</div>
              }
            </div>
          </div>

          <!-- In Progress -->
          <div class="column">
            <div class="column-header">
              <span class="column-title">In Progress</span>
              <span class="column-count">{{ inProgressTasks.length }}</span>
            </div>
            <div 
              class="column-body" 
              cdkDropList 
              [cdkDropListData]="inProgressTasks"
              (cdkDropListDropped)="onDrop($event, 'in_progress')"
            >
              @for (task of inProgressTasks; track task.id) {
                <div class="task-card in-progress" cdkDrag [cdkDragData]="task" (click)="showTaskDetail(task)">
                  <div class="task-title">{{ task.title }}</div>
                  @if (task.description) {
                    <div class="task-desc">{{ task.description }}</div>
                  }
                  @if (getProjectName(task); as projectName) {
                    <span class="task-project">{{ projectName }}</span>
                  }
                </div>
              }
              @if (inProgressTasks.length === 0) {
                <div class="column-empty">No tasks</div>
              }
            </div>
          </div>

          <!-- Complete -->
          <div class="column">
            <div class="column-header">
              <span class="column-title">Complete</span>
              <span class="column-count">{{ completeTasks.length }}</span>
            </div>
            <div 
              class="column-body" 
              cdkDropList 
              [cdkDropListData]="completeTasks"
              (cdkDropListDropped)="onDrop($event, 'done')"
            >
              @for (task of completeTasks; track task.id) {
                <div class="task-card done" cdkDrag [cdkDragData]="task" (click)="showTaskDetail(task)">
                  <div class="task-title">{{ task.title }}</div>
                  @if (task.description) {
                    <div class="task-desc">{{ task.description }}</div>
                  }
                  @if (getProjectName(task); as projectName) {
                    <span class="task-project">{{ projectName }}</span>
                  }
                </div>
              }
              @if (completeTasks.length === 0) {
                <div class="column-empty">No tasks</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Task Detail Dialog -->
      @if (selectedTask) {
        <div class="dialog-overlay" (click)="closeTaskDetail()">
          <div class="dialog task-dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Task Details</h3>
              <button class="dialog-close" (click)="closeTaskDetail()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="dialog-body">
              <div class="detail-section">
                <div class="detail-label">Title</div>
                <div class="detail-value title-val">{{ selectedTask.title }}</div>
              </div>

              @if (selectedTask.description) {
                <div class="detail-section">
                  <div class="detail-label">Description</div>
                  <div class="detail-value desc-val">{{ selectedTask.description }}</div>
                </div>
              }

              <div class="detail-grid">
                <div class="detail-section">
                  <div class="detail-label">Status</div>
                  <div class="detail-value">
                    <span class="status-badge" [class]="selectedTask.status">
                      {{ selectedTask.status === 'in_progress' ? 'In Progress' : (selectedTask.status | titlecase) }}
                    </span>
                  </div>
                </div>
                @if (getProjectName(selectedTask); as projectName) {
                  <div class="detail-section">
                    <div class="detail-label">Project</div>
                    <div class="detail-value">{{ projectName }}</div>
                  </div>
                }
              </div>

              @let ghUrl = getGithubUrl(selectedTask);
              <div class="dialog-footer">
                @if (ghUrl) {
                  <button class="btn-github" (click)="openInGithub(ghUrl)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                    View on GitHub
                  </button>
                }
                <button class="btn-close" (click)="closeTaskDetail()">Close</button>
              </div>
            </div>
          </div>
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
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-shrink: 0;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }

      /* Project filter dropdown */
      .project-filter {
        padding: 7px 32px 7px 12px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        min-width: 180px;
        transition: border-color 0.15s;
      }
      .project-filter:hover {
        border-color: var(--theme-primary);
      }
      .project-filter:focus {
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary), transparent 85%);
      }
      .project-filter option {
        background: var(--app-surface);
        color: var(--app-text);
      }

      .sync-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .sync-btn:hover:not(:disabled) {
        border-color: var(--theme-primary);
        color: var(--theme-primary);
      }
      .sync-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .spinning {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Empty state */
      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--app-text-muted);
        gap: 8px;
      }
      .empty-state svg {
        opacity: 0.3;
        margin-bottom: 8px;
      }
      .empty-state h3 {
        font-size: 16px;
        font-weight: 600;
        color: var(--app-text);
        margin: 0;
      }
      .empty-state p {
        font-size: 13px;
        margin: 0;
      }

      /* Board layout */
      .board {
        display: flex;
        gap: 16px;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 8px; /* Space for horizontal scrollbar */
      }

      /* Columns */
      .column {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 300px;
        min-height: 0;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 10px;
        overflow: hidden;
      }
      .column-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .column-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--app-text);
      }
      .column-count {
        font-size: 11px;
        font-weight: 600;
        color: var(--app-text-muted);
        background: var(--app-surface);
        padding: 1px 8px;
        border-radius: 10px;
        border: 1px solid var(--app-border);
      }
      .column-body {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .column-empty {
        text-align: center;
        padding: 24px 12px;
        font-size: 12px;
        color: var(--app-text-muted);
        opacity: 0.5;
      }

      /* Task cards */
      .task-card {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        padding: 12px 14px;
        border-left: 3px solid var(--app-text-muted);
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .task-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
      .task-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--app-text);
        line-height: 1.4;
      }
      .task-desc {
        font-size: 12px;
        color: var(--app-text-muted);
        margin-top: 6px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .task-project {
        display: inline-block;
        margin-top: 8px;
        font-size: 10px;
        font-weight: 600;
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
        padding: 2px 8px;
        border-radius: 4px;
      }

      .cdk-drag-preview {
        box-sizing: border-box;
        border-radius: 8px;
        box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                    0 8px 10px 1px rgba(0, 0, 0, 0.14),
                    0 3px 14px 2px rgba(0, 0, 0, 0.12);
        background: var(--app-surface);
        padding: 12px 14px;
        border-left: 3px solid var(--theme-primary);
        z-index: 1000;
        pointer-events: none;
      }
      .cdk-drag-placeholder {
        opacity: 0.3;
      }
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .column-body.cdk-drop-list-dragging .task-card:not(.cdk-drag-placeholder) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      /* Dialog Styles */
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 24px;
      }
      .dialog {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 12px;
        width: 100%;
        max-width: 550px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        animation: dialog-show 0.2s ease-out;
      }
      @keyframes dialog-show {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .dialog-header {
        padding: 18px 24px;
        border-bottom: 1px solid var(--app-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .dialog-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }
      .dialog-close {
        background: transparent;
        border: none;
        color: var(--app-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        transition: all 0.15s;
      }
      .dialog-close:hover {
        background: var(--app-background);
        color: var(--app-text);
      }
      .dialog-body {
        padding: 24px;
        overflow-y: auto;
      }
      .detail-section {
        margin-bottom: 20px;
      }
      .detail-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--app-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .detail-value {
        font-size: 14px;
        line-height: 1.5;
        color: var(--app-text);
      }
      .title-val {
        font-size: 18px;
        font-weight: 600;
      }
      .desc-val {
        white-space: pre-wrap;
        background: var(--app-background);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--app-border);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .status-badge.pending { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
      .status-badge.in_progress { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
      .status-badge.done { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

      .dialog-footer {
        margin-top: 12px;
        padding-top: 24px;
        border-top: 1px solid var(--app-border);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .btn-close {
        padding: 10px 20px;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        color: var(--app-text);
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-close:hover {
        border-color: var(--theme-primary);
        color: var(--theme-primary);
      }
      .btn-github {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: #24292f;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .btn-github:hover {
        opacity: 0.9;
      }
    `,
  ],
})
export class TasksComponent implements OnInit {
  loading = true;
  syncing = false;
  selectedProjectId = 'all';
  projects: Project[] = [];
  selectedTask: Task | null = null;

  private allTasks: Task[] = [];
  private projectNameCache = new Map<string, string>();

  constructor(
    private tasksService: TasksService,
    private projectsService: ProjectsService,
    private toolSettingsService: ToolSettingsService,
  ) { }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.tasksService.loadTasks(),
      this.projectsService.loadProjects(),
    ]);
    this.allTasks = this.tasksService.tasks;
    this.projects = this.projectsService.projects;

    // Build project name lookup
    for (const p of this.projects) {
      this.projectNameCache.set(p.externalId, p.name);
    }

    this.loading = false;
  }

  get filteredTasks(): Task[] {
    if (this.selectedProjectId === 'all') return this.allTasks;
    return this.allTasks.filter((t) => {
      const ghProjectId = this.parseGhProjectId(t);
      return ghProjectId === this.selectedProjectId;
    });
  }

  get backlogTasks(): Task[] {
    return this.filteredTasks.filter((t) => t.status === 'pending');
  }

  get inProgressTasks(): Task[] {
    return this.filteredTasks.filter((t) => t.status === 'in_progress');
  }

  get completeTasks(): Task[] {
    return this.filteredTasks.filter((t) => t.status === 'done');
  }

  getProjectName(task: Task): string {
    const ghProjectId = this.parseGhProjectId(task);
    if (!ghProjectId) return '';
    return this.projectNameCache.get(ghProjectId) || '';
  }

  showTaskDetail(task: Task) {
    this.selectedTask = task;
  }

  closeTaskDetail() {
    this.selectedTask = null;
  }

  getGithubUrl(task: Task): string | null {
    try {
      const extra = JSON.parse(task.extra);
      return extra.url || null;
    } catch {
      return null;
    }
  }

  openInGithub(url: string) {
    (window as any).electronAPI.openExternal(url);
  }

  private parseGhProjectId(task: Task): string {
    try {
      const extra = JSON.parse(task.extra);
      return extra.githubProjectId || '';
    } catch {
      return '';
    }
  }

  async sync(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const electron = (window as any).electronAPI;
      if (!electron?.githubSyncProject) return;

      // Load tools to get tokens
      await this.toolSettingsService.loadTools();

      const projectsToSync = this.selectedProjectId === 'all'
        ? this.projects
        : this.projects.filter(p => p.externalId === this.selectedProjectId);

      for (const project of projectsToSync) {
        const tool = this.toolSettingsService.tools.find(t => t.id === project.toolId);
        if (!tool || !tool.token || !tool.isEnabled) continue;

        try {
          // Note: main.ts uses project.externalId as projectId, p.name as title, 
          // p.organizationId as organization.
          // projectNumber seems optional or unused in github.service.ts but required by IPC.
          // We don't have projectNumber in Project interface currently, passing 0.
          await electron.githubSyncProject(
            tool.token,
            project.externalId,
            project.name,
            0,
            tool.id,
            project.organizationId
          );
        } catch (err) {
          console.error(`Failed to sync project ${project.name}:`, err);
        }
      }

      // Reload tasks after sync
      await this.tasksService.loadTasks();
      this.allTasks = this.tasksService.tasks;
    } finally {
      this.syncing = false;
    }
  }

  async onDrop(event: CdkDragDrop<Task[]>, newStatus: string) {
    if (event.previousContainer === event.container) return;

    const task = event.item.data as Task;
    const oldStatus = task.status;

    // 1. Update local database
    await this.tasksService.updateTask(task.id, { status: newStatus });

    // 2. Update local state immediately for visual feedback
    task.status = newStatus;

    // 3. Update GitHub if applicable
    const ghProjectId = this.parseGhProjectId(task);
    if (ghProjectId && task.externalId) {
      if (this.toolSettingsService.tools.length === 0) {
        await this.toolSettingsService.loadTools();
      }
      const tool = this.toolSettingsService.tools.find(t => t.id === task.toolId);
      if (tool && tool.token) {
        const electron = (window as any).electronAPI;
        try {
          await electron?.githubUpdateItemStatus?.(
            tool.token,
            ghProjectId,
            task.externalId,
            newStatus
          );
        } catch (err) {
          console.error('Failed to update GitHub status:', err);
        }
      }
    }
  }
}
