import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QueryOptions, QueryResult } from '../components/common-dto/query.dto';
import { BoardDto } from '../dto/board.dto';
import { applyQueryOptions } from '../utilities/apply-query.utility';
import { LocalStoreService } from './local-store.service';
import { QueryResultItem, ProcessResult } from '../components/common-dto/query.dto';

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  constructor(private store: LocalStoreService) {}

  getBoards(queryParams: QueryOptions): Observable<QueryResult<BoardDto>> {
    this.store.ensureSeeded();
    const snap =
      this.store.getBoardsSnapshot() ||
      ({
        items: [],
        total: 0,
        take: 200,
        skip: 0,
      } satisfies QueryResult<BoardDto>);

    const withMetrics = this.attachBoardMetrics(snap);
    return of(applyQueryOptions(withMetrics, queryParams));
  }

  createBoard(board: Partial<BoardDto>): Observable<ProcessResult> {
    this.store.ensureSeeded();
    const id = this.store.generateId('board');
    const now = new Date().toISOString();
    const dto: BoardDto = {
      name: board.name || 'New Board',
      kind: (board.kind as any) || 'user',
      key: board.key,
      sortOrder: board.sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    this.store.upsertIntoCollection(this.store.boardsKey, id, dto);
    return of({ success: true, id, message: 'Saved locally' });
  }

  updateBoard(id: string, board: Partial<BoardDto>): Observable<ProcessResult> {
    this.store.ensureSeeded();
    const snap = this.store.getBoardsSnapshot();
    const existing = snap?.items?.find((it) => it.id === id)?.item as any;
    const now = new Date().toISOString();
    const dto: BoardDto = {
      ...(existing || {}),
      ...(board as any),
      updatedAt: now,
    };
    this.store.upsertIntoCollection(this.store.boardsKey, id, dto);
    return of({ success: true, id, message: 'Saved locally' });
  }

  deleteBoard(id: string): Observable<ProcessResult> {
    this.store.removeFromCollection(this.store.boardsKey, id);
    return of({ success: true, id, message: 'Deleted locally' });
  }

  private attachBoardMetrics(result: QueryResult<BoardDto>): QueryResult<BoardDto> {
    // Compute metrics from local tasks cache.
    const allTasks = this.getAllTasksFlat();

    const items: QueryResultItem<BoardDto>[] = (result.items || []).map((it) => {
      const b = it.item as any;
      const isAll = b?.key === 'all' || b?.kind === 'system';

      const tasksForBoard = isAll
        ? allTasks
        : allTasks.filter((t) => (t.item as any)?.boardId === it.id);

      const backlogTotal = tasksForBoard.filter((t) => t.item?.status === 'backlog').length;
      const onDeckTotal = tasksForBoard.filter((t) => t.item?.status === 'ondeck').length;
      const inProgressTotal = tasksForBoard.filter((t) => t.item?.status === 'inprocess').length;
      const completedTotal = tasksForBoard.filter((t) => t.item?.status === 'complete').length;
      const total = backlogTotal + onDeckTotal + inProgressTotal + completedTotal;
      const percentDone = total ? Math.round((completedTotal / total) * 100) : 0;

      const withMetrics: BoardDto = {
        ...(it.item as any),
        metrics: {
          backlogTotal,
          onDeckTotal,
          inProgressTotal,
          completedTotal,
          percentDone,
          avgInProcessHours: 0,
        },
      };
      return { id: it.id, item: withMetrics };
    });

    return {
      ...result,
      items,
      total: items.length,
      take: Math.max(result.take || 0, items.length),
      skip: 0,
    };
  }

  private getAllTasksFlat(): QueryResultItem<any>[] {
    const projects = this.store.getProjectsSnapshot();
    const projectIds = (projects?.items || []).map((it) => it.id).filter(Boolean);

    const mapById = new Map<string, any>();
    for (const pid of projectIds) {
      const snap = this.store.getTasksSnapshot(pid);
      (snap?.items || []).forEach((it) => mapById.set(it.id, it));
    }
    return Array.from(mapById.values());
  }
}

