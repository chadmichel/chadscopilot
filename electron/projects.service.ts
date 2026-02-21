import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import type { ProjectRow } from './database.service.js';

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

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    externalId: row.externalId,
    toolId: row.toolId,
    type: row.type as ProjectType,
    lastSync: row.lastSync,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
  };
}

export class ProjectsService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  getAll(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY name ASC');
    return (stmt.all() as unknown as ProjectRow[]).map(rowToProject);
  }

  getById(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as unknown as ProjectRow | undefined;
    return row ? rowToProject(row) : null;
  }

  getByToolId(toolId: string): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE toolId = ? ORDER BY name ASC');
    return (stmt.all(toolId) as unknown as ProjectRow[]).map(rowToProject);
  }

  getByOrg(organizationId: string): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE organizationId = ? ORDER BY name ASC');
    return (stmt.all(organizationId) as unknown as ProjectRow[]).map(rowToProject);
  }

  add(project: Omit<Project, 'id'>): Project {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(
      `INSERT INTO projects (id, name, externalId, toolId, type, lastSync, organizationId, organizationName)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      id,
      project.name,
      project.externalId,
      project.toolId,
      project.type,
      project.lastSync,
      project.organizationId,
      project.organizationName,
    );
    return { id, ...project };
  }

  update(id: string, fields: Partial<Omit<Project, 'id'>>): void {
    const allowed = [
      'name', 'externalId', 'toolId', 'type',
      'lastSync', 'organizationId', 'organizationName',
    ];
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const key of allowed) {
      if (!(key in fields)) continue;
      updates.push(`${key} = ?`);
      values.push((fields as Record<string, string | number | null>)[key]);
    }
    if (updates.length === 0) return;
    values.push(id);
    const stmt = this.db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  removeByToolId(toolId: string): void {
    this.db.prepare('DELETE FROM projects WHERE toolId = ?').run(toolId);
  }
}
