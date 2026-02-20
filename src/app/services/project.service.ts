import { Injectable } from '@angular/core';

export interface Project {
  id: string;
  name: string;
  folderPath: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  projects: Project[] = [];

  private get electron() {
    return (window as any).electronAPI;
  }

  async loadProjects(): Promise<void> {
    if (this.electron?.getProjects) {
      const rows = await this.electron.getProjects();
      this.projects = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        folderPath: r.folderPath,
      }));
    }
  }

  async addProject(name: string, folderPath: string): Promise<Project> {
    const id = crypto.randomUUID();

    if (this.electron?.addProject) {
      await this.electron.addProject(id, name, folderPath);
    }

    const project: Project = { id, name, folderPath };
    this.projects.push(project);
    return project;
  }

  getProject(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  async removeProject(id: string): Promise<void> {
    if (this.electron?.removeProject) {
      await this.electron.removeProject(id);
    }
    this.projects = this.projects.filter((p) => p.id !== id);
  }
}
