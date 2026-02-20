export type BoardKind = 'system' | 'user' | 'github' | 'azuredevops';

export interface BoardMetricsDto {
  backlogTotal: number;
  onDeckTotal: number;
  inProgressTotal: number;
  completedTotal: number;
  percentDone: number; // 0-100
  avgInProcessHours: number; // average age of tasks currently in-process (hours)
}

export interface BoardDto {
  name: string;
  kind: BoardKind;
  key?: string; // e.g. "all" for system board
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  metrics?: BoardMetricsDto;
  // GitHub integration fields (only for kind: 'github')
  githubIntegrationId?: string;
  githubProjectUrl?: string;
  // Azure DevOps integration fields (only for kind: 'azuredevops')
  azureDevOpsIntegrationId?: string;
  azureDevOpsProjectUrl?: string;
}

