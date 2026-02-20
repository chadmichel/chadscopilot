import { Injectable } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  from,
  of,
  switchMap,
  firstValueFrom,
  map,
} from 'rxjs';
import { environment } from '../../environments/environment';

import { BackendService } from './backend.service';
import { AuthService } from './auth.service';
import {
  QueryResult,
  QueryResultItem,
} from '../components/common-dto/query.dto';
import { BoardDto } from '../dto/board.dto';
import { ProjectDto } from '../dto/project.dto';
import { TaskDto } from '../dto/task.dto';
import { DayFact, MonthFact } from '../dto/fact.dto';

type SyncMeta = {
  serverTime?: string;
  nextCursor?: string;
};

type SyncDownResponse<T> = {
  items: Array<QueryResultItem<T>>;
  total?: number;
  take?: number;
  skip?: number;
  sync?: SyncMeta;
};

type TaskSyncMutation =
  | { upsert: { id: string; task: Partial<TaskDto> } }
  | { delete: { taskId: string } };

type BoardsSyncMutation =
  | { upsert: { id: string; board: Partial<BoardDto> } }
  | { delete: { boardId: string } };

type ProjectsSyncMutation =
  | { upsert: { id: string; project: Partial<ProjectDto> } }
  | { delete: { projectId: string } };

type DayFactsSyncMutation =
  | { upsert: { id: string; dayFact: Partial<DayFact> } }
  | { delete: { dayFactId: string } };

type MonthFactsSyncMutation =
  | { upsert: { id: string; monthFact: Partial<MonthFact> } }
  | { delete: { monthFactId: string } };

type TasksSyncUpRequest = {
  projectId: string;
  clientTime?: string;
  lastKnownCursor?: string;
  mutations: TaskSyncMutation[];
};

type GenericSyncUpRequest<TMutation> = {
  clientTime?: string;
  lastKnownCursor?: string;
  mutations: TMutation[];
};

type SyncUpResponse<T> = {
  applied: Array<QueryResultItem<T>>;
  failed: any[];
  sync?: SyncMeta;
};

type MutationQueue = {
  tasks: Record<string, TaskSyncMutation[]>; // keyed by projectId
  boards: BoardsSyncMutation[];
  projects: ProjectsSyncMutation[];
  dayFacts: DayFactsSyncMutation[];
  monthFacts: MonthFactsSyncMutation[];
};

export type SyncQueueEntityType = 'board' | 'project' | 'task' | 'dayFact' | 'monthFact';
export type SyncQueueOperation = 'upsert' | 'delete';

/**
 * UI-friendly representation of pending sync work.
 * One row per entity (board/project/task), aggregating multiple mutations.
 */
export interface SyncQueueUiItem {
  syncKey: string; // unique row key
  entityType: SyncQueueEntityType;
  operation: SyncQueueOperation;
  entityId: string;
  projectId?: string; // tasks
  boardId?: string; // tasks
  label: string; // display name/title
  mutationCount: number;
  updatedAt?: string;
  boardKind?: string;
  boardKey?: string;
}

