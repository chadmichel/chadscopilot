import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import type { WorkspaceAgentRow } from './database.service.js';

export interface WorkspaceAgent {
  id: string;
  workspaceId: string;
  name: string;
  summary: string;
  taskId: string;
  taskName: string;
  taskDescription: string;
}

function rowToAgent(row: WorkspaceAgentRow): WorkspaceAgent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    summary: row.summary,
    taskId: row.taskId,
    taskName: row.taskName,
    taskDescription: row.taskDescription,
  };
}

export class WorkspaceAgentsService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  getByWorkspace(workspaceId: string): WorkspaceAgent[] {
    const stmt = this.db.prepare(
      'SELECT * FROM workspace_agents WHERE workspaceId = ? ORDER BY name ASC'
    );
    return (stmt.all(workspaceId) as unknown as WorkspaceAgentRow[]).map(rowToAgent);
  }

  getById(id: string): WorkspaceAgent | null {
    const stmt = this.db.prepare('SELECT * FROM workspace_agents WHERE id = ?');
    const row = stmt.get(id) as unknown as WorkspaceAgentRow | undefined;
    return row ? rowToAgent(row) : null;
  }

  countByWorkspace(workspaceId: string): number {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as cnt FROM workspace_agents WHERE workspaceId = ?'
    );
    const row = stmt.get(workspaceId) as unknown as { cnt: number };
    return row.cnt;
  }

  add(agent: Omit<WorkspaceAgent, 'id'>): WorkspaceAgent {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(
      `INSERT INTO workspace_agents (id, workspaceId, name, summary, taskId, taskName, taskDescription)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      id,
      agent.workspaceId,
      agent.name,
      agent.summary,
      agent.taskId,
      agent.taskName,
      agent.taskDescription,
    );
    return { id, ...agent };
  }

  update(id: string, fields: Partial<Omit<WorkspaceAgent, 'id'>>): void {
    const allowed = ['workspaceId', 'name', 'summary', 'taskId', 'taskName', 'taskDescription'];
    const updates: string[] = [];
    const values: (string | null)[] = [];

    for (const key of allowed) {
      if (!(key in fields)) continue;
      updates.push(`${key} = ?`);
      values.push((fields as Record<string, string | null>)[key]);
    }
    if (updates.length === 0) return;
    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE workspace_agents SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM workspace_agents WHERE id = ?').run(id);
  }

  removeByWorkspace(workspaceId: string): void {
    this.db.prepare('DELETE FROM workspace_agents WHERE workspaceId = ?').run(workspaceId);
  }
}
