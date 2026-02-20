import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import path from 'path';

export interface ProjectRow {
  id: string;
  name: string;
  folderPath: string;
  description: string;
  editorToolId: string;
  taskToolId: string;
  taskToolExternalId: string;
  tools: string;
  extra: string;
  createdAt: string;
}

export interface ToolRow {
  id: string;
  title: string;
  description: string;
  isEnabled: number;
  toolType: string;
  prompt: string;
  localPath: string;
  token: string;
  useGitHubToken: number;
  extra: string;
}

export interface TaskRow {
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

export class DatabaseService {
  private db: DatabaseSync;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'chadscopilot.db');
    console.log('Opening database at:', dbPath);
    this.db = new DatabaseSync(dbPath);
    this.initialize();
  }

  getDb(): DatabaseSync {
    return this.db;
  }

  private initialize(): void {
    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folderPath TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Migrate projects table — add new columns
    const projectMigrations = [
      "ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''",
      "ALTER TABLE projects ADD COLUMN editorToolId TEXT DEFAULT ''",
      "ALTER TABLE projects ADD COLUMN taskToolId TEXT DEFAULT ''",
      "ALTER TABLE projects ADD COLUMN taskToolExternalId TEXT DEFAULT ''",
      "ALTER TABLE projects ADD COLUMN tools TEXT DEFAULT '[]'",
      "ALTER TABLE projects ADD COLUMN extra TEXT DEFAULT '{}'",
    ];
    for (const sql of projectMigrations) {
      try { this.db.exec(sql); } catch { /* column already exists */ }
    }

    // Tools table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        isEnabled INTEGER DEFAULT 0,
        toolType TEXT NOT NULL,
        prompt TEXT DEFAULT '',
        localPath TEXT DEFAULT '',
        token TEXT DEFAULT '',
        useGitHubToken INTEGER DEFAULT 0,
        extra TEXT DEFAULT '{}'
      )
    `);

    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        externalId TEXT DEFAULT '',
        toolId TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        notes TEXT DEFAULT '',
        lastUpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        projectId TEXT DEFAULT '',
        extra TEXT DEFAULT '{}'
      )
    `);
  }

  // --- Projects ---

  getAllProjects(): ProjectRow[] {
    const stmt = this.db.prepare(
      `SELECT id, name, folderPath, description, editorToolId, taskToolId,
              taskToolExternalId, tools, extra, createdAt
       FROM projects ORDER BY createdAt DESC`
    );
    return stmt.all() as unknown as ProjectRow[];
  }

  addProject(id: string, name: string, folderPath: string): ProjectRow {
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare(
      'INSERT INTO projects (id, name, folderPath, createdAt) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, name, folderPath, createdAt);
    return {
      id, name, folderPath, createdAt,
      description: '', editorToolId: '', taskToolId: '',
      taskToolExternalId: '', tools: '[]', extra: '{}',
    };
  }

  updateProject(id: string, fields: Partial<Omit<ProjectRow, 'id' | 'createdAt'>>): void {
    const allowed = [
      'name', 'folderPath', 'description', 'editorToolId',
      'taskToolId', 'taskToolExternalId', 'tools', 'extra',
    ];
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    for (const key of allowed) {
      if (key in fields) {
        updates.push(`${key} = ?`);
        values.push((fields as Record<string, string | number | null>)[key]);
      }
    }
    if (updates.length === 0) return;
    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);
  }

  removeProject(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}
