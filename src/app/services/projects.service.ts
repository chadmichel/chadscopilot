import { Injectable } from '@angular/core';

export type ProjectType = 'GithubProject' | 'GithubIssues' | 'DevOps' | 'Jira';

export interface Project {
  id: string;
  name: string;
  externalId: string;
  toolId: string;
  type: ProjectType;
  lastSync: string;
  organizationId: string;
  organizationName: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  projects: Project[] = [];

  private get electron() {
    return (window as any).electronAPI;
  }

  async loadProjects(): Promise<void> {
    if (this.electron?.getProjects) {
      this.projects = await this.electron.getProjects();
    }
  }

  async getByToolId(toolId: string): Promise<Project[]> {
    if (this.electron?.getProjectsByTool) {
      return await this.electron.getProjectsByTool(toolId);
    }
    return this.projects.filter((p) => p.toolId === toolId);
  }

  async addProject(project: Omit<Project, 'id'>): Promise<Project> {
    if (this.electron?.addProject) {
      const created = await this.electron.addProject(project);
      this.projects.push(created);
      return created;
    }
    throw new Error('electronAPI not available');
  }

  async removeProject(id: string): Promise<void> {
    if (this.electron?.removeProject) {
      await this.electron.removeProject(id);
      this.projects = this.projects.filter((p) => p.id !== id);
    }
  }
}
