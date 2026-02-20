import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QueryResult, QueryResultItem } from '../components/common-dto/query.dto';
import { TaskDto } from '../dto/task.dto';
import { ProcessResult } from '../components/common-dto/query.dto';
import { LocalStoreService } from './local-store.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(private store: LocalStoreService) {}

  /**
   * Load tasks for a board view. In mock mode this is backed by MSW handlers.
   * Board id "all" returns all visible tasks.
   */
  getBoardTasks(boardId: string): Observable<QueryResult<TaskDto>> {
    this.store.ensureSeeded();
    return of(this.getBoardTasksFromCache(boardId));
  }

  getTask(id: string): Observable<TaskDto> {
    this.store.ensureSeeded();
    const found = this.findTaskInCache(id);
    if (found) return of(found);
    return of({ id, title: id, status: 'backlog' } as any);
  }

  createTask(task: Partial<TaskDto>): Observable<ProcessResult> {
    this.store.ensureSeeded();
    const projectId = this.resolveProjectId(task);
    if (!projectId) {
      return of({
        success: false,
        id: 'missing_project',
        message: 'Project is required',
      });
    }

    const id = this.store.generateId('task');
    const now = new Date().toISOString();
    const dto: TaskDto = {
      title: task.title || 'New Task',
      description: task.description,
      status: (task.status as any) || 'backlog',
      priority: task.priority as any,
      boardId: task.boardId,
      projectId,
      tags: task.tags,
      dueAt: task.dueAt,
      sortOrder: task.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    this.upsertTaskInCache(projectId, id, dto);
    return of({ success: true, id, message: 'Saved locally' });
  }

  updateTask(id: string, task: Partial<TaskDto>): Observable<ProcessResult> {
    this.store.ensureSeeded();
    const existing = this.findTaskInCache(id);
    const projectId = task.projectId || existing?.projectId || this.resolveProjectId(task);
    if (!projectId) {
      return of({
        success: false,
        id,
        message: 'Project is required',
      });
    }

    const now = new Date().toISOString();
    const next: TaskDto = {
      ...(existing || ({} as TaskDto)),
      ...(task as any),
      projectId,
      updatedAt: now,
    };

    this.upsertTaskInCache(projectId, id, next);
    return of({ success: true, id, message: 'Saved locally' });
  }

  private getBoardTasksFromCache(boardId: string): QueryResult<TaskDto> {
    const all = this.getAllTasksFromCache();
    const filtered =
      boardId === 'all'
        ? all
        : {
            ...all,
            items: (all.items || []).filter((it) => it.item?.boardId === boardId),
          };

    // Sort for stable kanban UI
    const statusOrder: Record<string, number> = {
      backlog: 0,
      ondeck: 1,
      inprocess: 2,
      complete: 3,
    };
    const sorted = [...(filtered.items || [])].sort((a, b) => {
      const sa = statusOrder[a.item?.status as any] ?? 99;
      const sb = statusOrder[b.item?.status as any] ?? 99;
      if (sa !== sb) return sa - sb;
      return (a.item?.sortOrder ?? 0) - (b.item?.sortOrder ?? 0);
    });

    return {
      ...filtered,
      items: sorted,
      total: sorted.length,
      take: 200,
      skip: 0,
    };
  }

  private getAllTasksFromCache(): QueryResult<TaskDto> {
    const projects = this.store.getProjectsSnapshot();
    const projectIds = (projects?.items || []).map((it) => it.id).filter(Boolean);

    const mapById = new Map<string, QueryResultItem<TaskDto>>();
    for (const pid of projectIds) {
      const snap = this.store.getTasksSnapshot(pid);
      (snap?.items || []).forEach((it) => mapById.set(it.id, it));
    }

    const items = Array.from(mapById.values());
    return {
      items,
      total: items.length,
      take: 500,
      skip: 0,
    };
  }

  private findTaskInCache(id: string): TaskDto | null {
    const all = this.getAllTasksFromCache();
    const found = (all.items || []).find((it) => it.id === id);
    if (!found) return null;
    return { id: found.id, ...(found.item as any) } as TaskDto;
  }

  private upsertTaskInCache(projectId: string, id: string, task: TaskDto): void {
    this.store.upsertIntoCollection(this.store.tasksKey(projectId), id, task);
  }

  private resolveProjectId(task: Partial<TaskDto>): string | null {
    if (task.projectId) return task.projectId;
    // Best-effort: default to the first known project
    const projects = this.store.getProjectsSnapshot();
    const first = projects?.items?.[0]?.id;
    return first || null;
  }
}

