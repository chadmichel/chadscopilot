import * as msal from '@azure/msal-node';
import { shell, app } from 'electron';
import http from 'http';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { encrypt, decrypt } from './crypto.service.js';

const DEFAULT_TENANT_ID = 'common';
const DEFAULT_CLIENT_ID = 'c8f7283c-59ed-419c-b98c-65654a1ff93d';
const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = ['https://graph.microsoft.com/Calendars.Read', 'https://graph.microsoft.com/User.Read', 'offline_access'];

export class CalendarService {
    private db: DatabaseSync;
    private cachePath: string;

    constructor(db: DatabaseSync) {
        this.db = db;
        this.cachePath = path.join(app.getPath('userData'), 'msal_cache.json');
    }

    private getSettings(): { clientId: string; tenantId: string } {
        const stmt = this.db.prepare("SELECT token, organization, extra FROM tools WHERE toolType = 'calendar' LIMIT 1");
        const row = stmt.get() as any;

        let clientId = DEFAULT_CLIENT_ID;
        let tenantId = DEFAULT_TENANT_ID;

        if (row) {
            const dbToken = row.token ? decrypt(row.token) : '';
            if (dbToken && dbToken.trim()) clientId = dbToken.trim();

            if (row.organization && row.organization.trim()) tenantId = row.organization.trim();

            try {
                const extra = JSON.parse(row.extra || '{}');
                if (extra.clientId && extra.clientId.trim()) clientId = extra.clientId.trim();
                if (extra.tenantId && extra.tenantId.trim()) tenantId = extra.tenantId.trim();
            } catch { /* ignore invalid JSON */ }
        }

        return { clientId, tenantId };
    }

    private createPCA(): msal.PublicClientApplication {
        const { clientId, tenantId } = this.getSettings();
        console.log(`[CalendarService] Creating PCA with ClientID: ${clientId}, TenantID: ${tenantId}`);
        const config: msal.Configuration = {
            auth: {
                clientId,
                authority: `https://login.microsoftonline.com/${tenantId}`,
            },
            cache: {
                cachePlugin: this.createCachePlugin(),
            }
        };
        return new msal.PublicClientApplication(config);
    }

    private createCachePlugin(): msal.ICachePlugin {
        return {
            beforeCacheAccess: async (cacheContext) => {
                if (fs.existsSync(this.cachePath)) {
                    const encrypted = fs.readFileSync(this.cachePath, 'utf8');
                    const decrypted = decrypt(encrypted);
                    cacheContext.tokenCache.deserialize(decrypted);
                }
            },
            afterCacheAccess: async (cacheContext) => {
                if (cacheContext.cacheHasChanged) {
                    const content = cacheContext.tokenCache.serialize();
                    const encrypted = encrypt(content);
                    fs.writeFileSync(this.cachePath, encrypted, 'utf8');
                }
            }
        };
    }

    async login(): Promise<string | null> {
        const pca = this.createPCA();
        const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
            scopes: SCOPES,
            redirectUri: REDIRECT_URI,
        };

        const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const url = new URL(req.url!, REDIRECT_URI);
                const code = url.searchParams.get('code');

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>Authentication Successful</h1><p>You can close this window now.</p>');
                    server.close();

                    try {
                        const tokenResponse = await pca.acquireTokenByCode({
                            code,
                            scopes: SCOPES,
                            redirectUri: REDIRECT_URI,
                        });
                        resolve(tokenResponse.account?.homeAccountId || null);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    res.writeHead(400);
                    res.end('No code found');
                }
            });

            server.listen(3000, () => {
                shell.openExternal(authCodeUrl);
            });

            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timed out'));
            }, 60000);
        });
    }

    async getAccessToken(accountId: string): Promise<string | null> {
        const pca = this.createPCA();
        const account = await pca.getTokenCache().getAccountByHomeId(accountId);
        if (!account) return null;

        try {
            const response = await pca.acquireTokenSilent({
                account,
                scopes: SCOPES,
            });
            return response.accessToken;
        } catch (error) {
            if (error instanceof msal.InteractionRequiredAuthError) {
                return null; // Need to login again
            }
            throw error;
        }
    }

    async syncEvents(accountId: string): Promise<void> {
        const token = await this.getAccessToken(accountId);
        if (!token) throw new Error('Not authenticated');

        const url = 'https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=' + new Date().toISOString() + '&endDateTime=' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        console.log(`[CalendarService] Syncing events from: ${url}`);

        // Debug token
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log(`[CalendarService] Token Info - Audience: ${payload.aud}, Scopes: ${payload.scp || payload.scope}`);
            }
        } catch (e) {
            console.log('[CalendarService] Could not decode token log');
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'No error body');
            throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        const events = data.value || [];

        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO calendars (id, userId, subject, start, end, body, location, isAllDay, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'outlook')
    `);

        for (const event of events) {
            stmt.run(
                event.id,
                accountId,
                event.subject,
                event.start.dateTime,
                event.end.dateTime,
                event.bodyPreview || '',
                event.location?.displayName || '',
                event.isAllDay ? 1 : 0
            );
        }
    }

    async logout(): Promise<void> {
        if (fs.existsSync(this.cachePath)) {
            fs.unlinkSync(this.cachePath);
        }
    }

    getEvents(userId: string) {
        return this.db.prepare('SELECT * FROM calendars WHERE userId = ? ORDER BY start ASC').all(userId);
    }
}
