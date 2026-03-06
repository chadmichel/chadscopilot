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
      }),
      defineTool('list_time_logs', {
        description: 'Lists activity tracking logs for a specific date (YYYY-MM-DD). Use this to provide insights on how a user spent their time.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'The date in YYYY-MM-DD format. Defaults to today if not provided.' }
          }
        },
        handler: async ({ date }: { date?: string }) => {
          const targetDate = date || new Date().toISOString().split('T')[0];
          return this.databaseService?.getTimeLogs(targetDate) || [];
        }
      }),
      defineTool('get_daily_time_summary', {
        description: 'Provides a summarized breakdown of time spent per workspace for a specific date.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'The date in YYYY-MM-DD format. Defaults to today if not provided.' }
          }
        },
        handler: async ({ date }: { date?: string }) => {
          const targetDate = date || new Date().toISOString().split('T')[0];
          const logs = this.databaseService?.getTimeLogs(targetDate) || [];
          const totalSlots = logs.length;
          if (totalSlots === 0) return { totalMinutes: 0, breakdown: [] };

          const counts: Record<string, number> = {};
          logs.forEach(l => {
            const key = l.workspaceId || 'Other Activity';
            counts[key] = (counts[key] || 0) + 1;
          });

          const workspaces = this.databaseService?.getAllWorkspaces() || [];
          const breakdown = Object.entries(counts).map(([id, count]) => {
            const ws = workspaces.find(w => w.id === id);
            return {
              name: ws ? ws.name : id,
              minutes: count * 5,
              percentage: (count / totalSlots) * 100
            };
          });

          return {
            totalMinutes: totalSlots * 5,
            breakdown
          };
        }
      }),
      defineTool('update_time_log_notes', {
        description: 'Updates the notes for a specific activity log entry.',
        parameters: {
          type: 'object',
          properties: {
            logId: { type: 'string', description: 'The ID of the time log entry' },
            notes: { type: 'string', description: 'The new notes content' }
          },
          required: ['logId', 'notes']
        },
        handler: async ({ logId, notes }: { logId: string, notes: string }) => {
          return this.databaseService?.updateTimeLogNotes(logId, notes);
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
      try {
        await entry.session.sendAndWait({ prompt: message });
      } catch (err: any) {
        // If session is lost, try one retry
        if (err.message?.includes('Session not found')) {
          console.log(`[Copilot] Session lost for ${workspaceId}, recreating...`);
          this.sessions.delete(workspaceId);
          entry = await this.getOrCreateSession(workspaceId, folderPath);
          entry.callbacks = callbacks;
          await entry.session.sendAndWait({ prompt: message });
        } else {
          throw err;
        }
      }
      callbacks.onComplete();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message';
      callbacks.onError(errorMessage);
    } finally {
      entry.callbacks = null;
    }
  }

  async generateSummary(prompt: string): Promise<string> {
    if (!this.client) throw new Error('CopilotClient not initialized');
    const config = buildSessionConfig();
    const session = await this.client.createSession(config);
    let fullText = '';
    session.on((event: any) => {
      if (event.type === 'assistant.message_delta') {
        fullText += event.data.deltaContent;
      }
    });
    await session.sendAndWait({ prompt });
    return fullText;
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
