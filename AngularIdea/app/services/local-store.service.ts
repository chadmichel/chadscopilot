import { Injectable } from '@angular/core';
import { injectQueryClient, QueryClient } from '@tanstack/angular-query-experimental';

import { QueryResult, QueryResultItem } from '../components/common-dto/query.dto';
import { BoardDto } from '../dto/board.dto';
import { ProjectDto } from '../dto/project.dto';
import { TaskDto } from '../dto/task.dto';

const BOARDS_QK = ['boards_v1'] as const;
const PROJECTS_QK = ['projects_v1'] as const;
const TASKS_QK_PREFIX = 'tasks_v1';
const DAY_FACTS_QK = ['day_facts_v1'] as const;
const MONTH_FACTS_QK = ['month_facts_v1'] as const;

type BoardRecord = { id: string; item: BoardDto };
type ProjectRecord = { id: string; item: ProjectDto };
type TaskRecord = { id: string; projectId: string; item: TaskDto };
type DayFactRecord = { id: string; item: any };
type MonthFactRecord = { id: string; item: any };

@Injectable({
  providedIn: 'root',
})
export class LocalStoreService {
  private qc: QueryClient = injectQueryClient();
  private seeded = false;
  private readonly DB_NAME = 'whenisdone_db_v1';
  private readonly DB_VERSION = 1;
  private dbPromise: Promise<IDBDatabase> | null = null;

  // -----------------------------
  // Query keys
  // -----------------------------
  boardsKey = BOARDS_QK;
  projectsKey = PROJECTS_QK;
  tasksKey = (projectId: string) => [TASKS_QK_PREFIX, projectId] as const;
  dayFactsKey = DAY_FACTS_QK;
  monthFactsKey = MONTH_FACTS_QK;

  // -----------------------------
  // Snapshots (read/write)
  // -----------------------------
  getBoardsSnapshot(): QueryResult<BoardDto> | null {
    return (this.qc.getQueryData(this.boardsKey) as any) || null;
  }

  setBoardsSnapshot(result: QueryResult<BoardDto>): void {
    this.qc.setQueryData(this.boardsKey, result);
    void this.replaceBoardsStore(result);
  }

  getProjectsSnapshot(): QueryResult<ProjectDto> | null {
    return (this.qc.getQueryData(this.projectsKey) as any) || null;
  }

  setProjectsSnapshot(result: QueryResult<ProjectDto>): void {
    this.qc.setQueryData(this.projectsKey, result);
    void this.replaceProjectsStore(result);
  }

  getTasksSnapshot(projectId: string): QueryResult<TaskDto> | null {
    return (this.qc.getQueryData(this.tasksKey(projectId)) as any) || null;
  }

  setTasksSnapshot(projectId: string, result: QueryResult<TaskDto>): void {
    this.qc.setQueryData(this.tasksKey(projectId), result);
    void this.replaceTasksForProjectStore(projectId, result);
  }

  // -----------------------------
  // Upsert/remove helpers
  // -----------------------------
  upsertIntoCollection<T>(key: any, id: string, item: T): void {
    const prev = (this.qc.getQueryData(key) as QueryResult<T> | undefined) || {
      items: [],
      total: 0,
      take: 500,
      skip: 0,
    };

    const map = new Map<string, QueryResultItem<T>>();
    (prev.items || []).forEach((it) => map.set(it.id, it));
    map.set(id, { id, item });

    const nextItems = Array.from(map.values());
    this.qc.setQueryData(key, {
      ...prev,
      items: nextItems,
      total: nextItems.length,
      skip: 0,
      take: Math.max(prev.take || 0, nextItems.length),
    } satisfies QueryResult<T>);

    // Persist the individual record into IndexedDB (best-effort, async).
    void this.persistUpsertByKey(key, id, item);
  }

  removeFromCollection<T>(key: any, id: string): void {
    const prev = this.qc.getQueryData(key) as QueryResult<T> | undefined;
    if (!prev?.items?.length) return;
    const nextItems = (prev.items || []).filter((it) => it.id !== id);
    this.qc.setQueryData(key, {
      ...prev,
      items: nextItems,
      total: nextItems.length,
      skip: 0,
      take: Math.max(prev.take || 0, nextItems.length),
    } satisfies QueryResult<T>);

    // Persist deletion to IndexedDB (best-effort, async).
    void this.persistDeleteByKey(key, id);
  }

