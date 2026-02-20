import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { ItemListComponent } from '../../components/item-list/item-list.component';
import { ItemListConfig } from '../../components/item-list/item-list.types';
import { QueryOptions, QueryResult } from '../../components/common-dto/query.dto';
import { OfflineSyncService, SyncQueueUiItem } from '../../services/offline-sync.service';
import { applyQueryOptions } from '../../utilities/apply-query.utility';

type SyncItemsRow = SyncQueueUiItem & {
  typeLabel: string;
  opLabel: string;
};

@Component({
  selector: 'app-sync-items',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class SyncItemsComponent {
  listConfig: ItemListConfig = {
    header: 'Sync Items',
    supportsAdd: false,
    supportsEdit: true,
    supportsDelete: true,
    enableSearch: true,
    defaultSortField: 'typeLabel',
    customToolbarItems: [
      {
        label: 'Sync now',
        icon: 'pi pi-refresh',
        onClick: () => this.offlineSync.syncAll().subscribe({ next: () => {}, error: () => {} }),
      },
      {
        label: 'Delete all',
        icon: 'pi pi-trash',
        styleClass: 'p-button-danger',
        onClick: () => this.offlineSync.clearSyncQueue(),
      },
    ],
    columns: [
      { field: 'typeLabel', header: 'Type', type: 'text', sortable: true },
      { field: 'label', header: 'Item', type: 'text', sortable: true },
      { field: 'opLabel', header: 'Action', type: 'text', sortable: true, mobileHide: true },
      { field: 'mutationCount', header: 'Queued', type: 'number', sortable: true, mobileHide: true },
      { field: 'updatedAt', header: 'Updated', type: 'date', format: 'shortDate', sortable: true, mobileHide: true },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        filter: queryParams['filter'] || '',
      }),
      loadItems: (params: QueryOptions): Observable<QueryResult<SyncItemsRow>> => {
        const rows = this.offlineSync.getSyncQueueItems().map((it) => this.toRow(it));
        const full: QueryResult<SyncItemsRow> = {
          items: rows.map((r) => ({ id: r.syncKey, item: r })),
          total: rows.length,
          take: rows.length,
          skip: 0,
        };
        return of(applyQueryOptions(full, params));
      },
      deleteItem: (params: QueryOptions, item: any): Observable<any> => {
        const syncKey = item?.syncKey || item?.id;
        if (syncKey) this.offlineSync.discardSyncQueueItem(String(syncKey));
        return of({ success: true });
      },
    },
    onEdit: (item: any) => this.openItem(item),
  };

  constructor(
    private offlineSync: OfflineSyncService,
    private router: Router
  ) {}

  private toRow(it: SyncQueueUiItem): SyncItemsRow {
    const typeLabel =
      it.entityType === 'task' ? 'Task' : it.entityType === 'project' ? 'Project' : 'Board';
    const opLabel = it.operation === 'delete' ? 'Delete' : 'Upsert';
    return { ...it, typeLabel, opLabel };
  }

  private openItem(row: SyncItemsRow): void {
    if (!row) return;

    if (row.entityType === 'project') {
      this.router.navigate(['/projects', row.entityId]);
      return;
    }

    if (row.entityType === 'board') {
      const routeId =
        row.boardKey === 'all' || row.boardKind === 'system' ? 'all' : row.entityId;
      this.router.navigate(['/boards', routeId]);
      return;
    }

    // task
    this.router.navigate(['/tasks', row.entityId], {
      queryParams: {
        edit: true,
        projectId: row.projectId,
        boardId: row.boardId,
      },
      state: {
        returnUrl: this.router.url,
      },
    });
  }
}

