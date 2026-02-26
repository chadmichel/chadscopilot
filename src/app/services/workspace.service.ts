import { Injectable } from '@angular/core';

export interface EditorSolution {
  name: string;
  folderPath: string;
  editorToolId: string;
}

export interface ProcessAgent {
  id: string;
  type: 'Agent' | 'Code Analysis' | 'UI Analysis';
  prompt: string;
  exitCriteria?: string;
  promptNotes?: string;
}

export interface WorkProcess {
  agents: ProcessAgent[];
}

export interface Workspace {
  id: string;
  name: string;
  folderPath: string;
  description: string;
  editorToolId: string;
  taskToolId: string;
  taskToolExternalId: string;
  taskOrganization: string;
  tools: string;
  extra: string;
  solutions?: EditorSolution[];
  workProcess?: WorkProcess;
}

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  workspaces: Workspace[] = [];

  private get electron() {
    return (window as any).electronAPI;
  }

  async loadWorkspaces(): Promise<void> {
    if (this.electron?.getWorkspaces) {
      const rows = await this.electron.getWorkspaces();
      this.workspaces = rows.map((r: any) => {
        const extra = JSON.parse(r.extra || '{}');
        return {
          id: r.id,
          name: r.name,
          folderPath: r.folderPath,
          description: r.description || '',
          editorToolId: r.editorToolId || '',
          taskToolId: r.taskToolId || '',
          taskToolExternalId: r.taskToolExternalId || '',
          taskOrganization: r.taskOrganization || '',
          tools: r.tools || '[]',
          extra: r.extra || '{}',
          solutions: extra.solutions || [],
          workProcess: extra.workProcess || { agents: [] }
        };
      });
    }
  }

  async addWorkspace(name: string, folderPath: string): Promise<Workspace> {
    const id = crypto.randomUUID();

    if (this.electron?.addWorkspace) {
      await this.electron.addWorkspace(id, name, folderPath);
    }

    const workspace: Workspace = {
      id, name, folderPath,
      description: '', editorToolId: '', taskToolId: '',
      taskToolExternalId: '', taskOrganization: '', tools: '[]', extra: '{}',
    };
    this.workspaces.push(workspace);
    return workspace;
  }

  getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.find((w) => w.id === id);
  }

  async updateWorkspace(id: string, fields: Partial<Omit<Workspace, 'id'>>): Promise<void> {
    if (this.electron?.updateWorkspace) {
      await this.electron.updateWorkspace(id, fields);
    }
    const idx = this.workspaces.findIndex((w) => w.id === id);
    if (idx !== -1) {
      this.workspaces[idx] = { ...this.workspaces[idx], ...fields };
    }
  }

  async removeWorkspace(id: string): Promise<void> {
    if (this.electron?.removeWorkspace) {
      await this.electron.removeWorkspace(id);
    }
    this.workspaces = this.workspaces.filter((w) => w.id !== id);
    if (localStorage.getItem('chadscopilot_last_workspace_id') === id) {
      localStorage.removeItem('chadscopilot_last_workspace_id');
    }
  }
}
