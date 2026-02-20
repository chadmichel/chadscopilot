import { Injectable } from '@angular/core';

export interface Task {
  id: string;
  title: string;
  description: string;
  externalId: string;
  toolId: string;
  status: string;
  notes: string;
  lastUpdatedAt: string;
  projectId: string;
  extra: string;
}

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  tasks: Task[] = [];

  private get electron() {
    return (window as any).electronAPI;
  }

  async loadTasks(): Promise<void> {
    if (this.electron?.getTasks) {
      this.tasks = await this.electron.getTasks();
    }
  }

  async getById(id: string): Promise<Task | null> {
    if (this.electron?.getTask) {
      return await this.electron.getTask(id);
    }
    return this.tasks.find((t) => t.id === id) ?? null;
  }

  async getByProject(projectId: string): Promise<Task[]> {
    if (this.electron?.getTasksByProject) {
      return await this.electron.getTasksByProject(projectId);
    }
    return this.tasks.filter((t) => t.projectId === projectId);
  }

  async addTask(task: Omit<Task, 'id' | 'lastUpdatedAt'>): Promise<Task> {
    if (this.electron?.addTask) {
      const created = await this.electron.addTask(task);
      this.tasks.push(created);
      return created;
    }
    throw new Error('electronAPI not available');
  }

  async updateTask(id: string, fields: Partial<Omit<Task, 'id'>>): Promise<void> {
    if (this.electron?.updateTask) {
      await this.electron.updateTask(id, fields);
      const idx = this.tasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        this.tasks[idx] = { ...this.tasks[idx], ...fields } as Task;
      }
    }
  }

  async removeTask(id: string): Promise<void> {
    if (this.electron?.removeTask) {
      await this.electron.removeTask(id);
      this.tasks = this.tasks.filter((t) => t.id !== id);
    }
  }
}
