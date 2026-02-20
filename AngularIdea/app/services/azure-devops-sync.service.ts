import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { AzureDevOpsService } from './azure-devops.service';
import { BoardService } from './board.service';
import { TaskService } from './task.service';
import {
  AzureDevOpsIntegration,
  AzureDevOpsProject,
  AzureDevOpsWorkItem,
  AzureDevOpsFieldMapping,
  AzureDevOpsSyncResult,
  AzureDevOpsSyncStatus,
  TaskAzureDevOpsMetadata,
} from '../dto/azure-devops.dto';
import { TaskDto, TaskStatus, TaskPriority } from '../dto/task.dto';

const ADO_INTEGRATIONS_KEY = 'ado_integrations';

@Injectable({
  providedIn: 'root',
})
export class AzureDevOpsSyncService {
  private integrationsSubject = new BehaviorSubject<AzureDevOpsIntegration[]>(
    this.loadIntegrations()
  );
  private syncStatusSubject = new BehaviorSubject<Map<string, AzureDevOpsSyncStatus>>(new Map());

  integrations$ = this.integrationsSubject.asObservable();
  syncStatus$ = this.syncStatusSubject.asObservable();

  constructor(
    private adoService: AzureDevOpsService,
    private boardService: BoardService,
    private taskService: TaskService
  ) {}

  // ============ Integration Management ============

  async importProject(
    project: AzureDevOpsProject,
    workItemTypes: string[],
    fieldMappings: AzureDevOpsFieldMapping[]
  ): Promise<AzureDevOpsIntegration> {
    const org = this.adoService.getOrganization();
    if (!org) {
      throw new Error('Not authenticated with Azure DevOps');
    }

    // 1. Create the board
    const boardResult = await firstValueFrom(
      this.boardService.createBoard({
        name: project.name,
        kind: 'azuredevops',
        azureDevOpsProjectUrl: `https://dev.azure.com/${org}/${project.name}`,
      })
    );

    if (!boardResult.success || !boardResult.id) {
      throw new Error('Failed to create board');
    }

    // 2. Create integration record
    const integration: AzureDevOpsIntegration = {
      id: this.generateId(),
      type: 'azure_devops_project',
      name: `${org} / ${project.name}`,
      organization: org,
      projectId: project.id,
      projectName: project.name,
      projectUrl: `https://dev.azure.com/${org}/${project.name}`,
      boardId: boardResult.id,
      fieldMappings,
      workItemTypes,
    };

    // 3. Save integration
    this.saveIntegration(integration);

    // 4. Update board with integration ID
    await firstValueFrom(
      this.boardService.updateBoard(boardResult.id, {
        azureDevOpsIntegrationId: integration.id,
      })
    );

    // 5. Initial sync
    await this.syncProject(integration.id);

    return integration;
  }

  getIntegrations(): AzureDevOpsIntegration[] {
    return this.integrationsSubject.value;
  }

  getIntegration(id: string): AzureDevOpsIntegration | null {
    return this.integrationsSubject.value.find((i) => i.id === id) || null;
  }

  getIntegrationByBoardId(boardId: string): AzureDevOpsIntegration | null {
    return this.integrationsSubject.value.find((i) => i.boardId === boardId) || null;
  }

  deleteIntegration(id: string): void {
    const integrations = this.integrationsSubject.value.filter((i) => i.id !== id);
    this.integrationsSubject.next(integrations);
    this.persistIntegrations(integrations);
  }

  // ============ Sync Operations ============

