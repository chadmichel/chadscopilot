import 'dotenv/config';
import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { CopilotService } from './copilot.service.js';
import { DatabaseService } from './database.service.js';
import { ToolSettingsService } from './tool-settings.service.js';
import { TasksService } from './tasks.service.js';
import { ProjectsService } from './projects.service.js';
import { GitHubService } from './github.service.js';
import { SyncLogService } from './sync-log.service.js';
import { WorkspaceAgentsService } from './workspace-agents.service.js';
import { VsCodeService } from './vscode.service.js';
import { CursorService } from './cursor.service.js';
import { GoogleAntigravityService } from './google-antigravity.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hot reload in dev: restart Electron when dist-electron files change
if (!app.isPackaged) {
  import('electron-reload')
    .then((mod: any) => {
      mod.default(__dirname, {
        electron: path.join(
          __dirname,
          '..',
          'node_modules',
          '.bin',
          'electron',
        ),
        forceHardReset: true,
      });
    })
    .catch(() => {
      // electron-reload not available, skip
    });
}

const appIcon = nativeImage.createFromPath(
  path.join(__dirname, '..', 'logo.png'),
);

let mainWindow: BrowserWindow | null = null;
let copilotService: CopilotService | null = null;
let databaseService: DatabaseService | null = null;
let toolSettingsService: ToolSettingsService | null = null;
let tasksService: TasksService | null = null;
let projectsService: ProjectsService | null = null;
let syncLogService: SyncLogService | null = null;
let workspaceAgentsService: WorkspaceAgentsService | null = null;
const gitHubService = new GitHubService();
const vsCodeService = new VsCodeService();
const cursorService = new CursorService();
const antigravityService = new GoogleAntigravityService();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 400,
    minHeight: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: appIcon,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:4300');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function mapGitHubStatus(status: string | null): string {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  if (lower === 'done' || lower === 'closed' || lower === 'completed')
    return 'done';
  if (lower === 'in progress' || lower === 'in review') return 'in_progress';
  return 'pending';
}

