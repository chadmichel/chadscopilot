import { Observable } from 'rxjs';
import { ToolbarAction, Metric } from '../page-toolbar/page-toolbar.types';
import { QueryOptions, QueryResult } from '../common-dto/query.dto';
import { Params } from '@angular/router';
import { ColDef, GridOptions } from 'ag-grid-community';

/**
 * Column definition for the DataGrid component
 * Extends ag-Grid's ColDef with some custom properties
 */
export interface DataGridColumnDef extends ColDef {
  field: string;
  headerName: string;
  type?:
    | 'text'
    | 'date'
    | 'number'
    | 'boolean'
    | 'select'
    | 'id'
    | 'currency'
    | 'checkbox';

  options?: { label: string; value: any }[]; // For select fields
  loadOptions?: () => Observable<{ label: string; value: any }[]>; // For async select fields
}

/**
 * DataGrid data service interface
 * Similar to ItemListDataService but with additional methods for DataGrid features
 */
export interface DataGridDataService<T> {
  parseParams: (params: Params, queryParams: Params) => QueryOptions;
  loadItems(params: QueryOptions): Observable<QueryResult<T>>;
  deleteItem?(params: QueryOptions, item: any): Observable<any>;
  updateHeader?(params: QueryOptions, items: any[], total: number): string;
  saveChanges?(params: QueryOptions, items: any[]): Observable<any>;
  newItem?(params: QueryOptions): any;
}

/**
 * Configuration options for the DataGrid component
 */
export interface DataGridConfig {
  header: string;
  columnDefs: DataGridColumnDef[];
  dataService: DataGridDataService<any>;

  // Feature flags
  supportsAdd?: boolean;
  supportsEdit?: boolean;
  supportsDelete?: boolean;
  supportsExport?: boolean;
  supportsInlineEdit?: boolean;

  enableSorting?: boolean;
  enableFilter?: boolean;

  // UI configuration
  customToolbarItems?: ToolbarAction[];
  metrics?: Metric[];
}
