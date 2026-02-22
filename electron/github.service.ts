import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ConnectivityResult {
  ok: boolean;
  login: string;
  error?: string;
}

export interface GitHubOrg {
  id: number;
  login: string;
  avatar_url: string;
}

export interface GitHubProject {
  id: string;
  title: string;
  number: number;
  url: string;
  closed: boolean;
}

export interface GitHubProjectItem {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  url: string;
  number: number | null;
}

export class GitHubService {
  async checkConnectivity(token: string): Promise<ConnectivityResult> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'ChadsCopilot',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        return { ok: false, login: '', error: `HTTP ${response.status}: ${body}` };
      }

      const data = await response.json() as { login: string };
      return { ok: true, login: data.login };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, login: '', error: message };
    }
  }

  async getOrganizations(token: string): Promise<GitHubOrg[]> {
    try {
      const response = await fetch('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'ChadsCopilot',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as GitHubOrg[];
      return data.map((org) => ({
        id: org.id,
        login: org.login,
        avatar_url: org.avatar_url,
      }));
    } catch {
      return [];
    }
  }

  async getOrgProjects(token: string, org: string): Promise<GitHubProject[]> {
    const query = `
      query($org: String!) {
        organization(login: $org) {
          projectsV2(first: 50) {
            nodes {
              id
              title
              number
              url
              closed
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ChadsCopilot',
        },
        body: JSON.stringify({ query, variables: { org } }),
      });

      if (!response.ok) return [];

      const data = await response.json() as {
        data?: { organization?: { projectsV2?: { nodes?: GitHubProject[] } } };
      };
      return data?.data?.organization?.projectsV2?.nodes || [];
    } catch {
      return [];
    }
  }

  async getProjectItems(
    token: string,
    projectId: string,
    log?: (level: string, message: string, detail?: string) => void,
  ): Promise<{ items: GitHubProjectItem[]; error?: string }> {
    const query = `
      query($projectId: ID!, $cursor: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                type
                statusField: fieldValueByName(name: "Status") {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                  }
                }
                titleField: fieldValueByName(name: "Title") {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                  }
                }
                content {
                  ... on Issue {
                    title
                    body
                    url
                    number
                  }
                  ... on PullRequest {
                    title
                    body
                    url
                    number
                  }
                  ... on DraftIssue {
                    title
                    body
                  }
                }
              }
            }
          }
        }
      }
    `;

    const allItems: GitHubProjectItem[] = [];
    let cursor: string | null = null;
    let errorMsg: string | undefined;
    const emit = log || ((_l: string, msg: string, d?: string) => console.log(`[GitHub] ${msg}${d ? ': ' + d : ''}`));

    emit('info', 'Fetching project items from GitHub API', `projectId=${projectId}`);

    try {
      let page = 0;
      while (true) {
        page++;
        emit('debug', `GraphQL request page ${page}`, `cursor=${cursor || 'null'}`);

        const response = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'ChadsCopilot',
          },
          body: JSON.stringify({ query, variables: { projectId, cursor } }),
        });

        emit('debug', `HTTP response status: ${response.status}`);

        if (!response.ok) {
          const body = await response.text();
          errorMsg = `HTTP ${response.status}: ${body}`;
          emit('error', 'GraphQL HTTP error', errorMsg);
          break;
        }

        const raw = await response.json() as any;

        // Log the raw response structure (keys only, not full body)
        const topKeys = Object.keys(raw || {});
        emit('debug', 'Response top-level keys', topKeys.join(', '));

        if (raw.data) {
          const dataKeys = Object.keys(raw.data || {});
          emit('debug', 'Response data keys', dataKeys.join(', '));
          if (raw.data.node) {
            const nodeKeys = Object.keys(raw.data.node || {});
            emit('debug', 'Response node keys', nodeKeys.join(', '));
          } else {
            emit('debug', 'Response data.node is', String(raw.data.node));
          }
        }

        // Check for GraphQL-level errors
        if (raw.errors) {
          const errText = raw.errors.map((e: any) => e.message).join('; ');
          errorMsg = `GraphQL: ${errText}`;
          emit('error', 'GraphQL errors returned', JSON.stringify(raw.errors));
        }

        const data = raw as {
          data?: {
            node?: {
              items?: {
                pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
                nodes?: any[];
              };
            };
          };
        };

        if (!data?.data?.node) {
          errorMsg = 'Project node returned null — your PAT token likely needs the "project" scope (classic) or "Organization > Projects: Read" permission (fine-grained)';
          emit('error', errorMsg);
          break;
        }

        const items = data.data.node.items;
        const nodes = items?.nodes || [];
        emit('info', `Page ${page}: fetched ${nodes.length} items`);

        let fromContent = 0;
        let fromFieldValues = 0;
        for (const node of nodes) {
          const content = node.content;
          const status = node.statusField?.name || '';
          const fieldTitle = node.titleField?.text || '';

          if (content && (content.title || content.body)) {
            // Full content available (token has repo access)
            fromContent++;
            allItems.push({
              id: node.id,
              type: node.type || 'UNKNOWN',
              title: content.title || fieldTitle,
              body: content.body || '',
              status,
              url: content.url || '',
              number: content.number ?? null,
            });
          } else if (fieldTitle) {
            // Content is null but we have field values (token lacks repo access)
            fromFieldValues++;
            allItems.push({
              id: node.id,
              type: node.type || 'UNKNOWN',
              title: fieldTitle,
              body: '',
              status,
              url: '',
              number: null,
            });
          } else {
            emit('debug', `Skipped item ${node.id}: no content and no title field`);
          }
        }

        if (fromFieldValues > 0) {
          emit('info', `${fromFieldValues} items loaded from field values (token may lack repo access — titles available but no descriptions/URLs)`);
        }
        if (fromContent > 0) {
          emit('info', `${fromContent} items loaded with full content`);
        }

        if (!items?.pageInfo?.hasNextPage) {
          emit('debug', 'No more pages');
          break;
        }
        cursor = items.pageInfo.endCursor || null;
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Unknown fetch error';
      emit('error', 'getProjectItems exception', errorMsg);
    }

    emit('info', `Total items fetched: ${allItems.length}`);
    return { items: allItems, error: errorMsg };
  }

  /**
   * Read a Copilot OAuth token from ~/.config/github-copilot/apps.json.
   * Tries each stored app token until one succeeds, or returns null.
   */
  readCopilotToken(): string | null {
    try {
      const appsPath = path.join(os.homedir(), '.config', 'github-copilot', 'apps.json');
      const raw = fs.readFileSync(appsPath, 'utf-8');
      const apps = JSON.parse(raw) as Record<string, { oauth_token?: string }>;
      // Return the first token found
      for (const app of Object.values(apps)) {
        if (app.oauth_token) return app.oauth_token;
      }
    } catch {
      // File not found or parse error
    }
    return null;
  }

  /** Use the Copilot stored token to check connectivity */
  async checkConnectivityViaCopilotToken(): Promise<ConnectivityResult> {
    const token = this.readCopilotToken();
    if (!token) {
      return { ok: false, login: '', error: 'No Copilot token found' };
    }
    return this.checkConnectivity(token);
  }

  /** Use the Copilot stored token to list organizations */
  async getOrganizationsViaCopilotToken(): Promise<GitHubOrg[]> {
    const token = this.readCopilotToken();
    if (!token) return [];
    return this.getOrganizations(token);
  }
}
