/**
 * GitHub Integration DTOs
 */

// ============ GitHub API Response Types ============

export interface GitHubUserProfile {
  login: string;
  name?: string;
  avatarUrl?: string;
}

export interface GitHubProject {
  id: string;                    // GraphQL node_id
  number: number;                // Project number (e.g., #5)
  title: string;
  url: string;
  closed: boolean;
  ownerLogin: string;
  ownerType: 'user' | 'organization';
  fields: GitHubProjectField[];
}

export interface GitHubProjectField {
  id: string;
  name: string;
  options?: GitHubFieldOption[];  // Only for single-select fields
}

export interface GitHubFieldOption {
  id: string;
  name: string;
}

export interface GitHubProjectItem {
  id: string;                    // Project item node_id
  fieldValues: GitHubFieldValue[];
  content: GitHubItemContent | null;
}

export interface GitHubFieldValue {
  field: {
    id: string;
    name: string;
  };
  id?: string;
  name?: string;                 // For single-select values
  optionId?: string;             // For single-select values
  text?: string;                 // For text values
}

export type GitHubItemContent = GitHubIssue | GitHubPullRequest | GitHubDraftIssue;

export interface GitHubIssue {
  __typename: 'Issue';
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'OPEN' | 'CLOSED';
  url: string;
  assignees: { login: string }[];
  repository: {
    nameWithOwner: string;
  };
}

export interface GitHubPullRequest {
  __typename: 'PullRequest';
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  url: string;
  assignees: { login: string }[];
  repository: {
    nameWithOwner: string;
  };
}

export interface GitHubDraftIssue {
  __typename: 'DraftIssue';
  id: string;
  title: string;
  body?: string;
}

// ============ Integration Configuration Types ============

export interface GitHubIntegration {
  id: string;
  type: 'github_project';
  name: string;                    // GitHub project title
  githubProjectId: string;         // GraphQL node_id
  githubProjectNumber: number;
  githubProjectUrl: string;
  ownerType: 'user' | 'organization';
  ownerLogin: string;
  boardId: string;                 // Auto-created WhenIsDone board
  lastSyncAt?: Date;
  fieldMappings: FieldMapping[];
  statusFieldId?: string;          // For pushing status updates
}

export interface FieldMapping {
  githubFieldId: string;
  githubFieldName: string;
  localField: 'status' | 'priority' | 'tags';
  valueMap: Record<string, string>;    // GitHub value → local value
  reverseMap: Record<string, string>;  // local value → GitHub option ID
}

// ============ Task GitHub Metadata ============

export interface TaskGitHubMetadata {
  integrationId: string;
  githubItemId: string;
  githubIssueId?: string;
  githubIssueNumber?: number;
  githubRepoFullName?: string;
  githubUrl?: string;
  githubAssignees: string[];
  githubStatusOptionId?: string;
  lastSyncedAt: Date;
  localVersion: number;
  remoteVersion: number;
}

// ============ Sync Types ============

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

export interface SyncStatus {
  integrationId: string;
  inProgress: boolean;
  lastSyncAt?: Date;
  lastResult?: SyncResult;
  error?: string;
}

// ============ UI Types ============

export interface GitHubProjectListItem {
  project: GitHubProject;
  itemCount: number;
  isImported: boolean;
  integrationId?: string;
}

export interface StatusMappingOption {
  githubOption: GitHubFieldOption;
  localStatus: 'backlog' | 'ondeck' | 'inprocess' | 'complete' | null;
}
