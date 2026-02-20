import { TaskGitHubMetadata } from './github.dto';
import { TaskAzureDevOpsMetadata } from './azure-devops.dto';

export type TaskStatus = 'backlog' | 'ondeck' | 'inprocess' | 'complete';
export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface TaskDto {
  // Optional because the backend list wrapper typically carries the id.
  // In board UI we often flatten QueryResultItem<T> → { id, ...dto }.
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  boardId?: string; // system board "all" is a view; tasks may still have a specific boardId
  projectId?: string;
  assigneeUserId?: string;
  reporterUserId?: string;
  dueAt?: string;
  tags?: string[];
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  // GitHub integration metadata
  githubMetadata?: TaskGitHubMetadata;
  // Azure DevOps integration metadata
  azureDevOpsMetadata?: TaskAzureDevOpsMetadata;
}

