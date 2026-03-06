import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import type { PrRow } from './database.service.js';

export interface PR {
    id: string;
    toolId: string;
    repositoryName: string;
    repositoryId: string;
    prNumber: number;
    timeToClose: number;
    authorId: string;
    authorName: string;
    openDate: string;
    closeDate: string;
    commentCount: number;
    linesOfCode: number;
}

export class PrsService {
    private db: DatabaseSync;

    constructor(db: DatabaseSync) {
        this.db = db;
    }

    getAll(): PR[] {
        const stmt = this.db.prepare('SELECT * FROM prs ORDER BY openDate DESC');
        return stmt.all() as unknown as PR[];
    }

    getById(id: string): PR | null {
        const stmt = this.db.prepare('SELECT * FROM prs WHERE id = ?');
        const row = stmt.get(id) as unknown as PR | undefined;
        return row || null;
    }

    getByToolId(toolId: string): PR[] {
        const stmt = this.db.prepare('SELECT * FROM prs WHERE toolId = ? ORDER BY openDate DESC');
        return stmt.all(toolId) as unknown as PR[];
    }

    getByRepository(repositoryName: string): PR[] {
        const stmt = this.db.prepare('SELECT * FROM prs WHERE repositoryName = ? ORDER BY openDate DESC');
        return stmt.all(repositoryName) as unknown as PR[];
    }

    getByToolAndRepo(toolId: string, repositoryName: string): PR[] {
        const stmt = this.db.prepare('SELECT * FROM prs WHERE toolId = ? AND repositoryName = ? ORDER BY openDate DESC');
        return stmt.all(toolId, repositoryName) as unknown as PR[];
    }

    getByPrNumber(toolId: string, repositoryName: string, prNumber: number): PR | null {
        const stmt = this.db.prepare('SELECT * FROM prs WHERE toolId = ? AND repositoryName = ? AND prNumber = ?');
        const row = stmt.get(toolId, repositoryName, prNumber) as unknown as PR | undefined;
        return row || null;
    }

    add(pr: Omit<PR, 'id'>): PR {
        const id = crypto.randomUUID();
        const stmt = this.db.prepare(
            `INSERT INTO prs (id, toolId, repositoryName, repositoryId, prNumber, timeToClose, authorId, authorName, openDate, closeDate, commentCount, linesOfCode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        stmt.run(
            id,
            pr.toolId,
            pr.repositoryName,
            pr.repositoryId,
            pr.prNumber,
            pr.timeToClose,
            pr.authorId,
            pr.authorName,
            pr.openDate,
            pr.closeDate,
            pr.commentCount,
            pr.linesOfCode,
        );
        return { id, ...pr };
    }

    update(id: string, fields: Partial<Omit<PR, 'id'>>): void {
        const allowed = [
            'toolId', 'repositoryName', 'repositoryId', 'prNumber',
            'timeToClose', 'authorId', 'authorName', 'openDate',
            'closeDate', 'commentCount', 'linesOfCode',
        ];
        const updates: string[] = [];
        const values: (string | number | null)[] = [];

        for (const key of allowed) {
            if (!(key in fields)) continue;
            const val = (fields as Record<string, unknown>)[key];
            updates.push(`${key} = ?`);
            values.push(val as string | number);
        }
        if (updates.length === 0) return;
        values.push(id);
        const stmt = this.db.prepare(`UPDATE prs SET ${updates.join(', ')} WHERE id = ?`);
        stmt.run(...values);
    }

    remove(id: string): void {
        this.db.prepare('DELETE FROM prs WHERE id = ?').run(id);
    }

    removeByToolAndRepo(toolId: string, repositoryName: string): void {
        this.db.prepare('DELETE FROM prs WHERE toolId = ? AND repositoryName = ?').run(toolId, repositoryName);
    }
}
