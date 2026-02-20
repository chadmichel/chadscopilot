export type ProjectStatus = 'backlog' | 'ondeck' | 'inprocess' | 'done';

export interface ProjectDto {
  name: string;
  key?: string;
  description?: string;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
}

