import { Observable } from 'rxjs';
import { Params } from '@angular/router';
import { QueryOptions, QueryResult } from '../common-dto/query.dto';
import { Metric, ToolbarAction } from '../page-toolbar/page-toolbar.types';

export interface ItemSelectDataService<T> {
  parseParams: (params: Params, queryParams: Params) => QueryOptions;
  loadItems(params: QueryOptions): Observable<QueryResult<T>>;
  itemsForSelect(params: QueryOptions): Observable<QueryResult<T>>;
  removeLink?(itemId: any): Observable<any>;
  linkItem?(itemId: any): Observable<any>;
  updateHeader?(params: QueryOptions, items: any[], total: number): string;
}

export interface ItemSelectorConfig {
  title: string;
  subTitle?: string;
  idField?: string;
  defaultSortField?: string;
  defaultSortOrder?: number;
  showPaginator?: boolean;
  enableSearch?: boolean;
  columns: ItemSelectorColumn[];
  dataService: ItemSelectDataService<any>;
  onSelect?: (item: any) => void;
  onRefresh?: () => void;
  customToolbarItems?: ToolbarAction[];
  metrics?: Metric[];
}

export interface ItemSelectorColumn {
  field: string;
  header: string;
  type?: string;
  format?: string;
  sortable?: boolean;
  mobileHide?: boolean;
  width?: string;
}
