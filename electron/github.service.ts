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
}
