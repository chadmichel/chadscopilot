import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { GitHubService } from './github.service';
import { BoardService } from './board.service';
import { TaskService } from './task.service';
import { LocalStoreService } from './local-store.service';
import {
  GitHubIntegration,
  GitHubProject,
  GitHubProjectItem,
  FieldMapping,
  SyncResult,
  SyncStatus,
  TaskGitHubMetadata,
} from '../dto/github.dto';
import { TaskDto, TaskStatus } from '../dto/task.dto';
import { BoardDto } from '../dto/board.dto';

const INTEGRATIONS_KEY = 'github_integrations';

@Injectable({
  providedIn: 'root'
})
export class GitHubSyncService {
  private integrationsSubject = new BehaviorSubject<GitHubIntegration[]>(this.loadIntegrations());
  private syncStatusSubject = new BehaviorSubject<Map<string, SyncStatus>>(new Map());

  /** Observable: all GitHub integrations */
  integrations$ = this.integrationsSubject.asObservable();

  /** Observable: sync status per integration */
  syncStatus$ = this.syncStatusSubject.asObservable();

  constructor(
    private githubService: GitHubService,
    private boardService: BoardService,
    private taskService: TaskService,
    private localStore: LocalStoreService
  ) { }

  // ============ Integration Management ============

  /**
   * Import a GitHub project - creates board and initial sync
   */
  async importProject(
    project: GitHubProject,
    fieldMappings: FieldMapping[]
  ): Promise<GitHubIntegration> {
    const user = this.githubService.getCachedUser();
    if (!user) {
      throw new Error('Not authenticated with GitHub');
    }

    // 1. Create the board
    const boardResult = await firstValueFrom(
      this.boardService.createBoard({
        name: project.title,
        kind: 'github',
        githubProjectUrl: project.url,
      })
    );

    if (!boardResult.success || !boardResult.id) {
      throw new Error('Failed to create board');
    }

    // 2. Find the status field ID for pushing updates
    const statusMapping = fieldMappings.find(m => m.localField === 'status');
    const statusFieldId = statusMapping?.githubFieldId;

    // 3. Create integration record
    const integration: GitHubIntegration = {
      id: this.generateId(),
      type: 'github_project',
      name: project.title,
      githubProjectId: project.id,
      githubProjectNumber: project.number,
      githubProjectUrl: project.url,
      ownerType: project.ownerType,
      ownerLogin: project.ownerLogin,
      boardId: boardResult.id,
      fieldMappings,
      statusFieldId,
    };

    // 4. Save integration
    this.saveIntegration(integration);

    // 5. Update board with integration ID
    await firstValueFrom(
      this.boardService.updateBoard(boardResult.id, {
        githubIntegrationId: integration.id,
      })
    );

    // 6. Initial sync
    await this.syncProject(integration.id);

    return integration;
  }

  /**
   * Get all integrations
   */
  getIntegrations(): GitHubIntegration[] {
    return this.integrationsSubject.value;
  }

  /**
   * Get integration by ID
   */
  getIntegration(id: string): GitHubIntegration | null {
    return this.integrationsSubject.value.find(i => i.id === id) || null;
  }

  /**
   * Get integration by board ID
   */
  getIntegrationByBoardId(boardId: string): GitHubIntegration | null {
    return this.integrationsSubject.value.find(i => i.boardId === boardId) || null;
  }

  /**
   * Delete an integration (does not delete the board)
   */
  deleteIntegration(id: string): void {
    const integrations = this.integrationsSubject.value.filter(i => i.id !== id);
    this.integrationsSubject.next(integrations);
    this.persistIntegrations(integrations);
  }

  // ============ Sync Operations ============

