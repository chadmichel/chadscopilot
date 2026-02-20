import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AzureDevOpsUserProfile,
  AzureDevOpsProject,
  AzureDevOpsWorkItem,
  AzureDevOpsWorkItemType,
  AzureDevOpsWorkItemState,
} from '../dto/azure-devops.dto';
import { CryptoService } from './crypto.service';

@Injectable({
  providedIn: 'root',
})
export class AzureDevOpsService {
  private readonly ADO_API_VERSION = '7.0';
  private readonly PAT_KEY = 'ado_pat';
  private readonly ORG_KEY = 'ado_organization';
  private readonly USER_KEY = 'ado_user';

  private connectedSubject = new BehaviorSubject<boolean>(this.hasStoredCredentials());
  private userSubject = new BehaviorSubject<AzureDevOpsUserProfile | null>(this.getCachedUser());

  private cachedToken: string | null = null;
  private cachedOrganization: string | null = null;

  connected$ = this.connectedSubject.asObservable();
  user$ = this.userSubject.asObservable();

  private _cryptoService: CryptoService | null = null;
  private get cryptoService(): CryptoService {
    if (!this._cryptoService) {
      this._cryptoService = this.injector.get(CryptoService);
    }
    return this._cryptoService;
  }

  constructor(private injector: Injector) {
    if (this.hasStoredCredentials()) {
      this.initializeCredentials().catch(() => {});
    }
  }

  private async initializeCredentials(): Promise<void> {
    const token = await this.getToken();
    if (token) {
      this.cachedToken = token;
      this.cachedOrganization = localStorage.getItem(this.ORG_KEY);
      try {
        await this.validateCredentials();
      } catch {
        this.clearCredentials();
      }
    }
  }

  // ============ Credential Management ============

  private hasStoredCredentials(): boolean {
    return !!localStorage.getItem(this.PAT_KEY) && !!localStorage.getItem(this.ORG_KEY);
  }

  async getToken(): Promise<string | null> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    const stored = localStorage.getItem(this.PAT_KEY);
    if (!stored) return null;

    if (this.cryptoService.isEncrypted(stored)) {
      const decrypted = await this.cryptoService.decrypt(stored);
      if (decrypted) {
        this.cachedToken = decrypted;
        return decrypted;
      }
      this.clearCredentials();
      return null;
    }

