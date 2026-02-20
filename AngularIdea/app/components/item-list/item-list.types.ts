import { Params } from '@angular/router';
import { Observable } from 'rxjs';
import { QueryOptions, QueryResult } from '../common-dto/query.dto';
import { Metric, ToolbarAction } from '../page-toolbar/page-toolbar.types';

/**
 * Configuration for a metric card displayed above the list
 */
export interface MetricCard {
  /** Title displayed on the card */
  title: string;
  /** Icon class (e.g., 'pi pi-dollar') */
  icon?: string;
  /** Background color for the card */
  backgroundColor?: string;
  /** Text color for the card */
  color?: string;
  /** Method to load the metric value - should return an Observable with a number or string */
  loadValue: () => Observable<number | string>;
  /** Optional click handler */
  onClick?: () => void;
}

export interface ColumnDefinition {
  field: string;
  header: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'select' | 'id' | 'base64Svg';
  format?: string; // For dates or numbers
  options?: { label: string; value: any }[]; // For select fields
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  mobileHide?: boolean; // Add this property
}

export interface ItemListDataService<T> {
  parseParams: (params: Params, queryParams: Params) => QueryOptions;
  loadItems(params: QueryOptions): Observable<QueryResult<T>>;
  deleteItem?(params: QueryOptions, item: any): Observable<any>;
  updateHeader?(params: QueryOptions, items: any[], total: number): string;
}

/**
 * Defines the available view modes for the ItemList component
 */
export type ViewMode = 'table' | 'template';

export interface ItemListConfig {
  header: string;
  viewType?: 'table' | 'template';
  columns: ColumnDefinition[];
  dataService: ItemListDataService<any>;
  supportsAdd?: boolean;
  supportsEdit?: boolean;
  supportsDelete?: boolean;
  customToolbarItems?: ToolbarAction[];
  metrics?: Metric[];
  /** Metric cards displayed between toolbar and search - each card loads its own data */
  metricCards?: MetricCard[];
  defaultSortField?: string;
  defaultSortOrder?: 1 | -1;
  rowsPerPageOptions?: number[];
  enableSearch?: boolean;
  editRouteAppend?: string;
  onAdd?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  viewMode?: ViewMode; // New property to determine view mode

  // Template view specific properties
  templateConfig?: {
    layout?: 'grid' | 'list'; // Layout mode for data view
    rows?: number; // Number of rows per page
  };
}
