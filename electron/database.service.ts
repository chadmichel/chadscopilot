import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import path from 'path';

export interface WorkspaceRow {
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
  workspaceId: string;
  extra: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  externalId: string;
  toolId: string;
  type: string;
  lastSync: string;
  organizationId: string;
  organizationName: string;
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
    // Check if workspaces table already exists (legacy migration already ran)
    const hasWorkspaces = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='workspaces'"
    ).get();

    if (!hasWorkspaces) {
      // Legacy projects table (created if fresh DB, will be renamed below)
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          folderPath TEXT NOT NULL,
          createdAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      // Migrate projects table — add new columns (before rename)
      const columnMigrations = [
        "ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN editorToolId TEXT DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN taskToolId TEXT DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN taskToolExternalId TEXT DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN tools TEXT DEFAULT '[]'",
        "ALTER TABLE projects ADD COLUMN extra TEXT DEFAULT '{}'",
      ];
      for (const sql of columnMigrations) {
        try { this.db.exec(sql); } catch { /* column already exists */ }
      }

      // Rename projects → workspaces
      try { this.db.exec('ALTER TABLE projects RENAME TO workspaces'); } catch { /* already renamed */ }
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
        workspaceId TEXT DEFAULT '',
        extra TEXT DEFAULT '{}'
      )
    `);

    // Migrate tasks.projectId → tasks.workspaceId
    try { this.db.exec('ALTER TABLE tasks RENAME COLUMN projectId TO workspaceId'); } catch { /* already renamed or column doesn't exist */ }

    // Projects table (external project integrations)
    // Drop if it exists with wrong schema (from legacy migration bug)
    const projectsCols = this.db.prepare("PRAGMA table_info(projects)").all() as unknown as { name: string }[];
    if (projectsCols.length > 0 && !projectsCols.some((c) => c.name === 'toolId')) {
      this.db.exec('DROP TABLE projects');
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        externalId TEXT DEFAULT '',
        toolId TEXT DEFAULT '',
        type TEXT NOT NULL DEFAULT '',
        lastSync TEXT DEFAULT '',
        organizationId TEXT DEFAULT '',
        organizationName TEXT DEFAULT ''
      )
    `);
  }

  // --- Workspaces ---

  getAllWorkspaces(): WorkspaceRow[] {
    const stmt = this.db.prepare(
      `SELECT id, name, folderPath, description, editorToolId, taskToolId,
              taskToolExternalId, tools, extra, createdAt
       FROM workspaces ORDER BY createdAt DESC`
    );
    return stmt.all() as unknown as WorkspaceRow[];
  }

  addWorkspace(id: string, name: string, folderPath: string): WorkspaceRow {
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare(
      'INSERT INTO workspaces (id, name, folderPath, createdAt) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, name, folderPath, createdAt);
    return {
      id, name, folderPath, createdAt,
      description: '', editorToolId: '', taskToolId: '',
      taskToolExternalId: '', tools: '[]', extra: '{}',
    };
  }

  updateWorkspace(id: string, fields: Partial<Omit<WorkspaceRow, 'id' | 'createdAt'>>): void {
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
      `UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);
  }

  removeWorkspace(id: string): void {
    const stmt = this.db.prepare('DELETE FROM workspaces WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}