    this.cachedToken = stored;
    this.migrateToEncrypted(stored);
    return stored;
  }

  private async migrateToEncrypted(plainToken: string): Promise<void> {
    try {
      const encrypted = await this.cryptoService.encrypt(plainToken);
      localStorage.setItem(this.PAT_KEY, encrypted);
    } catch {
      // Migration failed, keep unencrypted
    }
  }

  async setCredentials(organization: string, pat: string): Promise<AzureDevOpsUserProfile> {
    const encrypted = await this.cryptoService.encrypt(pat);
    localStorage.setItem(this.PAT_KEY, encrypted);
    localStorage.setItem(this.ORG_KEY, organization);

    this.cachedToken = pat;
    this.cachedOrganization = organization;
    this.connectedSubject.next(true);

    try {
      const user = await this.validateCredentials();
      return user;
    } catch (error) {
      this.clearCredentials();
      throw error;
    }
  }

  clearCredentials(): void {
    localStorage.removeItem(this.PAT_KEY);
    localStorage.removeItem(this.ORG_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.cachedToken = null;
    this.cachedOrganization = null;
    this.connectedSubject.next(false);
    this.userSubject.next(null);
  }

  getOrganization(): string | null {
    return this.cachedOrganization || localStorage.getItem(this.ORG_KEY);
  }

  isConnected(): boolean {
    return this.hasStoredCredentials();
  }

  getCachedUser(): AzureDevOpsUserProfile | null {
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

  async validateCredentials(): Promise<AzureDevOpsUserProfile> {
    const result = await this.get<{
      id: string;
      displayName: string;
      emailAddress?: string;
      publicAlias?: string;
    }>('https://app.vssps.visualstudio.com/_apis/profile/profiles/me');

    const profile: AzureDevOpsUserProfile = {
      id: result.id,
      displayName: result.displayName,
      emailAddress: result.emailAddress,
      publicAlias: result.publicAlias,
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(profile));
    this.userSubject.next(profile);
    return profile;
  }

  async getProjects(): Promise<AzureDevOpsProject[]> {
    const org = this.getOrganization();
    if (!org) throw new Error('Organization not set');

    const result = await this.get<{ value: AzureDevOpsProject[] }>(
      `https://dev.azure.com/${org}/_apis/projects`
    );
    return result.value;
  }

  async getWorkItemTypes(projectName: string): Promise<AzureDevOpsWorkItemType[]> {
    const org = this.getOrganization();
    if (!org) throw new Error('Organization not set');

    const result = await this.get<{
      value: Array<{
        name: string;
        referenceName: string;
        description?: string;
        color?: string;
        icon?: { url?: string };
      }>;
    }>(`https://dev.azure.com/${org}/${encodeURIComponent(projectName)}/_apis/wit/workitemtypes`);

    const types: AzureDevOpsWorkItemType[] = [];
    for (const wit of result.value) {
      const states = await this.getWorkItemTypeStates(projectName, wit.name);
      types.push({
        name: wit.name,
        referenceName: wit.referenceName,
        description: wit.description,
        color: wit.color,
        icon: wit.icon?.url,
        states,
      });
    }
    return types;
  }

  async getWorkItemTypeStates(
    projectName: string,
    typeName: string
  ): Promise<AzureDevOpsWorkItemState[]> {
    const org = this.getOrganization();
    if (!org) throw new Error('Organization not set');

    const result = await this.get<{
      value: Array<{
        name: string;
        color?: string;
        category: string;
      }>;
    }>(
      `https://dev.azure.com/${org}/${encodeURIComponent(projectName)}/_apis/wit/workitemtypes/${encodeURIComponent(typeName)}/states`
    );

    return result.value.map((s) => ({
      name: s.name,
      color: s.color,
      category: s.category as AzureDevOpsWorkItemState['category'],
    }));
  }

  async queryWorkItems(projectName: string, wiql: string): Promise<AzureDevOpsWorkItem[]> {
    const org = this.getOrganization();
    if (!org) throw new Error('Organization not set');

    const queryResult = await this.post<{ workItems?: Array<{ id: number; url: string }> }>(
      `https://dev.azure.com/${org}/${encodeURIComponent(projectName)}/_apis/wit/wiql`,
      { query: wiql }
    );

    if (!queryResult.workItems || queryResult.workItems.length === 0) {
      return [];
    }

    const ids = queryResult.workItems.map((wi) => wi.id);
    return this.getWorkItemsBatch(projectName, ids);
  }

  async getWorkItemsBatch(projectName: string, ids: number[]): Promise<AzureDevOpsWorkItem[]> {
    const org = this.getOrganization();
    if (!org) throw new Error('Organization not set');

    const allItems: AzureDevOpsWorkItem[] = [];
    const chunks = this.chunkArray(ids, 200);

    for (const chunk of chunks) {
      const result = await this.get<{ value: AzureDevOpsWorkItem[] }>(
        `https://dev.azure.com/${org}/${encodeURIComponent(projectName)}/_apis/wit/workitems`,
        {
          ids: chunk.join(','),
          $expand: 'all',
        }
      );
      allItems.push(...result.value);
    }
    return allItems;
  }

  async updateWorkItemState(
    projectName: string,
    workItemId: number,
    newState: string
  ): Promise<AzureDevOpsWorkItem> {
    const org = this.getOrganization();
    if (!org) throw new Error('Organization not set');

    const patchDocument = [
      {
        op: 'add',
        path: '/fields/System.State',
        value: newState,
      },
    ];

    return this.patch<AzureDevOpsWorkItem>(
      `https://dev.azure.com/${org}/${encodeURIComponent(projectName)}/_apis/wit/workitems/${workItemId}`,
      patchDocument,
      'application/json-patch+json'
    );
  }

  // ============ HTTP Helpers ============

  private async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const urlObj = new URL(url);
    urlObj.searchParams.set('api-version', this.ADO_API_VERSION);
    if (params) {
      Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
    }

    const response = await fetch(urlObj.toString(), {
      method: 'GET',
      headers: this.buildHeaders(token),
    });

    return this.handleResponse<T>(response);
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const urlObj = new URL(url);
    urlObj.searchParams.set('api-version', this.ADO_API_VERSION);

    const response = await fetch(urlObj.toString(), {
      method: 'POST',
      headers: this.buildHeaders(token),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  private async patch<T>(
    url: string,
    body: unknown,
    contentType = 'application/json'
  ): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new Error('Not authenticated');

    const urlObj = new URL(url);
    urlObj.searchParams.set('api-version', this.ADO_API_VERSION);

    const response = await fetch(urlObj.toString(), {
      method: 'PATCH',
      headers: this.buildHeaders(token, contentType),
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  private buildHeaders(token: string, contentType = 'application/json'): Record<string, string> {
    const authString = btoa(`:${token}`);
    return {
      Authorization: `Basic ${authString}`,
      'Content-Type': contentType,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 || response.status === 203) {
        this.clearCredentials();
        throw new Error('Token expired or invalid');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden. Check PAT permissions.');
      }
      const errorText = await response.text();
      throw new Error(`Azure DevOps API error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
