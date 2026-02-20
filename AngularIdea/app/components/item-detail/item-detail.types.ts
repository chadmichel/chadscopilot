import { Observable } from 'rxjs';
import { ToolbarAction, Metric } from '../page-toolbar/page-toolbar.types';
import {
  ProcessResult,
  QueryOptions,
  QueryResult,
  SelectOption,
} from '../common-dto/query.dto';
import { Params } from '@angular/router';
import { ColumnDefinition } from '../item-list/item-list.types';
import { SafeHtml } from '@angular/platform-browser';

export type FormFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'password'
  | 'email'
  | 'checkbox'
  | 'textarea'
  | 'color'
  | 'token'
  | 'json'
  | 'schedules'
  | 'address';

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  options?: SelectOption[]; // For select fields
  loadOptions?: () => Observable<SelectOption[]>; // For async select fields
  required?: boolean;
  disabled?: boolean;
  newOnly?: boolean;
  format?: string;

  // Token field specific properties
  buttonText?: string; // Text to display on the button
  alwaysShowButton?: boolean; // Whether to always enable the button even when not editing
}

export interface ItemDetailDataService<T> {
  parseParams: (params: Params, queryParams: Params) => QueryOptions;
  loadItem(params: QueryOptions): Observable<T>;
  createItem(query: QueryOptions, item: any): Observable<ProcessResult>;
  updateItem(query: QueryOptions, item: any): Observable<ProcessResult>;
  deleteItem(query: QueryOptions): Observable<ProcessResult>;
  updateMetrics?(params: QueryOptions, items: any): Metric[];

  propUpdated?(
    item: any,
    updatedField: string,
    updatedValue: any
  ): Observable<any>;

  loadGridItems?(params: QueryOptions): Observable<QueryResult<any>>; // New method for loading grid items
}

export interface ItemDetailConfig {
  header: string;
  isEditable: boolean;
  supportsAdd: boolean;
  supportsDelete: boolean;
  breadcrumbField?: string;
  customToolbarItems?: ToolbarAction[];
  metrics?: Metric[];
  formLayout: FormField[];
  dataService: ItemDetailDataService<any>;
  updateSuccessMessage?: string;
  createSuccessMessage?: string;
  deleteSuccessMessage?: string;
  /**
   * Optional hook for the "Cancel" action while editing.
   * If provided, ItemDetail will call this instead of its default behavior.
   */
  onCancel?: () => void;

  // New grid/table related properties
  gridColumns?: ColumnDefinition[];
  gridHeader?: string;
  gridRowSelect?: (item: any) => void;
  gridRowDelete?: (item: any) => void;
}

export type DisplayMode = 'desktop' | 'mobile';

// Add this function to help determine display mode
export function getDisplayMode(): DisplayMode {
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}