/**
 * Offline-first sync engine described in shared-docs/SYNC.md.
 *
 * Notes:
 * - TanStack Query is our local source of truth for the UI.
 * - We persist TanStack cache via app.config.ts.
 * - This service adds a small "mutation queue" + cursor tracking for sync up/down.
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineSyncService {
  private readonly CURSOR_BOARDS_KEY = 'whenisdone_cursor_boards_v1';
  private readonly CURSOR_PROJECTS_KEY = 'whenisdone_cursor_projects_v1';
  private readonly CURSOR_TASKS_PREFIX = 'whenisdone_cursor_tasks_v1_'; // + projectId
  private readonly CURSOR_DAY_FACTS_KEY = 'whenisdone_cursor_day_facts_v1';
  private readonly CURSOR_MONTH_FACTS_KEY = 'whenisdone_cursor_month_facts_v1';
  private readonly MUTATION_QUEUE_KEY = 'whenisdone_mutation_queue_v1';

  private readonly BOARDS_QK = ['boards_v1'];
  private readonly PROJECTS_QK = ['projects_v1'];
  private readonly TASKS_QK_PREFIX = 'tasks_v1'; // ['tasks_v1', projectId]
  private readonly DAY_FACTS_QK = ['day_facts_v1'];
  private readonly MONTH_FACTS_QK = ['month_facts_v1'];

  private syncingSubject = new BehaviorSubject<boolean>(false);
  syncing$ = this.syncingSubject.asObservable();

  private readonly LAST_SYNC_KEY = 'whenisdone_last_sync_v1';
  private readonly LAST_ERROR_KEY = 'whenisdone_last_sync_error_v1';
  private readonly SEEDED_KEY = 'whenisdone_seeded_v1';

  private lastSyncAtSubject = new BehaviorSubject<string | null>(null);
  lastSyncAt$ = this.lastSyncAtSubject.asObservable();

  private lastErrorSubject = new BehaviorSubject<string | null>(null);
  lastError$ = this.lastErrorSubject.asObservable();

  private queueSummarySubject = new BehaviorSubject<{
    boards: number;
    projects: number;
    tasks: number;
    dayFacts: number;
    monthFacts: number;
    total: number;
  }>({ boards: 0, projects: 0, tasks: 0, dayFacts: 0, monthFacts: 0, total: 0 });
  queueSummary$ = this.queueSummarySubject.asObservable();

  constructor(
    private backend: BackendService,
    private authService: AuthService,
    private queryClient: QueryClient
  ) {
    this.lastSyncAtSubject.next(this.safeGet(this.LAST_SYNC_KEY));
    this.lastErrorSubject.next(this.safeGet(this.LAST_ERROR_KEY));
    this.queueSummarySubject.next(this.computeQueueSummary(this.loadQueue()));

    // Background sync loop (online-only). Safe to run for app lifetime.
    if (!environment.mock && typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncAll().subscribe({ next: () => { }, error: () => { } });
      });
      setInterval(() => {
        if (navigator.onLine) {
          this.syncAll().subscribe({ next: () => { }, error: () => { } });
        }
      }, 30_000);
    }
  }

  /**
   * Ensure we have the core collections in cache.
   * This is safe to call repeatedly; it does best-effort network work.
   */
  bootstrap(): Observable<void> {
    if (environment.mock) return of(void 0);
    return from(this.ensureBoardsAndProjectsLoaded()).pipe(
      // If the TanStack cache was cleared/migrated but the mutation queue remains,
      // re-apply queued upserts/deletes so UI still reflects pending work.
      switchMap(() => from(this.reconcileCacheFromQueue())),
      switchMap(() => from(this.seedIfEmpty())),
      switchMap(() => this.syncAll())
    );
  }

  // -----------------------------
  // Read helpers (cache-first)
  // -----------------------------

  getBoardsSnapshot(): QueryResult<BoardDto> | null {
    return (this.queryClient.getQueryData(this.BOARDS_QK) as any) || null;
  }

  getProjectsSnapshot(): QueryResult<ProjectDto> | null {
    return (this.queryClient.getQueryData(this.PROJECTS_QK) as any) || null;
  }

  getTasksSnapshot(projectId: string): QueryResult<TaskDto> | null {
    return (
      (this.queryClient.getQueryData([this.TASKS_QK_PREFIX, projectId]) as any) ||
      null
    );
  }

  setBoardsSnapshot(result: QueryResult<BoardDto>): void {
    this.queryClient.setQueryData(this.BOARDS_QK, result);
  }

  setProjectsSnapshot(result: QueryResult<ProjectDto>): void {
    this.queryClient.setQueryData(this.PROJECTS_QK, result);
  }

  setTasksSnapshot(projectId: string, result: QueryResult<TaskDto>): void {
    this.queryClient.setQueryData([this.TASKS_QK_PREFIX, projectId], result);
  }

  getDayFactsSnapshot(): QueryResult<DayFact> | null {
    return (this.queryClient.getQueryData(this.DAY_FACTS_QK) as any) || null;
  }

  getMonthFactsSnapshot(): QueryResult<MonthFact> | null {
    return (this.queryClient.getQueryData(this.MONTH_FACTS_QK) as any) || null;
  }

  setDayFactsSnapshot(result: QueryResult<DayFact>): void {
    this.queryClient.setQueryData(this.DAY_FACTS_QK, result);
  }

  setMonthFactsSnapshot(result: QueryResult<MonthFact>): void {
    this.queryClient.setQueryData(this.MONTH_FACTS_QK, result);
  }

  // -----------------------------
  // Optimistic writes (queue + cache)
  // -----------------------------

  enqueueTaskUpsert(projectId: string, id: string, task: Partial<TaskDto>): void {
    const q = this.loadQueue();
    q.tasks[projectId] = q.tasks[projectId] || [];
    q.tasks[projectId].push({ upsert: { id, task } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueTaskDelete(projectId: string, taskId: string): void {
    const q = this.loadQueue();
    q.tasks[projectId] = q.tasks[projectId] || [];
    q.tasks[projectId].push({ delete: { taskId } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueBoardUpsert(id: string, board: Partial<BoardDto>): void {
    const q = this.loadQueue();
    q.boards.push({ upsert: { id, board } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueBoardDelete(boardId: string): void {
    const q = this.loadQueue();
    q.boards.push({ delete: { boardId } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueProjectUpsert(id: string, project: Partial<ProjectDto>): void {
    const q = this.loadQueue();
    q.projects.push({ upsert: { id, project } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueProjectDelete(projectId: string): void {
    const q = this.loadQueue();
    q.projects.push({ delete: { projectId } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueDayFactUpsert(id: string, dayFact: Partial<DayFact>): void {
    const q = this.loadQueue();
    q.dayFacts.push({ upsert: { id, dayFact } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueDayFactDelete(dayFactId: string): void {
    const q = this.loadQueue();
    q.dayFacts.push({ delete: { dayFactId } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueMonthFactUpsert(id: string, monthFact: Partial<MonthFact>): void {
    const q = this.loadQueue();
    q.monthFacts.push({ upsert: { id, monthFact } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  enqueueMonthFactDelete(monthFactId: string): void {
    const q = this.loadQueue();
    q.monthFacts.push({ delete: { monthFactId } });
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  // -----------------------------
  // Sync loop (up + down)
  // -----------------------------

  /**
   * Public sync trigger (flush queued mutations + fetch deltas).
   */
  syncAll(): Observable<void> {
    if (environment.mock) return of(void 0);
    if (!this.authService.getToken()) return of(void 0);
    if (this.syncingSubject.value) return of(void 0);

    this.syncingSubject.next(true);
    return from(this.syncAllInternal()).pipe(
      map(() => void 0),
      catchError((err) => {
        const msg = (err?.message || 'Sync failed') as string;
        this.lastErrorSubject.next(msg);
        this.safeSet(this.LAST_ERROR_KEY, msg);
        return of(void 0);
      }),
      finalize(() => {
        this.syncingSubject.next(false);
      })
    );
  }

  private async syncAllInternal(): Promise<void> {
    try {
      // Sync boards/projects first so we know project IDs for tasks.
      await this.syncBoards();
      await this.syncProjects();

      const projects = this.getProjectsSnapshot();
      const projectIds = (projects?.items || []).map((it) => it.id).filter(Boolean);

      for (const projectId of projectIds) {
        await this.syncTasksForProject(projectId);
      }

      // Sync day facts and month facts
      await this.syncDayFacts();
      await this.syncMonthFacts();

      // success
      const now = new Date().toISOString();
      this.lastSyncAtSubject.next(now);
      this.safeSet(this.LAST_SYNC_KEY, now);
      this.lastErrorSubject.next(null);
      this.safeSet(this.LAST_ERROR_KEY, '');
    } finally {
      // Ensure flag is cleared even if something throws
      this.syncingSubject.next(false);
    }
  }

  private async ensureBoardsAndProjectsLoaded(): Promise<void> {
    // If cache is empty, pull initial snapshots.
    const hasBoards = !!this.getBoardsSnapshot()?.items?.length;
    const hasProjects = !!this.getProjectsSnapshot()?.items?.length;
    if (!hasBoards) {
      await this.fetchBoardsFromServer('');
    }
    if (!hasProjects) {
      await this.fetchProjectsFromServer('');
    }
  }

  /**
   * If we have queued mutations but the cache is empty (or stale), reconstruct
   * the visible cache from the mutation queue so lists/boards show items again.
   */
  private async reconcileCacheFromQueue(): Promise<void> {
    const q = this.loadQueue();
    const now = new Date().toISOString();

    // Boards
    (q.boards || []).forEach((m) => {
      const upsert = (m as any).upsert;
      const del = (m as any).delete;
      if (upsert?.id) {
        const dto: Partial<BoardDto> = upsert.board || {};
        this.mergeIntoCollectionCache(this.BOARDS_QK, [
          { id: upsert.id, item: { ...(dto as any), updatedAt: (dto as any)?.updatedAt || now } },
        ]);
      } else if (del?.boardId) {
        this.removeFromCollectionCache(this.BOARDS_QK, del.boardId);
      }
    });

    // Projects
    (q.projects || []).forEach((m) => {
      const upsert = (m as any).upsert;
      const del = (m as any).delete;
      if (upsert?.id) {
        const dto: Partial<ProjectDto> = upsert.project || {};
        this.mergeIntoCollectionCache(this.PROJECTS_QK, [
          { id: upsert.id, item: { ...(dto as any), updatedAt: (dto as any)?.updatedAt || now } },
        ]);
      } else if (del?.projectId) {
        this.removeFromCollectionCache(this.PROJECTS_QK, del.projectId);
      }
    });

    // Tasks (keyed by projectId)
    Object.entries(q.tasks || {}).forEach(([projectId, muts]) => {
      (muts || []).forEach((m) => {
        const upsert = (m as any).upsert;
        const del = (m as any).delete;
        if (upsert?.id) {
          const dto: Partial<TaskDto> = upsert.task || {};
          this.mergeIntoCollectionCache([this.TASKS_QK_PREFIX, projectId], [
            {
              id: upsert.id,
              item: {
                ...(dto as any),
                projectId,
                updatedAt: (dto as any)?.updatedAt || now,
              },
            },
          ]);
        } else if (del?.taskId) {
          this.removeFromCollectionCache([this.TASKS_QK_PREFIX, projectId], del.taskId);
        }
      });
    });
  }

  /**
   * First-run experience:
   * If the backend returns no boards/projects (fresh tenant), seed a minimal set so the UI isn't empty.
   * Best-effort: we queue mutations + update cache immediately, then let sync flush to backend.
   */
  private async seedIfEmpty(): Promise<void> {
    // Only seed once per browser profile.
    if (this.safeGet(this.SEEDED_KEY) === 'true') return;

    const boardsSnap = this.getBoardsSnapshot();
    const projectsSnap = this.getProjectsSnapshot();
    const hasBoards = !!boardsSnap?.items?.length;
    const hasProjects = !!projectsSnap?.items?.length;

    // Nothing to do
    if (hasBoards && hasProjects) {
      this.safeSet(this.SEEDED_KEY, 'true');
      return;
    }

    const now = new Date().toISOString();

    // Ensure we always have a stable default "All" view route, even though board ids are UUIDs.
    const allRouteId = 'all';

    if (!hasBoards) {
      // System "All" board (special route/view: /boards/all)
      const allId = this.generateId('board');
      const allBoard: BoardDto = {
        name: 'All',
        kind: 'system',
        key: 'all',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };

      // A practical default user board
      const workId = this.generateId('board');
      const workBoard: BoardDto = {
        name: 'Work',
        kind: 'user',
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      };

      this.mergeIntoCollectionCache(this.BOARDS_QK, [
        { id: allId, item: allBoard },
        { id: workId, item: workBoard },
      ]);
      this.enqueueBoardUpsert(allId, allBoard);
      this.enqueueBoardUpsert(workId, workBoard);

      // Keep the default board stable for navigation
      try {
        if (!localStorage.getItem('whenisdone_last_board_id')) {
          localStorage.setItem('whenisdone_last_board_id', allRouteId);
        }
      } catch {
        // ignore
      }
    }

    if (!hasProjects) {
      // Create a default personal project so tasks have somewhere to go.
      const personalId = this.generateId('project');
      const personal: ProjectDto = {
        name: 'Personal',
        key: 'HOME',
        status: 'backlog',
        createdAt: now,
        updatedAt: now,
        description: 'Default project created on first run.',
      };

      this.mergeIntoCollectionCache(this.PROJECTS_QK, [{ id: personalId, item: personal }]);
      this.enqueueProjectUpsert(personalId, personal);

      // Seed a single welcome task so the board isn't empty on first run.
      // Attach to a user board (if one exists) so it appears in that board and in /boards/all.
      const defaultUserBoardId = this.findDefaultUserBoardId();
      const welcomeTaskId = this.generateId('task');
      const welcomeTask: TaskDto = {
        title: 'Welcome to WhenIsDone',
        description:
          'This is your first task. Try dragging it to OnDeck or InProcess, or edit it to get started.',
        status: 'backlog',
        boardId: defaultUserBoardId,
        projectId: personalId,
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
        tags: ['welcome'],
      };

      this.mergeIntoCollectionCache([this.TASKS_QK_PREFIX, personalId], [
        { id: welcomeTaskId, item: welcomeTask },
      ]);
      this.enqueueTaskUpsert(personalId, welcomeTaskId, welcomeTask);

      // Make it the default project for new tasks
      try {
        if (!localStorage.getItem('whenisdone_last_project_id')) {
          localStorage.setItem('whenisdone_last_project_id', personalId);
        }
      } catch {
        // ignore
      }
    }

    // Mark seeded; if sync fails, we still don't want to keep re-seeding every refresh.
    this.safeSet(this.SEEDED_KEY, 'true');
  }

  private findDefaultUserBoardId(): string | undefined {
    const boards = this.getBoardsSnapshot();
    const userBoard = (boards?.items || []).find(
      (it) => it?.item?.kind === 'user'
    );
    return userBoard?.id || undefined;
  }

  private generateId(prefix: string): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${prefix}-${Math.floor(Math.random() * 1_000_000_000)}`;
    }
  }

  private async syncBoards(): Promise<void> {
    const cursor = this.safeGet(this.CURSOR_BOARDS_KEY) || '';
    await this.flushBoardsQueue(cursor);
    await this.fetchBoardsFromServer(cursor);
  }

  private async syncProjects(): Promise<void> {
    const cursor = this.safeGet(this.CURSOR_PROJECTS_KEY) || '';
    await this.flushProjectsQueue(cursor);
    await this.fetchProjectsFromServer(cursor);
  }

  private async syncTasksForProject(projectId: string): Promise<void> {
    const cursor = this.safeGet(this.CURSOR_TASKS_PREFIX + projectId) || '';
    await this.flushTasksQueue(projectId, cursor);
    await this.fetchTasksFromServer(projectId, cursor);
  }

  private async syncDayFacts(): Promise<void> {
    const cursor = this.safeGet(this.CURSOR_DAY_FACTS_KEY) || '';
    await this.flushDayFactsQueue(cursor);
    await this.fetchDayFactsFromServer(cursor);
  }

  private async syncMonthFacts(): Promise<void> {
    const cursor = this.safeGet(this.CURSOR_MONTH_FACTS_KEY) || '';
    await this.flushMonthFactsQueue(cursor);
    await this.fetchMonthFactsFromServer(cursor);
  }

  // -----------------------------
  // Network: sync-up (flush queue)
  // -----------------------------

  private async flushBoardsQueue(lastKnownCursor: string): Promise<void> {
    const q = this.loadQueue();
    if (!q.boards.length) return;

    const body: GenericSyncUpRequest<BoardsSyncMutation> = {
      clientTime: new Date().toISOString(),
      lastKnownCursor,
      mutations: q.boards,
    };

    const res = await firstValueFrom(
      this.backend.post<SyncUpResponse<BoardDto>>('boards/sync', body)
    );

    if (res?.applied?.length) {
      this.mergeIntoCollectionCache(this.BOARDS_QK, res.applied);
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_BOARDS_KEY, res.sync.nextCursor);
    }

    // Only clear the queue if the server accepted everything.
    // If there are failures, keep the queue so the UI can show pending items.
    if (!res?.failed?.length) {
      q.boards = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
    }
  }

  private async flushProjectsQueue(lastKnownCursor: string): Promise<void> {
    const q = this.loadQueue();
    if (!q.projects.length) return;

    const body: GenericSyncUpRequest<ProjectsSyncMutation> = {
      clientTime: new Date().toISOString(),
      lastKnownCursor,
      mutations: q.projects,
    };

    const res = await firstValueFrom(
      this.backend.post<SyncUpResponse<ProjectDto>>('projects/sync', body)
    );

    if (res?.applied?.length) {
      this.mergeIntoCollectionCache(this.PROJECTS_QK, res.applied);
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_PROJECTS_KEY, res.sync.nextCursor);
    }

    if (!res?.failed?.length) {
      q.projects = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
    }
  }

  private async flushTasksQueue(projectId: string, lastKnownCursor: string): Promise<void> {
    const q = this.loadQueue();
    const mutations = q.tasks[projectId] || [];
    if (!mutations.length) return;

    const body: TasksSyncUpRequest = {
      projectId,
      clientTime: new Date().toISOString(),
      lastKnownCursor,
      mutations,
    };

    const res = await firstValueFrom(
      this.backend.post<SyncUpResponse<TaskDto>>('tasks/sync', body)
    );

    if (res?.applied?.length) {
      this.mergeIntoCollectionCache([this.TASKS_QK_PREFIX, projectId], res.applied);
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_TASKS_PREFIX + projectId, res.sync.nextCursor);
    }

    if (!res?.failed?.length) {
      q.tasks[projectId] = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
    }
  }

  private async flushDayFactsQueue(lastKnownCursor: string): Promise<void> {
    const q = this.loadQueue();
    if (!q.dayFacts.length) return;

    // Validate and filter mutations before sending
    const validMutations = q.dayFacts.filter(mutation => {
      if ('upsert' in mutation) {
        const { id, dayFact } = mutation.upsert;
        // Validate UUID format
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        // Validate required fields
        const hasValidDayDimension = typeof dayFact.dayDimension === 'number' &&
          dayFact.dayDimension >= 19000101 &&
          dayFact.dayDimension <= 21001231;
        const hasValidFriendlyName = typeof dayFact.friendlyName === 'string' && dayFact.friendlyName.length > 0;

        if (!isValidUUID || !hasValidDayDimension || !hasValidFriendlyName) {
          console.warn('Skipping invalid DayFact mutation:', { id, dayFact, isValidUUID, hasValidDayDimension, hasValidFriendlyName });
          return false;
        }
        return true;
      }
      return true; // Allow delete mutations through
    });

    if (!validMutations.length) {
      // All mutations were invalid, clear the queue
      q.dayFacts = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
      return;
    }

    const body: GenericSyncUpRequest<DayFactsSyncMutation> = {
      clientTime: new Date().toISOString(),
      lastKnownCursor,
      mutations: validMutations,
    };

    const res = await firstValueFrom(
      this.backend.post<SyncUpResponse<DayFact>>('day-facts/sync', body)
    );

    if (res?.applied?.length) {
      this.mergeIntoCollectionCache(this.DAY_FACTS_QK, res.applied);
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_DAY_FACTS_KEY, res.sync.nextCursor);
    }

    if (!res?.failed?.length) {
      q.dayFacts = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
    }
  }

  private async flushMonthFactsQueue(lastKnownCursor: string): Promise<void> {
    const q = this.loadQueue();
    if (!q.monthFacts.length) return;

    // Validate and filter mutations before sending
    const validMutations = q.monthFacts.filter(mutation => {
      if ('upsert' in mutation) {
        const { id, monthFact } = mutation.upsert;
        // Validate UUID format
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        // Validate required fields
        const hasValidMonthDimension = typeof monthFact.monthDimension === 'number' &&
          monthFact.monthDimension >= 190001 &&
          monthFact.monthDimension <= 210012;
        const hasValidFriendlyName = typeof monthFact.friendlyName === 'string' && monthFact.friendlyName.length > 0;

        if (!isValidUUID || !hasValidMonthDimension || !hasValidFriendlyName) {
          console.warn('Skipping invalid MonthFact mutation:', { id, monthFact, isValidUUID, hasValidMonthDimension, hasValidFriendlyName });
          return false;
        }
        return true;
      }
      return true; // Allow delete mutations through
    });

    if (!validMutations.length) {
      // All mutations were invalid, clear the queue
      q.monthFacts = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
      return;
    }

    const body: GenericSyncUpRequest<MonthFactsSyncMutation> = {
      clientTime: new Date().toISOString(),
      lastKnownCursor,
      mutations: validMutations,
    };

    const res = await firstValueFrom(
      this.backend.post<SyncUpResponse<MonthFact>>('month-facts/sync', body)
    );

    if (res?.applied?.length) {
      this.mergeIntoCollectionCache(this.MONTH_FACTS_QK, res.applied);
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_MONTH_FACTS_KEY, res.sync.nextCursor);
    }

    if (!res?.failed?.length) {
      q.monthFacts = [];
      this.saveQueue(q);
      this.queueSummarySubject.next(this.computeQueueSummary(q));
    }
  }

  // -----------------------------
  // Network: sync-down (fetch deltas)
  // -----------------------------

  private async fetchBoardsFromServer(cursor: string): Promise<void> {
    const endpoint = cursor ? `boards?cursor=${encodeURIComponent(cursor)}` : 'boards';
    const res = await firstValueFrom(
      this.backend.get<SyncDownResponse<BoardDto>>(endpoint)
    );
    if (res?.items?.length) {
      this.mergeIntoCollectionCache(this.BOARDS_QK, res.items);
    } else if (res?.items) {
      // Only initialize an empty cache if we truly have no local data.
      // Avoid wiping locally-created items when the server returns an empty set.
      const existing = this.getBoardsSnapshot();
      if (!existing) {
        this.queryClient.setQueryData(this.BOARDS_QK, {
          items: [],
          total: 0,
          take: 200,
          skip: 0,
        } satisfies QueryResult<BoardDto>);
      }
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_BOARDS_KEY, res.sync.nextCursor);
    }
  }

  private async fetchProjectsFromServer(cursor: string): Promise<void> {
    const endpoint = cursor ? `projects?cursor=${encodeURIComponent(cursor)}` : 'projects';
    const res = await firstValueFrom(
      this.backend.get<SyncDownResponse<ProjectDto>>(endpoint)
    );
    if (res?.items?.length) {
      this.mergeIntoCollectionCache(this.PROJECTS_QK, res.items);
    } else if (res?.items) {
      const existing = this.getProjectsSnapshot();
      if (!existing) {
        this.queryClient.setQueryData(this.PROJECTS_QK, {
          items: [],
          total: 0,
          take: 200,
          skip: 0,
        } satisfies QueryResult<ProjectDto>);
      }
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_PROJECTS_KEY, res.sync.nextCursor);
    }
  }

  private async fetchTasksFromServer(projectId: string, cursor: string): Promise<void> {
    const qp = `projectId=${encodeURIComponent(projectId)}`;
    const endpoint = cursor
      ? `tasks?${qp}&cursor=${encodeURIComponent(cursor)}`
      : `tasks?${qp}`;

    const res = await firstValueFrom(
      this.backend.get<SyncDownResponse<TaskDto>>(endpoint)
    );
    if (res?.items?.length) {
      this.mergeIntoCollectionCache([this.TASKS_QK_PREFIX, projectId], res.items);
    } else if (res?.items) {
      const existing = this.getTasksSnapshot(projectId);
      if (!existing) {
        this.queryClient.setQueryData([this.TASKS_QK_PREFIX, projectId], {
          items: [],
          total: 0,
          take: 500,
          skip: 0,
        } satisfies QueryResult<TaskDto>);
      }
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_TASKS_PREFIX + projectId, res.sync.nextCursor);
    }
  }

  private async fetchDayFactsFromServer(cursor: string): Promise<void> {
    const endpoint = cursor ? `day-facts?cursor=${encodeURIComponent(cursor)}` : 'day-facts';
    const res = await firstValueFrom(
      this.backend.get<SyncDownResponse<DayFact>>(endpoint)
    );
    if (res?.items?.length) {
      this.mergeIntoCollectionCache(this.DAY_FACTS_QK, res.items);
    } else if (res?.items) {
      const existing = this.queryClient.getQueryData(this.DAY_FACTS_QK);
      if (!existing) {
        this.queryClient.setQueryData(this.DAY_FACTS_QK, {
          items: [],
          total: 0,
          take: 200,
          skip: 0,
        } satisfies QueryResult<DayFact>);
      }
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_DAY_FACTS_KEY, res.sync.nextCursor);
    }
  }

  private async fetchMonthFactsFromServer(cursor: string): Promise<void> {
    const endpoint = cursor ? `month-facts?cursor=${encodeURIComponent(cursor)}` : 'month-facts';
    const res = await firstValueFrom(
      this.backend.get<SyncDownResponse<MonthFact>>(endpoint)
    );
    if (res?.items?.length) {
      this.mergeIntoCollectionCache(this.MONTH_FACTS_QK, res.items);
    } else if (res?.items) {
      const existing = this.queryClient.getQueryData(this.MONTH_FACTS_QK);
      if (!existing) {
        this.queryClient.setQueryData(this.MONTH_FACTS_QK, {
          items: [],
          total: 0,
          take: 200,
          skip: 0,
        } satisfies QueryResult<MonthFact>);
      }
    }
    if (res?.sync?.nextCursor) {
      this.safeSet(this.CURSOR_MONTH_FACTS_KEY, res.sync.nextCursor);
    }
  }

  // -----------------------------
  // Cache merge helpers
  // -----------------------------

  private mergeIntoCollectionCache<T>(
    queryKey: any,
    incoming: Array<QueryResultItem<T>>
  ): void {
    const prev = (this.queryClient.getQueryData(queryKey) as QueryResult<T> | undefined) || {
      items: [],
      total: 0,
      take: 200,
      skip: 0,
    };

    const map = new Map<string, QueryResultItem<T>>();
    (prev.items || []).forEach((it) => map.set(it.id, it));
    incoming.forEach((it) => map.set(it.id, it));

    const nextItems = Array.from(map.values());
    this.queryClient.setQueryData(queryKey, {
      ...prev,
      items: nextItems,
      total: nextItems.length,
      skip: 0,
      take: Math.max(prev.take || 0, nextItems.length),
    } satisfies QueryResult<T>);
  }

  private removeFromCollectionCache<T>(queryKey: any, id: string): void {
    const prev = this.queryClient.getQueryData(queryKey) as QueryResult<T> | undefined;
    if (!prev?.items?.length) return;
    const nextItems = (prev.items || []).filter((it: any) => it.id !== id);
    this.queryClient.setQueryData(queryKey, {
      ...prev,
      items: nextItems,
      total: nextItems.length,
      skip: 0,
      take: Math.max(prev.take || 0, nextItems.length),
    } satisfies QueryResult<T>);
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------

  /**
   * Return a UI-friendly list of pending sync entities (boards/projects/tasks).
   * This reads the local mutation queue and uses cache snapshots to produce labels.
   */
  getSyncQueueItems(): SyncQueueUiItem[] {
    const q = this.loadQueue();

    const items: SyncQueueUiItem[] = [];

    // Boards
    const boardsSnap = this.getBoardsSnapshot();
    const boardsById = new Map<string, any>();
    (boardsSnap?.items || []).forEach((it) => boardsById.set(it.id, it.item));

    const boardAgg = new Map<string, { upserts: number; deletes: number }>();
    (q.boards || []).forEach((m) => {
      if ((m as any).upsert?.id) {
        const id = (m as any).upsert.id as string;
        const cur = boardAgg.get(id) || { upserts: 0, deletes: 0 };
        cur.upserts += 1;
        boardAgg.set(id, cur);
      } else if ((m as any).delete?.boardId) {
        const id = (m as any).delete.boardId as string;
        const cur = boardAgg.get(id) || { upserts: 0, deletes: 0 };
        cur.deletes += 1;
        boardAgg.set(id, cur);
      }
    });
    boardAgg.forEach((counts, id) => {
      const b = boardsById.get(id) || {};
      const operation: SyncQueueOperation = counts.deletes > 0 ? 'delete' : 'upsert';
      items.push({
        syncKey: `board:${id}`,
        entityType: 'board',
        operation,
        entityId: id,
        label: b?.name || id,
        mutationCount: counts.upserts + counts.deletes,
        updatedAt: b?.updatedAt,
        boardKind: b?.kind,
        boardKey: b?.key,
      });
    });

    // Projects
    const projectsSnap = this.getProjectsSnapshot();
    const projectsById = new Map<string, any>();
    (projectsSnap?.items || []).forEach((it) => projectsById.set(it.id, it.item));

    const projectAgg = new Map<string, { upserts: number; deletes: number }>();
    (q.projects || []).forEach((m) => {
      if ((m as any).upsert?.id) {
        const id = (m as any).upsert.id as string;
        const cur = projectAgg.get(id) || { upserts: 0, deletes: 0 };
        cur.upserts += 1;
        projectAgg.set(id, cur);
      } else if ((m as any).delete?.projectId) {
        const id = (m as any).delete.projectId as string;
        const cur = projectAgg.get(id) || { upserts: 0, deletes: 0 };
        cur.deletes += 1;
        projectAgg.set(id, cur);
      }
    });
    projectAgg.forEach((counts, id) => {
      const p = projectsById.get(id) || {};
      const operation: SyncQueueOperation = counts.deletes > 0 ? 'delete' : 'upsert';
      items.push({
        syncKey: `project:${id}`,
        entityType: 'project',
        operation,
        entityId: id,
        label: p?.name || id,
        mutationCount: counts.upserts + counts.deletes,
        updatedAt: p?.updatedAt,
      });
    });

    // Tasks (keyed by projectId)
    const taskAgg = new Map<
      string,
      { projectId: string; upserts: number; deletes: number; boardId?: string; title?: string; updatedAt?: string }
    >();
    Object.entries(q.tasks || {}).forEach(([projectId, muts]) => {
      const snap = this.getTasksSnapshot(projectId);
      const taskById = new Map<string, any>();
      (snap?.items || []).forEach((it) => taskById.set(it.id, it.item));

      (muts || []).forEach((m) => {
        if ((m as any).upsert?.id) {
          const id = (m as any).upsert.id as string;
          const cur =
            taskAgg.get(`${projectId}:${id}`) ||
            ({ projectId, upserts: 0, deletes: 0 } as any);
          cur.upserts += 1;
          const t = taskById.get(id) || (m as any).upsert?.task || {};
          cur.boardId = t?.boardId || cur.boardId;
          cur.title = t?.title || cur.title;
          cur.updatedAt = t?.updatedAt || cur.updatedAt;
          taskAgg.set(`${projectId}:${id}`, cur);
        } else if ((m as any).delete?.taskId) {
          const id = (m as any).delete.taskId as string;
          const cur =
            taskAgg.get(`${projectId}:${id}`) ||
            ({ projectId, upserts: 0, deletes: 0 } as any);
          cur.deletes += 1;
          const t = taskById.get(id) || {};
          cur.boardId = t?.boardId || cur.boardId;
          cur.title = t?.title || cur.title;
          cur.updatedAt = t?.updatedAt || cur.updatedAt;
          taskAgg.set(`${projectId}:${id}`, cur);
        }
      });
    });
    taskAgg.forEach((counts, key) => {
      const entityId = key.split(':').slice(1).join(':');
      const operation: SyncQueueOperation = counts.deletes > 0 ? 'delete' : 'upsert';
      items.push({
        syncKey: `task:${counts.projectId}:${entityId}`,
        entityType: 'task',
        operation,
        entityId,
        projectId: counts.projectId,
        boardId: counts.boardId,
        label: counts.title || entityId,
        mutationCount: counts.upserts + counts.deletes,
        updatedAt: counts.updatedAt,
      });
    });

    // Sort: tasks first (most common), then projects, then boards
    const order: Record<string, number> = { task: 0, project: 1, board: 2 };
    return items.sort((a, b) => {
      const oa = order[a.entityType] ?? 99;
      const ob = order[b.entityType] ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.label || '').localeCompare(b.label || '');
    });
  }

  /**
   * Discard queued mutations for a single entity (does not change cached entities).
   */
  discardSyncQueueItem(syncKey: string): void {
    const parts = String(syncKey || '').split(':');
    const kind = parts[0] as SyncQueueEntityType;
    const q = this.loadQueue();

    if (kind === 'board') {
      const id = parts[1];
      q.boards = (q.boards || []).filter((m) => {
        const upsertId = (m as any).upsert?.id;
        const delId = (m as any).delete?.boardId;
        return upsertId !== id && delId !== id;
      });
    } else if (kind === 'project') {
      const id = parts[1];
      q.projects = (q.projects || []).filter((m) => {
        const upsertId = (m as any).upsert?.id;
        const delId = (m as any).delete?.projectId;
        return upsertId !== id && delId !== id;
      });
    } else if (kind === 'task') {
      const projectId = parts[1];
      const taskId = parts.slice(2).join(':');
      const muts = q.tasks?.[projectId] || [];
      q.tasks[projectId] = muts.filter((m) => {
        const upsertId = (m as any).upsert?.id;
        const delId = (m as any).delete?.taskId;
        return upsertId !== taskId && delId !== taskId;
      });
      if (!q.tasks[projectId]?.length) {
        delete q.tasks[projectId];
      }
    }

    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  clearSyncQueue(): void {
    const q: MutationQueue = { tasks: {}, boards: [], projects: [], dayFacts: [], monthFacts: [] };
    this.saveQueue(q);
    this.queueSummarySubject.next(this.computeQueueSummary(q));
  }

  private loadQueue(): MutationQueue {
    try {
      const raw = localStorage.getItem(this.MUTATION_QUEUE_KEY);
      if (!raw) return { tasks: {}, boards: [], projects: [], dayFacts: [], monthFacts: [] };
      const parsed = JSON.parse(raw) as MutationQueue;
      return {
        tasks: parsed?.tasks || {},
        boards: parsed?.boards || [],
        projects: parsed?.projects || [],
        dayFacts: parsed?.dayFacts || [],
        monthFacts: parsed?.monthFacts || [],
      };
    } catch {
      return { tasks: {}, boards: [], projects: [], dayFacts: [], monthFacts: [] };
    }
  }

  private saveQueue(q: MutationQueue): void {
    try {
      localStorage.setItem(this.MUTATION_QUEUE_KEY, JSON.stringify(q));
    } catch {
      // ignore
    }
  }

  private safeGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  private computeQueueSummary(q: MutationQueue): {
    boards: number;
    projects: number;
    tasks: number;
    dayFacts: number;
    monthFacts: number;
    total: number;
  } {
    const boards = q.boards?.length || 0;
    const projects = q.projects?.length || 0;
    const dayFacts = q.dayFacts?.length || 0;
    const monthFacts = q.monthFacts?.length || 0;
    const tasks = Object.values(q.tasks || {}).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
    return { boards, projects, tasks, dayFacts, monthFacts, total: boards + projects + tasks + dayFacts + monthFacts };
  }
}

