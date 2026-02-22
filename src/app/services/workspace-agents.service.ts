import { Injectable } from '@angular/core';

export interface WorkspaceAgent {
  id: string;
  workspaceId: string;
  name: string;
  summary: string;
  taskId: string;
  taskName: string;
  taskDescription: string;
}

@Injectable({
  providedIn: 'root',
})
export class WorkspaceAgentsService {
  private get electron() {
    return (window as any).electronAPI;
  }

  async getByWorkspace(workspaceId: string): Promise<WorkspaceAgent[]> {
    if (this.electron?.getWorkspaceAgents) {
      return await this.electron.getWorkspaceAgents(workspaceId);
    }
    return [];
  }

  async addAgent(agent: Omit<WorkspaceAgent, 'id'>): Promise<WorkspaceAgent> {
    if (this.electron?.addWorkspaceAgent) {
      return await this.electron.addWorkspaceAgent(agent);
    }
    throw new Error('electronAPI not available');
  }

  async updateAgent(id: string, fields: Partial<Omit<WorkspaceAgent, 'id'>>): Promise<void> {
    if (this.electron?.updateWorkspaceAgent) {
      await this.electron.updateWorkspaceAgent(id, fields);
    }
  }

  async removeAgent(id: string): Promise<void> {
    if (this.electron?.removeWorkspaceAgent) {
      await this.electron.removeWorkspaceAgent(id);
    }
  }
}
