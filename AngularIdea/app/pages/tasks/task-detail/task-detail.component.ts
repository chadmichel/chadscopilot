import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Observable, of, map, tap } from 'rxjs';
import { ItemDetailComponent } from '../../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../../components/item-detail/item-detail.types';
import {
  ProcessResult,
  QueryOptions,
  SelectOption,
} from '../../../components/common-dto/query.dto';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../../services/task.service';
import { TaskDto, TaskStatus } from '../../../dto/task.dto';
import { ProjectService } from '../../../services/project.service';

export interface TaskDtoStub {
  title: string;
  description?: string;
  projectId?: string;
  status: 'backlog' | 'ondeck' | 'inprocess' | 'complete';
  priority?: 'p0' | 'p1' | 'p2' | 'p3';
  dueAt?: Date;
  tags?: string;
  boardId?: string;
}

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class TaskDetailComponent {
  private originReturnUrl?: string;

  detailConfig: ItemDetailConfig = {
    header: 'Task',
    isEditable: true,
    supportsAdd: true,
    supportsDelete: false,
    updateSuccessMessage: 'Task updated',
    createSuccessMessage: 'Task created',
    breadcrumbField: 'title',
    onCancel: () => this.navigateBackToOrigin(),
    customToolbarItems: [
      {
        label: 'Back to Board',
        icon: 'pi pi-arrow-left',
        onClick: () => this.navigateBackToBoard(),
      },
    ],
    formLayout: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'projectId',
        label: 'Project',
        type: 'select',
        required: true,
        loadOptions: () => this.loadProjectOptions(),
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Backlog', value: 'backlog' },
          { label: 'OnDeck', value: 'ondeck' },
          { label: 'InProcess', value: 'inprocess' },
          { label: 'Complete', value: 'complete' },
        ],
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { label: 'P0', value: 'p0' },
          { label: 'P1', value: 'p1' },
          { label: 'P2', value: 'p2' },
          { label: 'P3', value: 'p3' },
        ],
      },
      { key: 'dueAt', label: 'Due', type: 'date' },
      {
        key: 'tags',
        label: 'Tags',
        type: 'text',
        format: 'Comma-separated',
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['taskId'],
        isNew: params['taskId'] === 'new',
      }),
      loadItem: (params: QueryOptions): Observable<TaskDtoStub> => {
        if (params.isNew) {
          const status = (this.route.snapshot.queryParams['status'] ||
            'backlog') as TaskStatus;
          const boardId = this.route.snapshot.queryParams['boardId'] as
            | string
            | undefined;
          const projectId =
            (this.route.snapshot.queryParams['projectId'] as string | undefined) ||
            this.safeGetLastProjectId() ||
            undefined;

          const base: TaskDtoStub = {
            title: '',
            description: '',
            projectId,
            status,
            priority: 'p2',
            dueAt: undefined,
            tags: '',
            boardId,
          };

          // If no project was provided, pick the first available project so the dropdown is populated.
          if (!projectId) {
            return this.projectService.getProjects({ take: 200, skip: 0 }).pipe(
              map((res) => {
                const firstId = (res.items || [])?.[0]?.id;
                return { ...base, projectId: firstId || undefined };
              })
            );
          }

          return of(base);
        }

        return this.taskService.getTask(params.id || '').pipe(
          map((t) => ({
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueAt: t.dueAt ? new Date(t.dueAt) : undefined,
            tags: (t.tags || []).join(','),
            boardId: t.boardId,
            projectId: t.projectId,
          }))
        );
      },
      createItem: (query: QueryOptions, item: any): Observable<ProcessResult> => {
        const dto = this.formToDto(item);
        return this.taskService.createTask(dto).pipe(
          tap((result) => {
            if (!result?.success) return;

            // ItemDetailComponent navigates to /tasks/:id after create.
            // We want to return to where the user came from after save, so we schedule a follow-up navigation.
            setTimeout(() => {
              this.navigateBackToOrigin();
            }, 0);
          })
        );
      },
      updateItem: (query: QueryOptions, item: any): Observable<ProcessResult> => {
        const dto = this.formToDto(item);
        return this.taskService.updateTask(query.id || '', dto).pipe(
          tap((result) => {
            if (!result?.success) return;
            // After updating, return to where we came from.
            setTimeout(() => {
              this.navigateBackToOrigin();
            }, 0);
          })
        );
      },
      deleteItem: (query: QueryOptions): Observable<ProcessResult> =>
        of({ id: query.id || 'unknown', success: true, message: 'Deleted (stub)' }),
    },
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private projectService: ProjectService
  ) {
    // Preserve the originating URL across internal route changes like:
    // /tasks/new -> (save) -> /tasks/:id
    // Angular reuses the same component instance, but history.state changes.
    try {
      const state: any = typeof history !== 'undefined' ? (history.state as any) : undefined;
      const returnUrl = state?.returnUrl as string | undefined;
      if (returnUrl && typeof returnUrl === 'string') {
        this.originReturnUrl = returnUrl;
      }
    } catch {
      // ignore
    }
  }

  private formToDto(item: any): Partial<TaskDto> {
    const rawTags = String(item.tags || '');
    const tags = rawTags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const statusFromForm =
      typeof item.status === 'string' ? item.status : (item.status?.value as any);
    const statusFromRoute = this.route.snapshot.queryParams['status'] as
      | TaskStatus
      | undefined;

    return {
      title: item.title,
      description: item.description,
      projectId: item.projectId,
      status: (statusFromForm || statusFromRoute || 'backlog') as any,
      priority: item.priority,
      dueAt: item.dueAt ? new Date(item.dueAt).toISOString() : undefined,
      tags,
      boardId: item.boardId,
    };
  }

  private safeGetLastBoardId(): string | null {
    try {
      return localStorage.getItem('whenisdone_last_board_id');
    } catch {
      return null;
    }
  }

  private safeGetLastProjectId(): string | null {
    try {
      return localStorage.getItem('whenisdone_last_project_id');
    } catch {
      return null;
    }
  }

  private navigateBackToBoard(): void {
    const boardId =
      (this.route.snapshot.queryParams['boardId'] as string | undefined) ||
      this.safeGetLastBoardId() ||
      'all';
    this.router.navigate(['/boards', boardId]);
  }

  private navigateBackToOrigin(): void {
    const returnUrl = this.originReturnUrl;

    // Prefer explicit returnUrl if provided by the originating page.
    if (returnUrl && typeof returnUrl === 'string' && !returnUrl.startsWith('/tasks')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    // Otherwise, fall back to browser history if available.
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      window.history.back();
      return;
    }

    // Final fallback: go back to board context.
    this.navigateBackToBoard();
  }

  private loadProjectOptions(): Observable<SelectOption[]> {
    return this.projectService.getProjects({ take: 200, skip: 0 }).pipe(
      map((res) =>
        (res.items || []).map((it: any) => ({
          label: it.item?.name || it.id,
          value: it.id,
        }))
      )
    );
  }
}

