import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DashboardConfig } from '../../components/dashboard/dashboard.types';
import { WorkEngineService } from '../../services/work-engine.service';
import { TaskDto } from '../../dto/task.dto';
import { TaskService } from '../../services/task.service';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DashboardComponent, ToastModule, DialogModule, DividerModule, TagModule, ButtonModule],
  providers: [MessageService],
  template: `
    <pb-dashboard
      #dashboard
      [config]="dashboardConfig"
    ></pb-dashboard>

    <p-dialog 
      [(visible)]="displayDialog" 
      [modal]="true" 
      [header]="selectedTask?.title || 'Task Details'"
      [style]="{ width: '450px' }"
      [draggable]="false"
      [resizable]="false"
    >
      <div *ngIf="selectedTask" class="quick-view-content">
        <div class="flex justify-content-between align-items-center mb-3">
          <p-tag [value]="selectedTask.status.toUpperCase()" [severity]="getStatusSeverity(selectedTask.status)"></p-tag>
          <p-tag *ngIf="selectedTask.priority" [value]="selectedTask.priority.toUpperCase()" severity="info"></p-tag>
        </div>
        
        <div class="mb-3" *ngIf="selectedTask.description">
          <p class="text-secondary">{{ selectedTask.description }}</p>
        </div>

        <p-divider></p-divider>

        <div class="mb-3">
          <div class="flex align-items-center mb-2">
            <i class="pi pi-calendar mr-2"></i>
            <span>Due: {{ selectedTask.dueAt ? (selectedTask.dueAt | date:'mediumDate') : 'No due date' }}</span>
          </div>
          <div class="flex align-items-center mb-2" *ngIf="selectedTask.tags && selectedTask.tags.length">
            <i class="pi pi-tag mr-2"></i>
            <div class="flex gap-2">
              <p-tag *ngFor="let tag of selectedTask.tags" [value]="tag" severity="secondary"></p-tag>
            </div>
          </div>
        </div>

        <div class="flex justify-content-end mt-4">
          <p-button label="Open Full View" icon="pi pi-external-link" [text]="true" (onClick)="openTask(selectedTask.id!)"></p-button>
          <p-button label="Close" icon="pi pi-times" severity="secondary" (onClick)="displayDialog = false"></p-button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class HomeComponent implements OnInit {
  @ViewChild('dashboard') dashboard!: DashboardComponent;

  displayDialog: boolean = false;
  selectedTask: TaskDto | null = null;

  dashboardConfig: DashboardConfig = {
    header: 'Work Dashboard',
    subheader: 'Focused view of your active and upcoming tasks.',
    refreshInterval: 60000, // Refresh every minute
    items: [
      // Working On Table
      {
        type: 'table',
        colSpan: 12,
        data: {
          title: '🔥 What should I be working on?',
          columns: [
            { field: 'title', header: 'Task', type: 'text' },
            { field: 'status', header: 'Status', type: 'text' },
            { field: 'priority', header: 'Priority', type: 'text' },
            { field: 'dueAt', header: 'Due Date', type: 'date' },
          ],
          onRowSelect: (task: TaskDto) => this.showQuickView(task),
          rowActions: [
            {
              icon: 'pi pi-check',
              severity: 'success',
              tooltip: 'Mark as Done',
              onClick: (task: TaskDto) => this.markAsDone(task)
            }
          ],
          emptyMessage: 'Nothing specifically focused right now. Great job!',
        },
        loadItems: () => this.workEngine.getWorkingOn(),
      },
      // Up Next Table
      {
        type: 'table',
        colSpan: 12,
        data: {
          title: '⏭️ Up Next',
          columns: [
            { field: 'title', header: 'Task', type: 'text' },
            { field: 'priority', header: 'Priority', type: 'text' },
            { field: 'dueAt', header: 'Due Date', type: 'date' },
          ],
          onRowSelect: (task: TaskDto) => this.showQuickView(task),
          rowActions: [
            {
              icon: 'pi pi-check',
              severity: 'success',
              tooltip: 'Mark as Done',
              onClick: (task: TaskDto) => this.markAsDone(task)
            }
          ],
          emptyMessage: 'No tasks scheduled on deck.',
        },
        loadItems: () => this.workEngine.getUpNext(),
      },
      // Overdue Table
      {
        type: 'table',
        colSpan: 12,
        data: {
          title: '⚠️ Overdue Tasks',
          columns: [
            { field: 'title', header: 'Task', type: 'text' },
            { field: 'status', header: 'Status', type: 'text' },
            { field: 'dueAt', header: 'Overdue Since', type: 'date' },
          ],
          onRowSelect: (task: TaskDto) => this.showQuickView(task),
          rowActions: [
            {
              icon: 'pi pi-check',
              severity: 'success',
              tooltip: 'Mark as Done',
              onClick: (task: TaskDto) => this.markAsDone(task)
            }
          ],
          emptyMessage: 'No overdue tasks. You are on top of it!',
        },
        loadItems: () => this.workEngine.getOverdue(),
      },
    ],
    customToolbarItems: [
      {
        label: 'Boards',
        icon: 'pi pi-th-large',
        onClick: () => this.router.navigate(['/boards', 'all']),
      },
      {
        label: 'Projects',
        icon: 'pi pi-briefcase',
        onClick: () => this.router.navigate(['/projects']),
      },
      {
        label: 'Calendar',
        icon: 'pi pi-calendar',
        onClick: () => this.router.navigate(['/calendar']),
      },
      {
        label: 'AI Agent',
        icon: 'pi pi-comments',
        onClick: () => this.router.navigate(['/agent']),
      },
    ],
  };

  constructor(
    private router: Router,
    private messageService: MessageService,
    private workEngine: WorkEngineService,
    private taskService: TaskService
  ) { }

  ngOnInit() {
    // Dashboard initialization
  }

  private showQuickView(task: TaskDto): void {
    this.selectedTask = task;
    this.displayDialog = true;
  }

  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" {
    switch (status) {
      case 'complete': return 'success';
      case 'inprocess': return 'warn';
      case 'ondeck': return 'info';
      case 'backlog': return 'secondary';
      default: return 'secondary';
    }
  }

  openTask(taskId: string): void {
    this.displayDialog = false;
    this.router.navigate(['/tasks', taskId], {
      queryParams: { edit: true },
      state: { returnUrl: this.router.url },
    });
  }

  markAsDone(task: TaskDto): void {
    if (!task.id) return;

    this.taskService.updateTask(task.id, { status: 'complete' }).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task marked as done' });
          this.dashboard.loadAllDashboardData();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Failed to update task' });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred' });
      }
    });
  }
}

