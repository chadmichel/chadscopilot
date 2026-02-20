import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { encrypt, decrypt } from './crypto.service.js';
import type { ToolRow } from './database.service.js';

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
  extra: string;
}

const SEED_TOOLS: Omit<Tool, 'id'>[] = [
  { title: 'VS Code', description: 'Visual Studio Code editor', isEnabled: false, toolType: 'editor', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'Cursor', description: 'Cursor AI editor', isEnabled: false, toolType: 'editor', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'Google Antigravity', description: 'Google Antigravity editor', isEnabled: false, toolType: 'editor', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'MCP', description: 'Model Context Protocol server', isEnabled: false, toolType: 'mcp', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'RAG', description: 'Retrieval-Augmented Generation', isEnabled: false, toolType: 'rag', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'Github Repo', description: 'GitHub repository integration', isEnabled: false, toolType: 'repository', prompt: '', localPath: '', token: '', useGitHubToken: true, extra: '{}' },
  { title: 'Github Project', description: 'GitHub project management', isEnabled: false, toolType: 'project management', prompt: '', localPath: '', token: '', useGitHubToken: true, extra: '{}' },
  { title: 'Project Design', description: 'Project design documentation', isEnabled: true, toolType: 'project design', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'System Design', description: 'System design documentation', isEnabled: true, toolType: 'system design', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
  { title: 'UX Design', description: 'UX design documentation', isEnabled: true, toolType: 'ux design', prompt: '', localPath: '', token: '', useGitHubToken: false, extra: '{}' },
];

function rowToTool(row: ToolRow): Tool {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isEnabled: row.isEnabled === 1,
    toolType: row.toolType,
    prompt: row.prompt,
    localPath: row.localPath,
    token: decrypt(row.token),
    useGitHubToken: row.useGitHubToken === 1,
    extra: row.extra,
  };
}

export class ToolSettingsService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.seed();
  }

  private seed(): void {
    const count = this.db.prepare('SELECT COUNT(*) as cnt FROM tools').get() as unknown as { cnt: number };
    if (count.cnt > 0) return;

    const stmt = this.db.prepare(
      `INSERT INTO tools (id, title, description, isEnabled, toolType, prompt, localPath, token, useGitHubToken, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const tool of SEED_TOOLS) {
      stmt.run(
        crypto.randomUUID(),
        tool.title,
        tool.description,
        tool.isEnabled ? 1 : 0,
        tool.toolType,
        tool.prompt,
        tool.localPath,
        encrypt(tool.token),
        tool.useGitHubToken ? 1 : 0,
        tool.extra,
      );
    }
  }

  getAll(): Tool[] {
    const stmt = this.db.prepare('SELECT * FROM tools ORDER BY title');
    const rows = stmt.all() as unknown as ToolRow[];
    return rows.map(rowToTool);
  }

  getById(id: string): Tool | null {
    const stmt = this.db.prepare('SELECT * FROM tools WHERE id = ?');
    const row = stmt.get(id) as unknown as ToolRow | undefined;
    return row ? rowToTool(row) : null;
  }

  getByType(toolType: string): Tool[] {
    const stmt = this.db.prepare('SELECT * FROM tools WHERE toolType = ? ORDER BY title');
    const rows = stmt.all(toolType) as unknown as ToolRow[];
    return rows.map(rowToTool);
  }

  add(tool: Omit<Tool, 'id'>): Tool {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(
      `INSERT INTO tools (id, title, description, isEnabled, toolType, prompt, localPath, token, useGitHubToken, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      id,
      tool.title,
      tool.description,
      tool.isEnabled ? 1 : 0,
      tool.toolType,
      tool.prompt,
      tool.localPath,
      encrypt(tool.token),
      tool.useGitHubToken ? 1 : 0,
      tool.extra,
    );
    return { id, ...tool };
  }

  update(id: string, fields: Partial<Omit<Tool, 'id'>>): void {
    const allowed = [
      'title', 'description', 'isEnabled', 'toolType', 'prompt',
      'localPath', 'token', 'useGitHubToken', 'extra',
    ];
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const key of allowed) {
      if (!(key in fields)) continue;
      const val = (fields as Record<string, unknown>)[key];
      if (key === 'token') {
        updates.push('token = ?');
        values.push(encrypt(val as string));
      } else if (key === 'isEnabled' || key === 'useGitHubToken') {
        updates.push(`${key} = ?`);
        values.push(val ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(val as string);
      }
    }
    if (updates.length === 0) return;
    values.push(id);
    const stmt = this.db.prepare(`UPDATE tools SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM tools WHERE id = ?').run(id);
  }
}
