import { Component } from '@angular/core';
import { ItemListComponent } from '../../../components/item-list/item-list.component';
import { ItemListConfig } from '../../../components/item-list/item-list.types';
import { QueryOptions, QueryResult } from '../../../components/common-dto/query.dto';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { BoardService } from '../../../services/board.service';
import { BoardDto } from '../../../dto/board.dto';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class BoardListComponent {
  listConfig: ItemListConfig = {
    header: 'Boards',
    supportsAdd: false,
    supportsEdit: true,
    supportsDelete: false,
    enableSearch: true,
    defaultSortField: 'name',
    columns: [
      { field: 'name', header: 'Name', type: 'text', sortable: true },
      {
        field: 'kind',
        header: 'Kind',
        type: 'select',
        sortable: true,
        options: [
          { label: 'System', value: 'system' },
          { label: 'User', value: 'user' },
        ],
        mobileHide: true,
      },
      {
        field: 'metrics.backlogTotal',
        header: 'Backlog',
        type: 'number',
        sortable: true,
      },
      {
        field: 'metrics.onDeckTotal',
        header: 'OnDeck',
        type: 'number',
        sortable: true,
      },
      {
        field: 'metrics.inProgressTotal',
        header: 'InProg',
        type: 'number',
        sortable: true,
      },
      {
        field: 'metrics.completedTotal',
        header: 'Done',
        type: 'number',
        sortable: true,
      },
      {
        field: 'metrics.percentDone',
        header: '% Done',
        type: 'number',
        sortable: true,
      },
      {
        field: 'metrics.avgInProcessHours',
        header: 'Avg InProc (h)',
        type: 'number',
        sortable: true,
        mobileHide: true,
      },
      {
        field: 'updatedAt',
        header: 'Updated',
        type: 'date',
        format: 'shortDate',
        sortable: true,
        mobileHide: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        filter: queryParams['filter'] || '',
      }),
      loadItems: (params: QueryOptions): Observable<QueryResult<BoardDto>> =>
        this.boardService.getBoards(params),
    },
    onEdit: (item: any) => {
      // "All" is a system view route, not a board UUID.
      const routeId =
        item?.key === 'all' || item?.kind === 'system' ? 'all' : item?.id || 'all';
      this.router.navigate(['/', 'boards', routeId]);
    },
  };

  constructor(
    private router: Router,
    private boardService: BoardService
  ) {}
}

