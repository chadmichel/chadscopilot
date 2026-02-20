import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  GitHubUserProfile,
  GitHubProject,
  GitHubProjectItem,
  GitHubProjectField,
} from '../dto/github.dto';
import { CryptoService } from './crypto.service';

// ============ GraphQL Queries ============

const GET_VIEWER_QUERY = `
query GetViewer {
  viewer {
    login
    name
    avatarUrl
  }
}
`;

// Query using viewer to get all accessible projects (user + org projects)
const GET_VIEWER_PROJECTS_QUERY = `
query GetViewerProjects {
  viewer {
    login
    projectsV2(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        url
        closed
        owner {
          ... on Organization {
            login
          }
          ... on User {
            login
          }
        }
        items {
          totalCount
        }
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    }
    organizations(first: 20) {
      nodes {
        login
        projectsV2(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            id
            number
            title
            url
            closed
            owner {
              ... on Organization {
                login
              }
              ... on User {
                login
              }
            }
            items {
              totalCount
            }
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

const GET_ORG_PROJECTS_QUERY = `
query GetOrgProjects($login: String!) {
  viewer {
    login
  }
  organization(login: $login) {
    login
    projectsV2(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id
        number
        title
        url
        closed
        owner {
          ... on Organization {
            login
          }
          ... on User {
            login
          }
        }
        items {
          totalCount
        }
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  }
}
`;

const GET_PROJECT_ITEMS_QUERY = `
query GetProjectItems($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 50, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                field {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                  }
                }
                id
                name
                optionId
              }
              ... on ProjectV2ItemFieldTextValue {
                field {
                  ... on ProjectV2Field {
                    id
                    name
                  }
                }
                text
              }
            }
          }
          content {
            __typename
            ... on Issue {
              id
              number
              title
              body
              state
              url
              assignees(first: 10) {
                nodes {
                  login
                }
              }
              repository {
                nameWithOwner
              }
            }
            ... on PullRequest {
              id
              number
              title
              body
              state
              url
              assignees(first: 10) {
                nodes {
                  login
                }
              }
              repository {
                nameWithOwner
              }
            }
            ... on DraftIssue {
              id
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

const UPDATE_ITEM_FIELD_MUTATION = `
mutation UpdateProjectItemField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }
  ) {
    projectV2Item {
      id
    }
  }
}
`;

// ============ Service ============

@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private readonly GITHUB_GRAPHQL = 'https://api.github.com/graphql';
  private readonly PAT_KEY = 'github_pat';
  private readonly USER_KEY = 'github_user';

  private connectedSubject = new BehaviorSubject<boolean>(this.hasStoredToken());
  private userSubject = new BehaviorSubject<GitHubUserProfile | null>(this.getCachedUser());

  // Cached decrypted token (in memory only)
  private cachedToken: string | null = null;

  /** Observable: whether GitHub is connected */
  connected$ = this.connectedSubject.asObservable();

  /** Observable: current GitHub user profile */
  user$ = this.userSubject.asObservable();

  // Use Injector to avoid circular dependency (CryptoService -> AuthService -> potential issues)
  private _cryptoService: CryptoService | null = null;
  private get cryptoService(): CryptoService {
    if (!this._cryptoService) {
      this._cryptoService = this.injector.get(CryptoService);
    }
    return this._cryptoService;
  }

  constructor(private injector: Injector) {
    // Validate token on startup if present
    if (this.hasStoredToken()) {
      this.initializeToken().catch(() => {
        // Token invalid or decryption failed
      });
    }
  }

  /**
   * Initialize by decrypting and validating stored token
   */
  private async initializeToken(): Promise<void> {
    const token = await this.getToken();
    if (token) {
      this.cachedToken = token;
      try {
        await this.validateToken();
      } catch {
        this.clearToken();
      }
    }
  }

  // ============ Token Management ============

  /**
   * Check if there's a stored token (sync check for UI)
   */
  private hasStoredToken(): boolean {
    return !!localStorage.getItem(this.PAT_KEY);
  }

  /**
   * Get stored PAT (decrypts if encrypted)
   */
  async getToken(): Promise<string | null> {
    // Return cached token if available
    if (this.cachedToken) {
      return this.cachedToken;
    }

    const stored = localStorage.getItem(this.PAT_KEY);
    if (!stored) return null;

    // Check if it's encrypted
    if (this.cryptoService.isEncrypted(stored)) {
      const decrypted = await this.cryptoService.decrypt(stored);
      if (decrypted) {
        this.cachedToken = decrypted;
        return decrypted;
      }
      // Decryption failed (user changed?) - clear token
      this.clearToken();
      return null;
    }

    // Not encrypted (legacy or migration) - return as-is but migrate
    this.cachedToken = stored;
    // Migrate to encrypted storage in background
    this.migrateToEncrypted(stored);
    return stored;
  }

  /**
   * Migrate unencrypted token to encrypted storage
   */
  private async migrateToEncrypted(plainToken: string): Promise<void> {
    try {
      const encrypted = await this.cryptoService.encrypt(plainToken);
      localStorage.setItem(this.PAT_KEY, encrypted);
    } catch {
      // Migration failed, keep unencrypted for now
    }
  }

  /**
   * Store PAT (encrypted) and validate it
   */
  async setToken(token: string): Promise<GitHubUserProfile> {
    // Encrypt before storing
    const encrypted = await this.cryptoService.encrypt(token);
    localStorage.setItem(this.PAT_KEY, encrypted);
    this.cachedToken = token;
    this.connectedSubject.next(true);

    try {
      const user = await this.validateToken();
      return user;
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }

  /**
   * Clear stored token and user
   */
  clearToken(): void {
    localStorage.removeItem(this.PAT_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.cachedToken = null;
    this.connectedSubject.next(false);
    this.userSubject.next(null);
  }

  /**
   * Check if a token is stored (sync for UI binding)
   */
  isConnected(): boolean {
    return this.hasStoredToken();
  }

  /**
   * Get cached user profile
   */
  getCachedUser(): GitHubUserProfile | null {
    const cached = localStorage.getItem(this.USER_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  }

  // ============ API Methods ============

  /**
   * Validate token and fetch user profile
   */
  async validateToken(): Promise<GitHubUserProfile> {
    console.log('[GitHub] Validating token...');
    const result = await this.query<{ viewer: GitHubUserProfile }>(GET_VIEWER_QUERY);
    const user = result.viewer;
    console.log('[GitHub] Token validated, user:', user);

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.userSubject.next(user);

    return user;
  }

  /**
   * Get user's GitHub Projects (includes both user-owned and organization projects)
   */
  async getUserProjects(): Promise<GitHubProject[]> {
    console.log('[GitHub] getUserProjects called');

    type ProjectNode = {
      id: string;
      number: number;
      title: string;
      url: string;
      closed: boolean;
      owner: { login: string };
      items: { totalCount: number };
      fields: {
        nodes: Array<{
          id?: string;
          name?: string;
          options?: Array<{ id: string; name: string }>;
        }>;
      };
    };

    type ViewerProjectsResult = {
      viewer: {
        login: string;
        projectsV2: {
          nodes: ProjectNode[];
        };
        organizations: {
          nodes: Array<{
            login: string;
            projectsV2: {
              nodes: ProjectNode[];
            };
          }>;
        };
      };
    };

    console.log('[GitHub] Fetching viewer projects (user + org)...');
    const result = await this.query<ViewerProjectsResult>(GET_VIEWER_PROJECTS_QUERY);

    console.log('[GitHub] Raw GraphQL result:', result);

    // Collect projects from viewer
    const allProjectNodes: ProjectNode[] = [];

    const viewerProjects = result.viewer?.projectsV2?.nodes || [];
    console.log('[GitHub] Viewer projects found:', viewerProjects.length);
    allProjectNodes.push(...viewerProjects);

    // Collect projects from organizations
    const orgs = result.viewer?.organizations?.nodes || [];
    console.log('[GitHub] Organizations found:', orgs.length);
    for (const org of orgs) {
      const orgProjects = org.projectsV2?.nodes || [];
      console.log(`[GitHub] Org "${org.login}" projects:`, orgProjects.length);
      allProjectNodes.push(...orgProjects);
    }

    console.log('[GitHub] Total projects found:', allProjectNodes.length);

    const projects: GitHubProject[] = allProjectNodes.map(node => ({
      id: node.id,
      number: node.number,
      title: node.title,
      url: node.url,
      closed: node.closed,
      ownerLogin: node.owner.login,
      ownerType: node.owner.login === result.viewer.login ? 'user' : 'organization',
      fields: node.fields.nodes
        .filter(f => f.id && f.name)
        .map(f => ({
          id: f.id!,
          name: f.name!,
          options: f.options,
        })),
    }));

    console.log('[GitHub] Mapped projects:', projects);
    return projects;
  }

  /**
   * Get projects for a specific organization login
   */
  async getOrgProjects(orgLogin: string): Promise<GitHubProject[]> {
    console.log(`[GitHub] getOrgProjects called for: ${orgLogin}`);

    type ProjectNode = {
      id: string;
      number: number;
      title: string;
      url: string;
      closed: boolean;
      owner: { login: string };
      items: { totalCount: number };
      fields: {
        nodes: Array<{
          id?: string;
          name?: string;
          options?: Array<{ id: string; name: string }>;
        }>;
      };
    };

    type OrgProjectsResult = {
      viewer: { login: string };
      organization: {
        login: string;
        projectsV2: {
          nodes: ProjectNode[];
        };
      } | null;
    };

    const result = await this.query<OrgProjectsResult>(GET_ORG_PROJECTS_QUERY, { login: orgLogin });

    if (!result.organization) {
      throw new Error(`Organization "${orgLogin}" not found or access denied.`);
    }

    const nodes = result.organization.projectsV2.nodes || [];

    return nodes.map(node => ({
      id: node.id,
      number: node.number,
      title: node.title,
      url: node.url,
      closed: node.closed,
      ownerLogin: node.owner.login,
      ownerType: 'organization',
      fields: node.fields.nodes
        .filter(f => f.id && f.name)
        .map(f => ({
          id: f.id!,
          name: f.name!,
          options: f.options,
        })),
    }));
  }

  /**
   * Get all items in a project (handles pagination)
   */
  async getProjectItems(projectId: string): Promise<GitHubProjectItem[]> {
    const items: GitHubProjectItem[] = [];
    let cursor: string | null = null;

    do {
      type ProjectItemsResult = {
        node: {
          items: {
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string;
            };
            nodes: Array<{
              id: string;
              fieldValues: {
                nodes: Array<{
                  field?: { id: string; name: string };
                  id?: string;
                  name?: string;
                  optionId?: string;
                  text?: string;
                }>;
              };
              content: {
                __typename: string;
                id?: string;
                number?: number;
                title?: string;
                body?: string;
                state?: string;
                url?: string;
                assignees?: { nodes: Array<{ login: string }> };
                repository?: { nameWithOwner: string };
              } | null;
            }>;
          };
        };
      };
      const result: ProjectItemsResult = await this.query<ProjectItemsResult>(GET_PROJECT_ITEMS_QUERY, { projectId, cursor });

      const pageItems = result.node.items.nodes.map((node: ProjectItemsResult['node']['items']['nodes'][number]) => ({
        id: node.id,
        fieldValues: node.fieldValues.nodes
          .filter((fv: { field?: { id: string; name: string } }) => fv.field)
          .map((fv: { field?: { id: string; name: string }; id?: string; name?: string; optionId?: string; text?: string }) => ({
            field: fv.field!,
            id: fv.id,
            name: fv.name,
            optionId: fv.optionId,
            text: fv.text,
          })),
        content: this.mapContent(node.content),
      }));

      items.push(...pageItems);

      cursor = result.node.items.pageInfo.hasNextPage
        ? result.node.items.pageInfo.endCursor
        : null;
    } while (cursor);

    return items;
  }

  /**
   * Update a project item's field value (e.g., status)
   */
  async updateItemStatus(
    projectId: string,
    itemId: string,
    fieldId: string,
    optionId: string
  ): Promise<void> {
    await this.query(UPDATE_ITEM_FIELD_MUTATION, {
      projectId,
      itemId,
      fieldId,
      optionId,
    });
  }

  // ============ Private Helpers ============

  private mapContent(content: {
    __typename: string;
    id?: string;
    number?: number;
    title?: string;
    body?: string;
    state?: string;
    url?: string;
    assignees?: { nodes: Array<{ login: string }> };
    repository?: { nameWithOwner: string };
  } | null): GitHubProjectItem['content'] {
    if (!content) return null;

    const assignees = content.assignees?.nodes.map(a => a.login) || [];

    switch (content.__typename) {
      case 'Issue':
        return {
          __typename: 'Issue',
          id: content.id!,
          number: content.number!,
          title: content.title!,
          body: content.body,
          state: content.state as 'OPEN' | 'CLOSED',
          url: content.url!,
          assignees: assignees.map(login => ({ login })),
          repository: { nameWithOwner: content.repository!.nameWithOwner },
        };
      case 'PullRequest':
        return {
          __typename: 'PullRequest',
          id: content.id!,
          number: content.number!,
          title: content.title!,
          body: content.body,
          state: content.state as 'OPEN' | 'CLOSED' | 'MERGED',
          url: content.url!,
          assignees: assignees.map(login => ({ login })),
          repository: { nameWithOwner: content.repository!.nameWithOwner },
        };
      case 'DraftIssue':
        return {
          __typename: 'DraftIssue',
          id: content.id!,
          title: content.title!,
          body: content.body,
        };
      default:
        return null;
    }
  }

  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.getToken();
    console.log('[GitHub] Query - has token:', !!token);
    if (!token) {
      throw new Error('Not authenticated');
    }

    console.log('[GitHub] Making GraphQL request with variables:', variables);
    const response = await fetch(this.GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('[GitHub] Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GitHub] Error response body:', errorBody);
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Token expired or invalid');
      }
      if (response.status === 403) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining === '0') {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          throw new Error(
            `Rate limit exceeded. Try again ${resetDate ? `at ${resetDate.toLocaleTimeString()}` : 'later'}.`
          );
        }
        throw new Error('Access forbidden. Check token permissions.');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const json = await response.json();
    console.log('[GitHub] GraphQL response:', json);

    if (json.errors && json.errors.length > 0) {
      console.error('[GitHub] GraphQL errors:', json.errors);
      const error = json.errors[0];
      throw new Error(error.message || 'GraphQL error');
    }

    return json.data as T;
  }
}