  async syncProject(integrationId: string): Promise<AzureDevOpsSyncResult> {
    const integration = this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    this.updateSyncStatus(integrationId, { inProgress: true });

    try {
      // Build WIQL query for selected work item types
      const typeFilter = integration.workItemTypes
        .map((t) => `[System.WorkItemType] = '${t}'`)
        .join(' OR ');

      const wiql =
        integration.wiqlQuery ||
        `SELECT [System.Id] FROM WorkItems WHERE (${typeFilter}) ORDER BY [System.ChangedDate] DESC`;

      // Fetch work items
      const workItems = await this.adoService.queryWorkItems(integration.projectName, wiql);

      // Get existing local tasks
      const localTasks = await this.getTasksForBoard(integration.boardId);

      const result: AzureDevOpsSyncResult = { created: 0, updated: 0, unchanged: 0, errors: [] };

      for (const wi of workItems) {
        try {
          const existing = localTasks.find((t) => t.azureDevOpsMetadata?.workItemId === wi.id);

          if (!existing) {
            await this.createTaskFromWorkItem(wi, integration);
            result.created++;
          } else {
            const changed = await this.updateTaskFromWorkItem(existing, wi, integration);
            if (changed) {
              result.updated++;
            } else {
              result.unchanged++;
            }
          }
        } catch (err) {
          result.errors.push(`Failed to process work item ${wi.id}: ${err}`);
        }
      }

      integration.lastSyncAt = new Date();
      this.saveIntegration(integration);

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

  async pushStatusChange(taskId: string, newStatus: TaskStatus): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task || !task.azureDevOpsMetadata) {
      throw new Error('Task not found or has no Azure DevOps metadata');
    }

    const meta = task.azureDevOpsMetadata;
    const integration = this.getIntegration(meta.integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const statusMapping = integration.fieldMappings.find((m) => m.localField === 'status');
    if (!statusMapping) {
      throw new Error('No status mapping configured');
    }

    const adoState = statusMapping.reverseMap[newStatus];
    if (!adoState) {
      throw new Error(`No ADO mapping for status: ${newStatus}`);
    }

    await this.adoService.updateWorkItemState(integration.projectName, meta.workItemId, adoState);

    const updatedMeta: TaskAzureDevOpsMetadata = {
      ...meta,
      adoState,
      lastSyncedAt: new Date(),
      localVersion: meta.localVersion + 1,
    };

    await firstValueFrom(
      this.taskService.updateTask(taskId, {
        status: newStatus,
        azureDevOpsMetadata: updatedMeta,
      })
    );
  }

  // ============ Private Helpers ============

  private async createTaskFromWorkItem(
    wi: AzureDevOpsWorkItem,
    integration: AzureDevOpsIntegration
  ): Promise<void> {
    const status = this.mapStatusFromWorkItem(wi, integration);
    const priority = this.mapPriorityFromWorkItem(wi, integration);
    const tags = this.parseAdoTags(wi.fields['System.Tags']);

    const task: Partial<TaskDto> = {
      title: wi.fields['System.Title'],
      description: wi.fields['System.Description'],
      status,
      priority,
      tags,
      boardId: integration.boardId,
      azureDevOpsMetadata: {
        integrationId: integration.id,
        organization: integration.organization,
        projectName: integration.projectName,
        workItemId: wi.id,
        workItemType: wi.fields['System.WorkItemType'],
        workItemUrl: `https://dev.azure.com/${integration.organization}/${integration.projectName}/_workitems/edit/${wi.id}`,
        adoState: wi.fields['System.State'],
        adoAssignedTo: wi.fields['System.AssignedTo']?.displayName,
        adoRev: wi.rev,
        lastSyncedAt: new Date(),
        localVersion: 0,
        remoteVersion: 0,
      },
    };

    await firstValueFrom(this.taskService.createTask(task));
  }

  private async updateTaskFromWorkItem(
    existingTask: TaskDto,
    wi: AzureDevOpsWorkItem,
    integration: AzureDevOpsIntegration
  ): Promise<boolean> {
    const newStatus = this.mapStatusFromWorkItem(wi, integration);
    const meta = existingTask.azureDevOpsMetadata!;

    const titleChanged = existingTask.title !== wi.fields['System.Title'];
    const statusChanged = existingTask.status !== newStatus;
    const descChanged = existingTask.description !== wi.fields['System.Description'];

    if (!titleChanged && !statusChanged && !descChanged) {
      return false;
    }

    const updates: Partial<TaskDto> = {
      title: wi.fields['System.Title'],
      status: newStatus,
      description: wi.fields['System.Description'],
      azureDevOpsMetadata: {
        ...meta,
        adoState: wi.fields['System.State'],
        adoAssignedTo: wi.fields['System.AssignedTo']?.displayName,
        adoRev: wi.rev,
        lastSyncedAt: new Date(),
        remoteVersion: meta.remoteVersion + 1,
      },
    };

    await firstValueFrom(this.taskService.updateTask(existingTask.id!, updates));
    return true;
  }

  private mapStatusFromWorkItem(
    wi: AzureDevOpsWorkItem,
    integration: AzureDevOpsIntegration
  ): TaskStatus {
    const statusMapping = integration.fieldMappings.find((m) => m.localField === 'status');
    if (!statusMapping) return 'backlog';

    const adoState = wi.fields['System.State'];
    return (statusMapping.valueMap[adoState] as TaskStatus) || 'backlog';
  }

  private mapPriorityFromWorkItem(
    wi: AzureDevOpsWorkItem,
    integration: AzureDevOpsIntegration
  ): TaskPriority | undefined {
    const priorityMapping = integration.fieldMappings.find((m) => m.localField === 'priority');
    if (!priorityMapping) return undefined;

    const adoPriority = wi.fields['Microsoft.VSTS.Common.Priority'];
    if (adoPriority === undefined) return undefined;

    return priorityMapping.valueMap[String(adoPriority)] as TaskPriority | undefined;
  }

  private parseAdoTags(tagsString?: string): string[] {
    if (!tagsString) return [];
    return tagsString
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  private async getTasksForBoard(boardId: string): Promise<TaskDto[]> {
    const result = await firstValueFrom(this.taskService.getBoardTasks(boardId));
    return result?.items?.map((item) => ({ id: item.id, ...item.item })) || [];
  }

  private async getTaskById(taskId: string): Promise<TaskDto | null> {
    const result = await firstValueFrom(this.taskService.getTask(taskId));
    return result || null;
  }

  // ============ Persistence ============

  private loadIntegrations(): AzureDevOpsIntegration[] {
    const stored = localStorage.getItem(ADO_INTEGRATIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((i: AzureDevOpsIntegration) => ({
          ...i,
          lastSyncAt: i.lastSyncAt ? new Date(i.lastSyncAt) : undefined,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }

  private persistIntegrations(integrations: AzureDevOpsIntegration[]): void {
    localStorage.setItem(ADO_INTEGRATIONS_KEY, JSON.stringify(integrations));
  }

  private saveIntegration(integration: AzureDevOpsIntegration): void {
    const integrations = this.integrationsSubject.value;
    const index = integrations.findIndex((i) => i.id === integration.id);

    if (index >= 0) {
      integrations[index] = integration;
    } else {
      integrations.push(integration);
    }

    this.integrationsSubject.next([...integrations]);
    this.persistIntegrations(integrations);
  }

  private updateSyncStatus(integrationId: string, updates: Partial<AzureDevOpsSyncStatus>): void {
    const statusMap = new Map(this.syncStatusSubject.value);
    const current = statusMap.get(integrationId) || {
      integrationId,
      inProgress: false,
    };
    statusMap.set(integrationId, { ...current, ...updates });
    this.syncStatusSubject.next(statusMap);
  }

  private generateId(): string {
    return `ado_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
