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
const SCOPES = ['https://graph.microsoft.com/Calendars.Read', 'https://graph.microsoft.com/Calendars.Read.Shared', 'https://graph.microsoft.com/User.Read', 'offline_access'];

export class CalendarService {
    private db: DatabaseSync;
    private cachePath: string;

    constructor(db: DatabaseSync) {
        this.db = db;
        this.cachePath = path.join(app.getPath('userData'), 'msal_cache.json');
    }

    private getSettings(): { clientId: string; tenantId: string } {
        const stmt = this.db.prepare("SELECT organization, extra FROM tools WHERE toolType = 'calendar' LIMIT 1");
        const row = stmt.get() as any;

        let clientId = DEFAULT_CLIENT_ID;
        let tenantId = DEFAULT_TENANT_ID;

        if (row) {
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
                    try {
                        const encrypted = fs.readFileSync(this.cachePath, 'utf8');
                        const decrypted = decrypt(encrypted);
                        if (decrypted) {
                            cacheContext.tokenCache.deserialize(decrypted);
                            console.log(`[CalendarService] MSAL Cache loaded from ${this.cachePath}`);
                        } else {
                            console.warn('[CalendarService] MSAL Cache decryption returned empty string');
                        }
                    } catch (err) {
                        console.error('[CalendarService] Failed to load MSAL cache', err);
                    }
                } else {
                    console.log('[CalendarService] MSAL Cache file not found yet');
                }
            },
            afterCacheAccess: async (cacheContext) => {
                if (cacheContext.cacheHasChanged) {
                    try {
                        const content = cacheContext.tokenCache.serialize();
                        const encrypted = encrypt(content);
                        fs.writeFileSync(this.cachePath, encrypted, 'utf8');
                        console.log(`[CalendarService] MSAL Cache saved to ${this.cachePath}`);
                    } catch (err) {
                        console.error('[CalendarService] Failed to save MSAL cache', err);
                    }
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
        if (!account) {
            console.warn(`[CalendarService] No account found in cache for ID: ${accountId}`);
            const allAccounts = await pca.getTokenCache().getAllAccounts();
            console.log(`[CalendarService] Available accounts in cache: ${allAccounts.length}`);
            allAccounts.forEach(a => console.log(`  - Account: ${a.username} (${a.homeAccountId})`));
            return null;
        }

        try {
            const response = await pca.acquireTokenSilent({
                account,
                scopes: SCOPES,
            });
            return response.accessToken;
        } catch (error) {
            console.error('[CalendarService] acquireTokenSilent failed', error);
            if (error instanceof msal.InteractionRequiredAuthError) {
                return null; // Need to login again
            }
            throw error;
        }
    }

    async syncEvents(accountId: string, otherUserEmail?: string): Promise<void> {
        const token = await this.getAccessToken(accountId);
        if (!token) throw new Error('Not authenticated');

        const now = new Date();
        const startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); // 4 weeks back
        const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // ~13 weeks forward

        const targetUser = otherUserEmail ? `users/${otherUserEmail}` : 'me';
        // Increase top to 999 and follow nextLink
        let url: string | null = `https://graph.microsoft.com/v1.0/${targetUser}/calendarview?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$top=999`;
        console.log(`[CalendarService] Syncing window for ${targetUser}: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

        const allEvents: any[] = [];

        while (url) {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Prefer': 'outlook.timezone="Central Standard Time"'
                }
            });

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'No error body');
                throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json() as any;
            const events = data.value || [];
            allEvents.push(...events);

            url = data['@odata.nextLink'] || null;
            if (url) {
                console.log(`[CalendarService] Following nextLink for more events... (total so far: ${allEvents.length})`);
            }
        }

        console.log(`[CalendarService] Successfully fetched ${allEvents.length} events for ${targetUser}`);

        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO calendars (id, userId, subject, start, end, body, location, isAllDay, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'outlook')
        `);

        for (const event of allEvents) {
            stmt.run(
                event.id,
                otherUserEmail || accountId,
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