  /**
   * Sync a project - pull changes from GitHub
   */
  async syncProject(integrationId: string): Promise<SyncResult> {
    const integration = this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Update sync status
    this.updateSyncStatus(integrationId, { inProgress: true });

    try {
      // 1. Fetch items from GitHub
      const items = await this.githubService.getProjectItems(integration.githubProjectId);

      // 2. Get existing local tasks for this board
      const localTasks = await this.getTasksForBoard(integration.boardId);

      // 3. Process items
      const result: SyncResult = { created: 0, updated: 0, unchanged: 0, errors: [] };

      for (const item of items) {
        try {
          const existing = localTasks.find(
            t => t.githubMetadata?.githubItemId === item.id
          );

          if (!existing) {
            await this.createTaskFromItem(item, integration);
            result.created++;
          } else {
            const changed = await this.updateTaskFromItem(existing, item, integration);
            if (changed) {
              result.updated++;
            } else {
              result.unchanged++;
            }
          }
        } catch (err) {
          result.errors.push(`Failed to process item: ${err}`);
        }
      }

      // 4. Update integration last sync time
      integration.lastSyncAt = new Date();
      this.saveIntegration(integration);

      // 5. Update sync status
      this.updateSyncStatus(integrationId, {
        inProgress: false,
        lastSyncAt: integration.lastSyncAt,
        lastResult: result,
      });

      return result;

    } catch (err) {
      this.updateSyncStatus(integrationId, {
        inProgress: false,
        error: `Sync failed: ${err}`,
      });
      throw err;
    }
  }

