import { Observable } from 'rxjs';

export interface DashboardCardData {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: string;
  color?: string;
  link?: string;
  backgroundColor?: string;
  onClick?: () => void;
}

export interface DashboardChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  data: any;
  options?: any;
  height?: string;
}

/**
 * Configuration for table data within a dashboard
 */
export interface DashboardTableData {
  title: string;
  columns: {
    field: string;
    header: string;
    type?: 'text' | 'date' | 'number' | 'boolean' | 'base64Svg';
    format?: string;
  }[];
  data?: any[];
  onRowSelect?: (row: any) => void;
  showPaginator?: boolean;
  pageSizeOptions?: number[]; // New property: Available page size options
  pageSize?: number; // New property: Default page size
  emptyMessage?: string; // Add empty message option
  customTemplate?: Record<string, (item: any, field?: string) => any>; // Custom cell templates
  flattenedData?: boolean; // New property: Whether to flatten the data structure
}

export interface DashboardHierarchyData {
  title: string;
  subTitle: string;
  data: any[];
  height?: string;
  selectable?: boolean;
  onNodeSelect?: (node: any) => void;
}

export interface DashboardItem {
  type: 'card' | 'chart' | 'table' | 'hierarchy'; // Added hierarchy type
  colSpan?: number; // Number of grid columns this item should span
  data: DashboardCardData | DashboardChartData | DashboardTableData | DashboardHierarchyData;
  loadItems?: () => Observable<any>;
  formatData?: (itemData: any, responseData: any) => any;
}

export interface DashboardConfig {
  header: string;
  subheader?: string;
  customToolbarItems?: {
    label: string;
    icon: string;
    onClick: () => void;
  }[];
  items: DashboardItem[];
  refreshInterval?: number; // In milliseconds
}
