/**
 * Azure DevOps Integration DTOs
 */

// ============ Azure DevOps API Response Types ============

export interface AzureDevOpsUserProfile {
  id: string;
  displayName: string;
  emailAddress?: string;
  publicAlias?: string;
  imageUrl?: string;
}

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: 'wellFormed' | 'creating' | 'deleting' | 'new';
  visibility: 'private' | 'public';
}

export interface AzureDevOpsWorkItemType {
  name: string;
  referenceName: string;
  description?: string;
  color?: string;
  icon?: string;
  states: AzureDevOpsWorkItemState[];
}

export interface AzureDevOpsWorkItemState {
  name: string;
  color?: string;
  category: 'Proposed' | 'InProgress' | 'Resolved' | 'Completed' | 'Removed';
}

export interface AzureDevOpsWorkItem {
  id: number;
  rev: number;
  url: string;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.State': string;
    'System.WorkItemType': string;
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string;
      imageUrl?: string;
    };
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'Microsoft.VSTS.Common.Priority'?: number;
    'System.Tags'?: string;
    [key: string]: any;
  };
}

// ============ Integration Configuration Types ============

export interface AzureDevOpsIntegration {
  id: string;
  type: 'azure_devops_project';
  name: string;
  organization: string;
  projectId: string;
  projectName: string;
  projectUrl: string;
  boardId: string;
  lastSyncAt?: Date;
  fieldMappings: AzureDevOpsFieldMapping[];
  workItemTypes: string[];
  wiqlQuery?: string;
}

export interface AzureDevOpsFieldMapping {
  adoFieldName: string;
  adoFieldDisplayName: string;
  localField: 'status' | 'priority' | 'tags';
  valueMap: Record<string, string>;
  reverseMap: Record<string, string>;
}

// ============ Task Azure DevOps Metadata ============

export interface TaskAzureDevOpsMetadata {
  integrationId: string;
  organization: string;
  projectName: string;
  workItemId: number;
  workItemType: string;
  workItemUrl: string;
  adoState: string;
  adoAssignedTo?: string;
  adoRev: number;
  lastSyncedAt: Date;
  localVersion: number;
  remoteVersion: number;
}

// ============ Sync Types ============

export interface AzureDevOpsSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

export interface AzureDevOpsSyncStatus {
  integrationId: string;
  inProgress: boolean;
  lastSyncAt?: Date;
  lastResult?: AzureDevOpsSyncResult;
  error?: string;
}

// ============ UI Types ============

export interface AzureDevOpsProjectListItem {
  project: AzureDevOpsProject;
  workItemCount?: number;
  isImported: boolean;
  integrationId?: string;
}

export interface StateMappingRow {
  adoState: AzureDevOpsWorkItemState;
  localStatus: 'backlog' | 'ondeck' | 'inprocess' | 'complete' | null;
}
