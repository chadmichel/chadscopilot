export interface QueryResultItem<T> {
  item: T;
  id: string;
}

export interface QueryResult<T> {
  items: QueryResultItem<T>[];
  total: number;
  take: number;
  skip: number;
  extraData?: Record<string, any>;
}

export interface QueryOptions {
  id?: string;
  isNew?: boolean;
  take?: number;
  skip?: number;
  tenantId?: string;
  userId?: string;
  all?: boolean;
  excludeMine?: boolean;
  filter?: string;
  status?: string;
  contactId?: string;
  directReports?: boolean;
  clientId?: string;
  projectId?: string;
  lookupList?: boolean;
  week?: string;
  groupId?: string;
  integrationId?: string;
  metrics?: boolean;
  unread?: boolean;
  startDate?: string;
  endDate?: string;
  staff?: boolean;
  mapData?: boolean;
}

export interface SelectOption {
  label: string;
  value: any;
}

export interface ProcessResult {
  id: string;
  success: boolean;
  message?: string;
}