  // -----------------------------
  // Seed (client-only)
  // -----------------------------
  ensureSeeded(): void {
    if (this.seeded) return;
    this.seeded = true;

    const boards = this.getBoardsSnapshot();
    const projects = this.getProjectsSnapshot();

    const hasBoards = !!boards?.items?.length;
    const hasProjects = !!projects?.items?.length;

    if (hasBoards && hasProjects) return;

    const now = new Date().toISOString();

    // Boards: include a system "All" board (route/view uses "all", board id is UUID)
    if (!hasBoards) {
      const allId = this.generateId('board');
      const workId = this.generateId('board');

      const allBoard: BoardDto = {
        name: 'All',
        kind: 'system',
        key: 'all',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };

      const workBoard: BoardDto = {
        name: 'Work',
        kind: 'user',
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
      };

      this.setBoardsSnapshot({
        items: [
          { id: allId, item: allBoard },
          { id: workId, item: workBoard },
        ],
        total: 2,
        take: 200,
        skip: 0,
      });

      try {
        if (!localStorage.getItem('whenisdone_last_board_id')) {
          localStorage.setItem('whenisdone_last_board_id', 'all');
        }
      } catch {
        // ignore
      }
    }

    // Projects + welcome task
    if (!hasProjects) {
      const personalId = this.generateId('project');
      const personal: ProjectDto = {
        name: 'Personal',
        key: 'HOME',
        status: 'backlog',
        createdAt: now,
        updatedAt: now,
        description: 'Default project created on first run.',
      };

      this.setProjectsSnapshot({
        items: [{ id: personalId, item: personal }],
        total: 1,
        take: 200,
        skip: 0,
      });

      try {
        if (!localStorage.getItem('whenisdone_last_project_id')) {
          localStorage.setItem('whenisdone_last_project_id', personalId);
        }
      } catch {
        // ignore
      }

      const userBoardId = this.findDefaultUserBoardId();
      const welcomeTaskId = this.generateId('task');
      const welcomeTask: TaskDto = {
        title: 'Welcome to WhenIsDone',
        description:
          'This is your first task. Try dragging it to OnDeck or InProcess, or edit it to get started.',
        status: 'backlog',
        boardId: userBoardId,
        projectId: personalId,
        sortOrder: 10,
        createdAt: now,
        updatedAt: now,
        tags: ['welcome'],
      };

      this.setTasksSnapshot(personalId, {
        items: [{ id: welcomeTaskId, item: welcomeTask }],
        total: 1,
        take: 500,
        skip: 0,
      });
    }
  }

  private findDefaultUserBoardId(): string | undefined {
    const boards = this.getBoardsSnapshot();
    const userBoard = (boards?.items || []).find((it) => it?.item?.kind === 'user');
    return userBoard?.id || undefined;
  }

