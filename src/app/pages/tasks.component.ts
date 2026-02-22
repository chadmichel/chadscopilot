import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService, Task } from '../services/tasks.service';
import { ProjectsService, Project } from '../services/projects.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Tasks</h2>
        <select
          class="project-filter"
          [(ngModel)]="selectedProjectId"
        >
          <option value="all">All Projects</option>
          @for (project of projects; track project.id) {
            <option [value]="project.externalId">{{ project.name }}</option>
          }
        </select>
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
        <div class="board">
          <!-- Backlog -->
          <div class="column">
            <div class="column-header">
              <span class="column-title">Backlog</span>
              <span class="column-count">{{ backlogTasks.length }}</span>
            </div>
            <div class="column-body">
              @for (task of backlogTasks; track task.id) {
                <div class="task-card pending">
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
            <div class="column-body">
              @for (task of inProgressTasks; track task.id) {
                <div class="task-card in-progress">
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
            <div class="column-body">
              @for (task of completeTasks; track task.id) {
                <div class="task-card done">
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
        overflow: hidden;
      }

      /* Columns */
      .column {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
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
    `,
  ],
})
export class TasksComponent implements OnInit {
  loading = true;
  selectedProjectId = 'all';
  projects: Project[] = [];

  private allTasks: Task[] = [];
  private projectNameCache = new Map<string, string>();

  constructor(
    private tasksService: TasksService,
    private projectsService: ProjectsService,
  ) {}

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

  private parseGhProjectId(task: Task): string {
    try {
      const extra = JSON.parse(task.extra);
      return extra.githubProjectId || '';
    } catch {
      return '';
    }
  }
}