  /**
   * Push a local status change to GitHub
   */
  async pushStatusChange(taskId: string, newStatus: TaskStatus): Promise<void> {
    // Get task with metadata
    const task = await this.getTaskById(taskId);
    if (!task || !task.githubMetadata) {
      throw new Error('Task not found or has no GitHub metadata');
    }

    const meta = task.githubMetadata;
    const integration = this.getIntegration(meta.integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (!integration.statusFieldId) {
      throw new Error('No status field configured for this integration');
    }

    // Find the mapping for status
    const statusMapping = integration.fieldMappings.find(m => m.localField === 'status');
    if (!statusMapping) {
      throw new Error('No status mapping configured');
    }

    // Get the GitHub option ID for this status
    const githubOptionId = statusMapping.reverseMap[newStatus];
    if (!githubOptionId) {
      throw new Error(`No GitHub mapping for status: ${newStatus}`);
    }

    // Push to GitHub
    await this.githubService.updateItemStatus(
      integration.githubProjectId,
      meta.githubItemId,
      integration.statusFieldId,
      githubOptionId
    );

    // Update local metadata
    const updatedMeta: TaskGitHubMetadata = {
      ...meta,
      githubStatusOptionId: githubOptionId,
      lastSyncedAt: new Date(),
      localVersion: meta.localVersion + 1,
    };

    await firstValueFrom(
      this.taskService.updateTask(taskId, {
        status: newStatus,
        githubMetadata: updatedMeta,
      })
    );
  }

  // ============ Private Helpers ============

  private async createTaskFromItem(
    item: GitHubProjectItem,
    integration: GitHubIntegration
  ): Promise<void> {
    const content = item.content;
    if (!content) return; // Skip items without content

    // Map status from GitHub field values
    const status = this.mapStatusFromItem(item, integration);

    // Build task
    const task: Partial<TaskDto> = {
      title: content.title,
      description: content.__typename !== 'DraftIssue' ? content.body : content.body,
      status,
      boardId: integration.boardId,
      githubMetadata: {
        integrationId: integration.id,
        githubItemId: item.id,
        githubIssueId: content.__typename !== 'DraftIssue' ? content.id : undefined,
        githubIssueNumber: content.__typename !== 'DraftIssue' ? content.number : undefined,
        githubRepoFullName: content.__typename !== 'DraftIssue' ? content.repository?.nameWithOwner : undefined,
        githubUrl: content.__typename !== 'DraftIssue' ? content.url : undefined,
        githubAssignees: content.__typename !== 'DraftIssue'
          ? content.assignees.map(a => a.login)
          : [],
        githubStatusOptionId: this.getStatusOptionId(item, integration),
        lastSyncedAt: new Date(),
        localVersion: 0,
        remoteVersion: 0,
      },
    };

    await firstValueFrom(this.taskService.createTask(task));
  }

  private async updateTaskFromItem(
    existingTask: TaskDto,
    item: GitHubProjectItem,
    integration: GitHubIntegration
  ): Promise<boolean> {
    const content = item.content;
    if (!content) return false;

    const newStatus = this.mapStatusFromItem(item, integration);
    const meta = existingTask.githubMetadata!;

    // Check if anything changed
    const titleChanged = existingTask.title !== content.title;
    const statusChanged = existingTask.status !== newStatus;
    const descChanged = existingTask.description !== (content.__typename !== 'DraftIssue' ? content.body : content.body);

    if (!titleChanged && !statusChanged && !descChanged) {
      return false;
    }

    // Update task
    const updates: Partial<TaskDto> = {
      title: content.title,
      status: newStatus,
      description: content.__typename !== 'DraftIssue' ? content.body : content.body,
      githubMetadata: {
        ...meta,
        githubAssignees: content.__typename !== 'DraftIssue'
          ? content.assignees.map(a => a.login)
          : meta.githubAssignees,
        githubStatusOptionId: this.getStatusOptionId(item, integration),
        lastSyncedAt: new Date(),
        remoteVersion: meta.remoteVersion + 1,
      },
    };

    await firstValueFrom(this.taskService.updateTask(existingTask.id!, updates));
    return true;
  }

  private mapStatusFromItem(item: GitHubProjectItem, integration: GitHubIntegration): TaskStatus {
    const statusMapping = integration.fieldMappings.find(m => m.localField === 'status');
    if (!statusMapping) return 'backlog';

    // Find the status field value
    const statusField = item.fieldValues.find(fv => fv.field.id === statusMapping.githubFieldId);
    if (!statusField || !statusField.name) return 'backlog';

    // Map to local status
    const localStatus = statusMapping.valueMap[statusField.name];
    return (localStatus as TaskStatus) || 'backlog';
  }

  private getStatusOptionId(item: GitHubProjectItem, integration: GitHubIntegration): string | undefined {
    const statusMapping = integration.fieldMappings.find(m => m.localField === 'status');
    if (!statusMapping) return undefined;

    const statusField = item.fieldValues.find(fv => fv.field.id === statusMapping.githubFieldId);
    return statusField?.optionId;
  }

  private async getTasksForBoard(boardId: string): Promise<TaskDto[]> {
    const result = await firstValueFrom(this.taskService.getBoardTasks(boardId));
    return result?.items?.map(item => ({ id: item.id, ...item.item })) || [];
  }

  private async getTaskById(taskId: string): Promise<TaskDto | null> {
    const result = await firstValueFrom(this.taskService.getTask(taskId));
    return result || null;
  }

  // ============ Persistence ============

  private loadIntegrations(): GitHubIntegration[] {
    const stored = localStorage.getItem(INTEGRATIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Restore Date objects
        return parsed.map((i: GitHubIntegration) => ({
          ...i,
          lastSyncAt: i.lastSyncAt ? new Date(i.lastSyncAt) : undefined,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }

  private persistIntegrations(integrations: GitHubIntegration[]): void {
    localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));
  }

  private saveIntegration(integration: GitHubIntegration): void {
    const integrations = this.integrationsSubject.value;
    const index = integrations.findIndex(i => i.id === integration.id);

    if (index >= 0) {
      integrations[index] = integration;
    } else {
      integrations.push(integration);
    }

    this.integrationsSubject.next([...integrations]);
    this.persistIntegrations(integrations);
  }

  private updateSyncStatus(integrationId: string, updates: Partial<SyncStatus>): void {
    const statusMap = new Map(this.syncStatusSubject.value);
    const current = statusMap.get(integrationId) || {
      integrationId,
      inProgress: false,
    };
    statusMap.set(integrationId, { ...current, ...updates });
    this.syncStatusSubject.next(statusMap);
  }

  private generateId(): string {
    return `gh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
