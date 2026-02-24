import { CopilotClient, defineTool } from '@github/copilot-sdk';
import type { SessionConfig, GetAuthStatusResponse } from '@github/copilot-sdk';
import { TasksService } from './tasks.service.js';
import { CalendarService } from './calendar.service.js';
import { DatabaseService } from './database.service.js';
import { ProjectsService } from './projects.service.js';
import { WorkspaceAgentsService } from './workspace-agents.service.js';
import { SyncLogService } from './sync-log.service.js';

export interface MessageCallbacks {
  onDelta: (delta: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface SessionEntry {
  session: any;
  callbacks: MessageCallbacks | null;
}

/**
 * Build provider config from environment variables.
 */
function buildSessionConfig(workingDirectory?: string): SessionConfig {
  const apiKey = process.env['COPILOT_API_KEY'];
  const model = process.env['COPILOT_MODEL'] || 'gpt-4.1';

  const config: SessionConfig = {
    model,
    streaming: true,
  };

  if (workingDirectory) {
    config.workingDirectory = workingDirectory;
  }

  if (apiKey) {
    const providerType =
      (process.env['COPILOT_PROVIDER'] as 'openai' | 'anthropic' | 'azure') ||
      'openai';

    const defaultBaseUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com',
      azure: '',
    };

    const baseUrl =
      process.env['COPILOT_BASE_URL'] || defaultBaseUrls[providerType] || '';

    config.provider = {
      type: providerType,
      baseUrl,
      apiKey,
    };
  }

  return config;
}

export class CopilotService {
  private client: CopilotClient | null = null;
  private sessions: Map<string, SessionEntry> = new Map();
  private tasksService?: TasksService;
  private calendarService?: CalendarService;
  private databaseService?: DatabaseService;
  private projectsService?: ProjectsService;
  private workspaceAgentsService?: WorkspaceAgentsService;
  private syncLogService?: SyncLogService;

  setServices(
    tasksService: TasksService,
    calendarService: CalendarService,
    databaseService: DatabaseService,
    projectsService: ProjectsService,
    workspaceAgentsService: WorkspaceAgentsService,
    syncLogService: SyncLogService
  ) {
    this.tasksService = tasksService;
    this.calendarService = calendarService;
    this.databaseService = databaseService;
    this.projectsService = projectsService;
    this.workspaceAgentsService = workspaceAgentsService;
    this.syncLogService = syncLogService;
  }

  async initialize(): Promise<void> {
    this.client = new CopilotClient();
  }

  private async getOrCreateSession(workspaceId: string, folderPath?: string): Promise<SessionEntry> {
    const existing = this.sessions.get(workspaceId);
    if (existing) return existing;

    if (!this.client) {
      throw new Error('CopilotClient not initialized');
    }

    const config = buildSessionConfig(folderPath || undefined);

    // Define tools
    config.tools = [
      defineTool('list_tasks', {
        description: 'Lists all tasks across all workspaces. Status values are "pending" (Backlog), "in_progress" (In Progress), and "done" (Complete).',
        handler: async () => {
          return this.tasksService?.getAll() || [];
        }
      }),
      defineTool('get_tasks_for_workspace', {
        description: 'Gets all tasks specifically for a given workspace UUID. Status values: "pending", "in_progress", "done".',
        parameters: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The UUID of the workspace' }
          },
          required: ['workspaceId']
        },
        handler: async ({ workspaceId }: { workspaceId: string }) => {
          return this.tasksService?.getByWorkspace(workspaceId) || [];
        }
      }),
      defineTool('list_calendar_events', {
        description: 'Lists all calendar events from synced Microsoft/Outlook accounts.',
        handler: async () => {
          return this.calendarService?.getAllEvents() || [];
        }
      }),
      defineTool('list_workspaces', {
        description: 'Lists all workspaces manages by the user. Each workspace usually points to a local folder.',
        handler: async () => {
          return this.databaseService?.getAllWorkspaces() || [];
        }
      }),
      defineTool('list_projects', {
        description: 'Lists all connected GitHub or external project integrations.',
        handler: async () => {
          return this.projectsService?.getAll() || [];
        }
      }),
      defineTool('list_workspace_agents', {
        description: 'Lists all AI agents/assistants assigned to specific workspaces.',
        handler: async () => {
          return this.workspaceAgentsService?.getAll() || [];
        }
      }),
      defineTool('list_sync_logs', {
        description: 'Lists recent synchronization logs, useful for checking if GitHub sync succeeded.',
        handler: async () => {
          return this.syncLogService?.getAll() || [];
        }
      })
    ];

    const session = await this.client.createSession(config);

    const entry: SessionEntry = { session, callbacks: null };

    session.on((event: any) => {
      if (!entry.callbacks) return;
      if (event.type === 'assistant.message_delta') {
        entry.callbacks.onDelta(event.data.deltaContent);
      }
    });

    this.sessions.set(workspaceId, entry);
    return entry;
  }

  async sendMessage(
    workspaceId: string,
    message: string,
    folderPath: string | undefined,
    callbacks: MessageCallbacks
  ): Promise<void> {
    let entry: SessionEntry;
    try {
      entry = await this.getOrCreateSession(workspaceId, folderPath);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      callbacks.onError(errorMessage);
      return;
    }

    entry.callbacks = callbacks;

    try {
      await entry.session.sendAndWait({ prompt: message });
      callbacks.onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      callbacks.onError(errorMessage);
    } finally {
      entry.callbacks = null;
    }
  }

  async getAuthStatus(): Promise<GetAuthStatusResponse | null> {
    if (!this.client) return null;
    try {
      return await this.client.getAuthStatus();
    } catch {
      return null;
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
      this.sessions.clear();
    }
  }
}