  generateId(prefix: string): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${prefix}-${Math.floor(Math.random() * 1_000_000_000)}`;
    }
  }

  /**
   * Hydrate the TanStack Query cache from IndexedDB object stores:
   * - boards
   * - projects
   * - tasks (keyed by projectId)
   *
   * This runs best-effort; if IndexedDB isn't available, it no-ops.
   */
  async hydrateFromIndexedDb(): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;

    try {
      // Boards
      const hasBoards = !!this.getBoardsSnapshot()?.items?.length;
      if (!hasBoards) {
        const boards = await this.idbGetAll<BoardRecord>('boards');
        if (boards?.length) {
          this.qc.setQueryData(this.boardsKey, {
            items: boards.map((r) => ({ id: r.id, item: r.item })),
            total: boards.length,
            take: 200,
            skip: 0,
          } satisfies QueryResult<BoardDto>);
        }
      }

      // Projects
      const hasProjects = !!this.getProjectsSnapshot()?.items?.length;
      if (!hasProjects) {
        const projects = await this.idbGetAll<ProjectRecord>('projects');
        if (projects?.length) {
          this.qc.setQueryData(this.projectsKey, {
            items: projects.map((r) => ({ id: r.id, item: r.item })),
            total: projects.length,
            take: 200,
            skip: 0,
          } satisfies QueryResult<ProjectDto>);
        }
      }

      // Tasks (group by projectId)
      const tasks = await this.idbGetAll<TaskRecord>('tasks');
      if (tasks?.length) {
        const byProject = new Map<string, TaskRecord[]>();
        tasks.forEach((t) => {
          const pid = t.projectId || (t.item as any)?.projectId;
          if (!pid) return;
          const cur = byProject.get(pid) || [];
          cur.push(t);
          byProject.set(pid, cur);
        });

        byProject.forEach((rows, projectId) => {
          const existing = this.getTasksSnapshot(projectId);
          if (existing?.items?.length) return;
          this.qc.setQueryData(this.tasksKey(projectId), {
            items: rows.map((r) => ({ id: r.id, item: r.item })),
            total: rows.length,
            take: 500,
            skip: 0,
          } satisfies QueryResult<TaskDto>);
        });
      }
    } catch {
      // ignore (best-effort)
    }
  }

  // -----------------------------
  // IndexedDB persistence (multiple tables)
  // -----------------------------

  private async persistUpsertByKey<T>(key: any, id: string, item: T): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
    try {
      if (this.isBoardsKey(key)) {
        await this.idbPut('boards', { id, item: item as unknown as BoardDto } satisfies BoardRecord);
        return;
      }
      if (this.isProjectsKey(key)) {
        await this.idbPut(
          'projects',
          { id, item: item as unknown as ProjectDto } satisfies ProjectRecord
        );
        return;
      }
      const projectId = this.getProjectIdFromTasksKey(key);
      if (projectId) {
        await this.idbPut('tasks', {
          id,
          projectId,
          item: item as any,
        } satisfies TaskRecord);
        return;
      }
      if (key === this.dayFactsKey) {
        await this.idbPut('day_facts', { id, item: item as any } satisfies DayFactRecord);
        return;
      }
      if (key === this.monthFactsKey) {
        await this.idbPut('month_facts', { id, item: item as any } satisfies MonthFactRecord);
        return;
      }
    } catch {
      // ignore
    }
  }

  private async persistDeleteByKey(key: any, id: string): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
    try {
      if (this.isBoardsKey(key)) {
        await this.idbDelete('boards', id);
        return;
      }
      if (this.isProjectsKey(key)) {
        await this.idbDelete('projects', id);
        return;
      }
      const projectId = this.getProjectIdFromTasksKey(key);
      if (projectId) {
        // tasks are keyed by id globally
        await this.idbDelete('tasks', id);
        return;
      }
      if (key === this.dayFactsKey) {
        await this.idbDelete('day_facts', id);
        return;
      }
      if (key === this.monthFactsKey) {
        await this.idbDelete('month_facts', id);
        return;
      }
    } catch {
      // ignore
    }
  }

  private async replaceBoardsStore(result: QueryResult<BoardDto>): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
    try {
      await this.idbClear('boards');
      const items = (result.items || []) as Array<QueryResultItem<BoardDto>>;
      for (const it of items) {
        await this.idbPut('boards', { id: it.id, item: it.item } satisfies BoardRecord);
      }
    } catch {
      // ignore
    }
  }

  private async replaceProjectsStore(result: QueryResult<ProjectDto>): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
    try {
      await this.idbClear('projects');
      const items = (result.items || []) as Array<QueryResultItem<ProjectDto>>;
      for (const it of items) {
        await this.idbPut('projects', { id: it.id, item: it.item } satisfies ProjectRecord);
      }
    } catch {
      // ignore
    }
  }

  private async replaceTasksForProjectStore(
    projectId: string,
    result: QueryResult<TaskDto>
  ): Promise<void> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
    try {
      await this.idbDeleteTasksByProjectId(projectId);
      const items = (result.items || []) as Array<QueryResultItem<TaskDto>>;
      for (const it of items) {
        await this.idbPut('tasks', {
          id: it.id,
          projectId,
          item: it.item,
        } satisfies TaskRecord);
      }
    } catch {
      // ignore
    }
  }

  private isBoardsKey(key: any): boolean {
    return Array.isArray(key) && key[0] === BOARDS_QK[0];
  }

  private isProjectsKey(key: any): boolean {
    return Array.isArray(key) && key[0] === PROJECTS_QK[0];
  }

  private getProjectIdFromTasksKey(key: any): string | null {
    if (!Array.isArray(key)) return null;
    if (key[0] !== TASKS_QK_PREFIX) return null;
    return key?.[1] ? String(key[1]) : null;
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('boards')) {
          db.createObjectStore('boards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('day_facts')) {
          db.createObjectStore('day_facts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('month_facts')) {
          db.createObjectStore('month_facts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          const store = db.createObjectStore('tasks', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
        } else {
          const store = req.transaction?.objectStore('tasks');
          if (store && !Array.from(store.indexNames).includes('projectId')) {
            store.createIndex('projectId', 'projectId', { unique: false });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private async idbTx<T>(
    storeName: 'boards' | 'projects' | 'tasks' | 'day_facts' | 'month_facts',
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => void
  ): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      fn(store);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  private async idbPut(
    storeName: 'boards' | 'projects' | 'tasks' | 'day_facts' | 'month_facts',
    value: any
  ): Promise<void> {
    await this.idbTx(storeName, 'readwrite', (store) => {
      store.put(value);
    });
  }

  private async idbDelete(
    storeName: 'boards' | 'projects' | 'tasks' | 'day_facts' | 'month_facts',
    key: string
  ): Promise<void> {
    await this.idbTx(storeName, 'readwrite', (store) => {
      store.delete(key);
    });
  }

  private async idbClear(storeName: 'boards' | 'projects' | 'tasks' | 'day_facts' | 'month_facts'): Promise<void> {
    await this.idbTx(storeName, 'readwrite', (store) => {
      store.clear();
    });
  }

  private async idbGetAll<T>(
    storeName: 'boards' | 'projects' | 'tasks' | 'day_facts' | 'month_facts'
  ): Promise<T[]> {
    const db = await this.openDb();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private async idbDeleteTasksByProjectId(projectId: string): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const index = store.index('projectId');
      const req = index.openCursor(IDBKeyRange.only(projectId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  }
}

