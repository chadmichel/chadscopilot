import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import type { TaskRow } from './database.service.js';

export interface Task {
  id: string;
  title: string;
  description: string;
  externalId: string;
  toolId: string;
  status: string;
  notes: string;
  lastUpdatedAt: string;
  workspaceId: string;
  extra: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    externalId: row.externalId,
    toolId: row.toolId,
    status: row.status,
    notes: row.notes,
    lastUpdatedAt: row.lastUpdatedAt,
    workspaceId: row.workspaceId,
    extra: row.extra,
  };
}

export class TasksService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  getAll(): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks ORDER BY lastUpdatedAt DESC');
    return (stmt.all() as unknown as TaskRow[]).map(rowToTask);
  }

  getById(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as unknown as TaskRow | undefined;
    return row ? rowToTask(row) : null;
  }

  getByWorkspace(workspaceId: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE workspaceId = ? ORDER BY lastUpdatedAt DESC');
    return (stmt.all(workspaceId) as unknown as TaskRow[]).map(rowToTask);
  }

  add(task: Omit<Task, 'id' | 'lastUpdatedAt'>): Task {
    const id = crypto.randomUUID();
    const lastUpdatedAt = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO tasks (id, title, description, externalId, toolId, status, notes, lastUpdatedAt, workspaceId, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      id,
      task.title,
      task.description,
      task.externalId,
      task.toolId,
      task.status,
      task.notes,
      lastUpdatedAt,
      task.workspaceId,
      task.extra,
    );
    return { id, lastUpdatedAt, ...task };
  }

  update(id: string, fields: Partial<Omit<Task, 'id'>>): void {
    const allowed = [
      'title', 'description', 'externalId', 'toolId',
      'status', 'notes', 'workspaceId', 'extra',
    ];
    const updates: string[] = ['lastUpdatedAt = ?'];
    const values: (string | number | null)[] = [new Date().toISOString()];

    for (const key of allowed) {
      if (!(key in fields)) continue;
      updates.push(`${key} = ?`);
      values.push((fields as Record<string, string | number | null>)[key]);
    }
    values.push(id);
    const stmt = this.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }

  removeByWorkspace(workspaceId: string): void {
    this.db.prepare('DELETE FROM tasks WHERE workspaceId = ?').run(workspaceId);
  }
}
