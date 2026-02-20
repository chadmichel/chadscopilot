import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { BackendService } from './backend.service';
import {
  QueryOptions,
  QueryResult,
  QueryResultItem,
} from '../components/common-dto/query.dto';
import { BoardDto } from '../dto/board.dto';
import { ProjectDto } from '../dto/project.dto';
import { TaskDto } from '../dto/task.dto';
import { environment } from '../../environments/environment';

export interface SyncBootstrapResponse {
  boards: QueryResult<BoardDto>;
  projects: QueryResult<ProjectDto>;
  tasks: QueryResult<TaskDto>;
  sync?: {
    serverTime?: string;
    nextCursor?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private readonly STORAGE_KEY = 'whenisdone_mock_sync_bootstrap_v1';

  private snapshotSubject = new BehaviorSubject<SyncBootstrapResponse | null>(
    null
  );
  snapshot$ = this.snapshotSubject.asObservable();

  constructor(private backend: BackendService) {
    // Cache-forward behavior: hydrate from persisted storage first
    this.loadFromStorage();
  }

  /**
   * Bootstrap a full dataset snapshot (mock mode) from the backend/MSW.
   */
  bootstrap(): Observable<SyncBootstrapResponse> {
    if (!environment.mock) {
      return of({
        boards: { items: [], total: 0, take: 0, skip: 0 },
        projects: { items: [], total: 0, take: 0, skip: 0 },
        tasks: { items: [], total: 0, take: 0, skip: 0 },
      });
    }

    const obs = this.backend.get<SyncBootstrapResponse>('sync/bootstrap');
    obs.subscribe({
      next: (data) => {
        this.snapshotSubject.next(data);
        this.saveToStorage(data);
      },
      error: () => {
        // Best-effort: keep whatever cached snapshot we already have
      },
    });
    return obs;
  }

  queryBoards(query: QueryOptions): Observable<QueryResult<BoardDto>> {
    const snap = this.snapshotSubject.value;
    if (!snap) {
      // Fallback if bootstrap hasn't run yet
      return this.backend.getQuery<BoardDto>('board', query);
    }
    return of(this.applyQuery(snap.boards, query));
  }

  queryProjects(query: QueryOptions): Observable<QueryResult<ProjectDto>> {
    const snap = this.snapshotSubject.value;
    if (!snap) {
      return this.backend.getQuery<ProjectDto>('project', query);
    }
    return of(this.applyQuery(snap.projects, query));
  }

  queryTasks(query: QueryOptions): Observable<QueryResult<TaskDto>> {
    const snap = this.snapshotSubject.value;
    if (!snap) {
      return this.backend.getQuery<TaskDto>('task', query);
    }
    return of(this.applyQuery(snap.tasks, query));
  }

  private applyQuery<T>(
    result: QueryResult<T>,
    query: QueryOptions
  ): QueryResult<T> {
    const take = query.take ?? result.take ?? 10;
    const skip = query.skip ?? result.skip ?? 0;
    const filter = (query.filter || '').toLowerCase().trim();

    let items = (result.items || []) as QueryResultItem<T>[];

    if (filter) {
      items = items.filter((it) =>
        JSON.stringify(it.item || {})
          .toLowerCase()
          .includes(filter)
      );
    }

    const paged = items.slice(skip, skip + take);
    return {
      items: paged,
      total: items.length,
      skip,
      take,
    };
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SyncBootstrapResponse;
      if (parsed?.boards && parsed?.projects && parsed?.tasks) {
        this.snapshotSubject.next(parsed);
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage(data: SyncBootstrapResponse): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

