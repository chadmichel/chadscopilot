import { Injectable } from '@angular/core';

export interface Tool {
  id: string;
  title: string;
  description: string;
  isEnabled: boolean;
  toolType: string;
  prompt: string;
  localPath: string;
  token: string;
  useGitHubToken: boolean;
  organization: string;
  extra: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToolSettingsService {
  tools: Tool[] = [];

  private get electron() {
    return (window as any).electronAPI;
  }

  async loadTools(): Promise<void> {
    if (this.electron?.getTools) {
      this.tools = await this.electron.getTools();
    }
  }

  async getById(id: string): Promise<Tool | null> {
    if (this.electron?.getTool) {
      return await this.electron.getTool(id);
    }
    return this.tools.find((t) => t.id === id) ?? null;
  }

  async getByType(toolType: string): Promise<Tool[]> {
    if (this.electron?.getToolsByType) {
      return await this.electron.getToolsByType(toolType);
    }
    return this.tools.filter((t) => t.toolType === toolType);
  }

  async addTool(tool: Omit<Tool, 'id'>): Promise<Tool> {
    if (this.electron?.addTool) {
      const created = await this.electron.addTool(tool);
      this.tools.push(created);
      return created;
    }
    throw new Error('electronAPI not available');
  }

  async updateTool(id: string, fields: Partial<Omit<Tool, 'id'>>): Promise<void> {
    if (this.electron?.updateTool) {
      await this.electron.updateTool(id, fields);
      const idx = this.tools.findIndex((t) => t.id === id);
      if (idx !== -1) {
        this.tools[idx] = { ...this.tools[idx], ...fields };
      }
    }
  }

  async removeTool(id: string): Promise<void> {
    if (this.electron?.removeTool) {
      await this.electron.removeTool(id);
      this.tools = this.tools.filter((t) => t.id !== id);
    }
  }
}