function setupIPC(): void {
  // Copilot chat — workspace-scoped
  ipcMain.handle(
    'copilot:send-message',
    async (
      event,
      workspaceId: string,
      message: string,
      folderPath?: string,
    ) => {
      if (!copilotService) {
        event.sender.send(
          'copilot:error',
          workspaceId,
          'Copilot service not initialized',
        );
        return;
      }

      try {
        await copilotService.sendMessage(workspaceId, message, folderPath, {
          onDelta: (delta: string) => {
            event.sender.send('copilot:message-delta', workspaceId, delta);
          },
          onComplete: () => {
            event.sender.send('copilot:message-complete', workspaceId);
          },
          onError: (error: string) => {
            event.sender.send('copilot:error', workspaceId, error);
          },
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        event.sender.send('copilot:error', workspaceId, errorMessage);
      }
    },
  );

  // Directory picker
  ipcMain.handle('dialog:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled) {
      return null;
    } else {
      return result.filePaths[0];
    }
  });

  // --- Workspaces CRUD ---
  ipcMain.handle('db:get-workspaces', () => {
    if (!databaseService) return [];
    return databaseService.getAllWorkspaces();
  });

  ipcMain.handle(
    'db:add-workspace',
    (_event, id: string, name: string, folderPath: string) => {
      if (!databaseService) throw new Error('Database not initialized');
      return databaseService.addWorkspace(id, name, folderPath);
    },
  );

  ipcMain.handle(
    'db:update-workspace',
    (_event, id: string, fields: Record<string, unknown>) => {
      if (!databaseService) throw new Error('Database not initialized');
      databaseService.updateWorkspace(id, fields);
    },
  );

  ipcMain.handle('db:remove-workspace', (_event, id: string) => {
    if (!databaseService) throw new Error('Database not initialized');
    databaseService.removeWorkspace(id);
  });

  // --- Tools CRUD ---
  ipcMain.handle('db:get-tools', () => {
    if (!toolSettingsService) return [];
    return toolSettingsService.getAll();
  });

  ipcMain.handle('db:get-tool', (_event, id: string) => {
    if (!toolSettingsService) return null;
    return toolSettingsService.getById(id);
  });

  ipcMain.handle('db:get-tools-by-type', (_event, toolType: string) => {
    if (!toolSettingsService) return [];
    return toolSettingsService.getByType(toolType);
  });

  ipcMain.handle('db:add-tool', (_event, tool: Record<string, unknown>) => {
    if (!toolSettingsService) throw new Error('Tool settings not initialized');
    return toolSettingsService.add(tool as any);
  });

  ipcMain.handle(
    'db:update-tool',
    (_event, id: string, fields: Record<string, unknown>) => {
      if (!toolSettingsService)
        throw new Error('Tool settings not initialized');
      toolSettingsService.update(id, fields as any);
    },
  );

  ipcMain.handle('db:remove-tool', (_event, id: string) => {
    if (!toolSettingsService) throw new Error('Tool settings not initialized');
    toolSettingsService.remove(id);
  });

  // --- Tasks CRUD ---
  ipcMain.handle('db:get-tasks', () => {
    if (!tasksService) return [];
    return tasksService.getAll();
  });

  ipcMain.handle('db:get-task', (_event, id: string) => {
    if (!tasksService) return null;
    return tasksService.getById(id);
  });

  ipcMain.handle('db:get-tasks-by-workspace', (_event, workspaceId: string) => {
    if (!tasksService) return [];
    return tasksService.getByWorkspace(workspaceId);
  });

  ipcMain.handle('db:add-task', (_event, task: Record<string, unknown>) => {
    if (!tasksService) throw new Error('Tasks service not initialized');
    return tasksService.add(task as any);
  });

  ipcMain.handle(
    'db:update-task',
    (_event, id: string, fields: Record<string, unknown>) => {
      if (!tasksService) throw new Error('Tasks service not initialized');
      tasksService.update(id, fields as any);
    },
  );

  ipcMain.handle('db:remove-task', (_event, id: string) => {
    if (!tasksService) throw new Error('Tasks service not initialized');
    tasksService.remove(id);
  });

  // --- Projects CRUD ---
  ipcMain.handle('db:get-projects', () => {
    if (!projectsService) return [];
    return projectsService.getAll();
  });

  ipcMain.handle('db:get-projects-by-tool', (_event, toolId: string) => {
    if (!projectsService) return [];
    return projectsService.getByToolId(toolId);
  });

  ipcMain.handle('db:get-projects-by-org', (_event, organizationId: string) => {
    if (!projectsService) return [];
    return projectsService.getByOrg(organizationId);
  });

  ipcMain.handle(
    'db:add-project',
    (_event, project: Record<string, unknown>) => {
      if (!projectsService) throw new Error('Projects service not initialized');
      return projectsService.add(project as any);
    },
  );

  ipcMain.handle(
    'db:update-project',
    (_event, id: string, fields: Record<string, unknown>) => {
      if (!projectsService) throw new Error('Projects service not initialized');
      projectsService.update(id, fields as any);
    },
  );

  ipcMain.handle('db:remove-project', (_event, id: string) => {
    if (!projectsService) throw new Error('Projects service not initialized');
    projectsService.remove(id);
  });

  // --- GitHub ---
  ipcMain.handle('github:check-connectivity', (_event, token: string) => {
    return gitHubService.checkConnectivity(token);
  });

  ipcMain.handle('github:get-orgs', (_event, token: string) => {
    return gitHubService.getOrganizations(token);
  });

  ipcMain.handle(
    'github:get-org-projects',
    (_event, token: string, org: string) => {
      return gitHubService.getOrgProjects(token, org);
    },
  );

  ipcMain.handle(
    'github:sync-project',
    async (
      _event,
      token: string,
      projectId: string,
      projectTitle: string,
      projectNumber: number,
      toolId: string,
      organization: string,
    ) => {
      if (!tasksService || !projectsService || !syncLogService) {
        throw new Error('Services not initialized');
      }

      const log = (level: string, message: string, detail = '') => {
        console.log(`[Sync][${level}] ${message}${detail ? ': ' + detail : ''}`);
        syncLogService!.add({ toolId, projectExternalId: projectId, projectTitle, level, message, detail });
      };

      log('info', 'Sync started', `projectId=${projectId}, org=${organization}, tokenLen=${token?.length || 0}`);

      const result = await gitHubService.getProjectItems(token, projectId, log);
      const items = result.items;

      log('info', `GitHub API returned ${items.length} items`);

      if (result.error) {
        log('error', 'GitHub API error', result.error);
      }

      if (items.length === 0) {
        const msg = result.error
          ? result.error
          : 'No items found in this project. The project may be empty, or your token may need the "project" scope.';
        log('warn', msg);
        return { created: 0, updated: 0, total: 0, error: msg };
      }

      log('info', 'Processing items', `count=${items.length}`);

      let created = 0;
      let updated = 0;
      for (const item of items) {
        const externalId = item.id;
        const existing = tasksService.getByExternalIdAndTool(
          externalId,
          toolId,
        );

        const mappedStatus = mapGitHubStatus(item.status);
        log('debug', `Item: "${item.title}"`, `type=${item.type}, ghStatus="${item.status}", mappedStatus="${mappedStatus}", existing=${!!existing}`);

        const taskFields = {
          title: item.title,
          description: item.body || '',
          externalId,
          toolId,
          status: mappedStatus,
          notes: '',
          workspaceId: '',
          extra: JSON.stringify({
            type: item.type,
            url: item.url,
            number: item.number,
            githubProjectId: projectId,
          }),
        };

        if (existing) {
          tasksService.update(existing.id, taskFields);
          updated++;
        } else {
          tasksService.add(taskFields);
          created++;
        }
      }

      const existingProject = projectsService.getByExternalIdAndTool(
        projectId,
        toolId,
      );
      const now = new Date().toISOString();
      if (existingProject) {
        projectsService.update(existingProject.id, { lastSync: now });
        log('info', 'Updated existing project record', `localId=${existingProject.id}`);
      } else {
        projectsService.add({
          name: projectTitle,
          externalId: projectId,
          toolId,
          type: 'GithubProject',
          lastSync: now,
          organizationId: organization,
          organizationName: organization,
        });
        log('info', 'Created new project record');
      }

      log('info', 'Sync complete', `created=${created}, updated=${updated}, total=${items.length}`);
      return { created, updated, total: items.length, warning: result.error || undefined };
    },
  );

  ipcMain.handle(
    'github:unsync-project',
    async (_event, projectExternalId: string, toolId: string) => {
      if (!projectsService) throw new Error('Projects service not initialized');
      const existing = projectsService.getByExternalIdAndTool(
        projectExternalId,
        toolId,
      );
      if (existing) {
        projectsService.remove(existing.id);
      }
    },
  );

  // --- Sync Log ---
  ipcMain.handle('db:get-sync-logs', (_event, toolId: string) => {
    if (!syncLogService) return [];
    return syncLogService.getByTool(toolId);
  });

  ipcMain.handle('db:clear-sync-logs', (_event, toolId: string) => {
    if (!syncLogService) return;
    syncLogService.clearByTool(toolId);
  });

  // --- Workspace Agents CRUD ---
  ipcMain.handle('db:get-workspace-agents', (_event, workspaceId: string) => {
    if (!workspaceAgentsService) return [];
    return workspaceAgentsService.getByWorkspace(workspaceId);
  });

  ipcMain.handle('db:get-workspace-agent', (_event, id: string) => {
    if (!workspaceAgentsService) return null;
    return workspaceAgentsService.getById(id);
  });

  ipcMain.handle('db:add-workspace-agent', (_event, agent: Record<string, unknown>) => {
    if (!workspaceAgentsService) throw new Error('Workspace agents service not initialized');
    return workspaceAgentsService.add(agent as any);
  });

  ipcMain.handle(
    'db:update-workspace-agent',
    (_event, id: string, fields: Record<string, unknown>) => {
      if (!workspaceAgentsService) throw new Error('Workspace agents service not initialized');
      workspaceAgentsService.update(id, fields as any);
    },
  );

  ipcMain.handle('db:remove-workspace-agent', (_event, id: string) => {
    if (!workspaceAgentsService) throw new Error('Workspace agents service not initialized');
    workspaceAgentsService.remove(id);
  });

  ipcMain.handle('github:check-connectivity-cli', () => {
    return gitHubService.checkConnectivityViaCopilotToken();
  });

  ipcMain.handle('github:get-orgs-cli', () => {
    return gitHubService.getOrganizationsViaCopilotToken();
  });

  // --- Copilot ---
  ipcMain.handle('copilot:auth-status', async () => {
    if (!copilotService) return null;
    return copilotService.getAuthStatus();
  });

  // --- Editor services ---
  ipcMain.handle('editor:vscode-find', () => {
    return vsCodeService.findInstallation();
  });

  ipcMain.handle(
    'editor:vscode-open',
    (_event, folderPath: string, cliPath?: string) => {
      return vsCodeService.open(folderPath, cliPath);
    },
  );

  ipcMain.handle('editor:cursor-find', () => {
    return cursorService.findInstallation();
  });

  ipcMain.handle(
    'editor:cursor-open',
    (_event, folderPath: string, cliPath?: string) => {
      return cursorService.open(folderPath, cliPath);
    },
  );

  ipcMain.handle('editor:antigravity-find', () => {
    return antigravityService.findInstallation();
  });

  ipcMain.handle(
    'editor:antigravity-open',
    (_event, folderPath: string, cliPath?: string) => {
      return antigravityService.open(folderPath, cliPath);
    },
  );

  // --- Popout workspace window ---
  ipcMain.handle(
    'window:popout-workspace',
    (_event, workspaceId: string, workspaceName: string) => {
      const popout = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 400,
        minHeight: 300,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        icon: appIcon,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        title: workspaceName,
      });

      const isDev = !app.isPackaged;
      if (isDev) {
        popout.loadURL(`http://localhost:4300/#/workspaces/${workspaceId}?popout=1`);
      } else {
        popout.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          { hash: `/workspaces/${workspaceId}?popout=1` },
        );
      }
    },
  );
}

app.whenReady().then(async () => {
  // Set application name (affects dock and menu on macOS)
  try {
    app.name = 'What is Done';
  } catch (e) {
    // ignore if not supported
  }
  // Initialize database + services
  databaseService = new DatabaseService();
  toolSettingsService = new ToolSettingsService(databaseService.getDb());
  tasksService = new TasksService(databaseService.getDb());
  projectsService = new ProjectsService(databaseService.getDb());
  syncLogService = new SyncLogService(databaseService.getDb());
  workspaceAgentsService = new WorkspaceAgentsService(databaseService.getDb());
  console.log('Database initialized');

  // Initialize Copilot
  copilotService = new CopilotService();
  try {
    await copilotService.initialize();
    console.log('Copilot SDK initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Copilot SDK:', err);
    console.error(
      'Make sure the GitHub Copilot CLI is installed and authenticated.',
    );
  }

  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIcon);
  }

  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (copilotService) {
    await copilotService.stop();
  }
  if (databaseService) {
    databaseService.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
