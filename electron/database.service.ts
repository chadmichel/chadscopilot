import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import path from 'path';

export interface ProjectRow {
  id: string;
  name: string;
  folderPath: string;
  createdAt: string;
}

export class DatabaseService {
  private db: DatabaseSync;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'chadscopilot.db');
    console.log('Opening database at:', dbPath);
    this.db = new DatabaseSync(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folderPath TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  getAllProjects(): ProjectRow[] {
    const stmt = this.db.prepare('SELECT id, name, folderPath, createdAt FROM projects ORDER BY createdAt DESC');
    return stmt.all() as unknown as ProjectRow[];
  }

  addProject(id: string, name: string, folderPath: string): ProjectRow {
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare('INSERT INTO projects (id, name, folderPath, createdAt) VALUES (?, ?, ?, ?)');
    stmt.run(id, name, folderPath, createdAt);
    return { id, name, folderPath, createdAt };
  }

  removeProject(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}
