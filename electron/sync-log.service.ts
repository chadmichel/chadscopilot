import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import type { SyncLogRow } from './database.service.js';

export interface SyncLogEntry {
  id: string;
  toolId: string;
  projectExternalId: string;
  projectTitle: string;
  level: string;
  message: string;
  detail: string;
  createdAt: string;
}

function rowToEntry(row: SyncLogRow): SyncLogEntry {
  return {
    id: row.id,
    toolId: row.toolId,
    projectExternalId: row.projectExternalId,
    projectTitle: row.projectTitle,
    level: row.level,
    message: row.message,
    detail: row.detail,
    createdAt: row.createdAt,
  };
}

export class SyncLogService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  getByTool(toolId: string, limit = 200): SyncLogEntry[] {
    const stmt = this.db.prepare(
      'SELECT * FROM sync_log WHERE toolId = ? ORDER BY createdAt DESC LIMIT ?',
    );
    return (stmt.all(toolId, limit) as unknown as SyncLogRow[]).map(rowToEntry);
  }

  add(entry: Omit<SyncLogEntry, 'id' | 'createdAt'>): SyncLogEntry {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO sync_log (id, toolId, projectExternalId, projectTitle, level, message, detail, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      id,
      entry.toolId,
      entry.projectExternalId,
      entry.projectTitle,
      entry.level,
      entry.message,
      entry.detail,
      createdAt,
    );
    return { id, createdAt, ...entry };
  }

  clearByTool(toolId: string): void {
    this.db.prepare('DELETE FROM sync_log WHERE toolId = ?').run(toolId);
  }
}
