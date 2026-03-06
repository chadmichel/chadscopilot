import 'dotenv/config';
import { app, BrowserWindow, ipcMain, dialog, nativeImage, shell, screen } from 'electron';
import { spawn, execSync, exec, ChildProcess } from 'node:child_process';
import path from 'path';
import fs from 'node:fs';
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
import { CalendarService } from './calendar.service.js';
import { TimeService } from './time.service.js';
import { RiderService } from './rider.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): WindowState {
  const defaultState = { width: 900, height: 700, isMaximized: false };
  try {
    if (!fs.existsSync(getWindowStatePath())) return defaultState;
    const data = fs.readFileSync(getWindowStatePath(), 'utf-8');
    const state = JSON.parse(data);

    // Basic validation to ensure the window is somewhat visible
    if (state.x !== undefined && state.y !== undefined) {
      const point = { x: state.x, y: state.y };
      const display = screen.getDisplayNearestPoint(point);
      if (!display) return defaultState;
    }

    return state;
  } catch (err) {
    return defaultState;
  }
}

function saveWindowState(bounds: WindowState): void {
  try {
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(bounds));
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
}

// Set application name as early as possible (especially for macOS Dock/Menu)
app.name = 'What is Done';
if (app.setName) {
  app.setName('What is Done');
}

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
let calendarService: CalendarService | null = null;
let timeService: TimeService | null = null;
const gitHubService = new GitHubService();
const vsCodeService = new VsCodeService();
const cursorService = new CursorService();
const riderService = new RiderService();
const antigravityService = new GoogleAntigravityService();
const uxProcesses = new Map<string, ChildProcess>();
const designWatchers = new Map<string, fs.FSWatcher>();

function createWindow(): void {
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    show: false,
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

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.show();

  const saveState = () => {
    if (!mainWindow) return;
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const bounds = mainWindow.getBounds();
      windowState.x = bounds.x;
      windowState.y = bounds.y;
      windowState.width = bounds.width;
      windowState.height = bounds.height;
    }

    saveWindowState({
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      isMaximized,
    });
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);
  mainWindow.on('maximize', saveState);
  mainWindow.on('unmaximize', saveState);

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
  ipcMain.removeHandler('db:backup');
  ipcMain.handle('db:backup', async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'chadscopilot.db');
      const { filePath } = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: 'chadscopilot_backup.db',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      });

      if (filePath) {
        fs.copyFileSync(dbPath, filePath);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error('Backup failed:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.removeHandler('db:restore');
  ipcMain.handle('db:restore', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: 'Restore Database',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      });

      if (filePaths && filePaths[0]) {
        const dbPath = path.join(app.getPath('userData'), 'chadscopilot.db');
        fs.copyFileSync(filePaths[0], dbPath);
        app.relaunch();
        app.exit();
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error('Restore failed:', err);
      return { success: false, error: String(err) };
    }
  });

  // Copilot chat — workspace-scoped
  ipcMain.removeHandler('copilot:send-message');
  ipcMain.handle(
    'copilot:send-message',
    async (
      event,
      workspaceId: string,
      message: string,
      folderPath?: string,
    ) => {
      if (!copilotService) {
        if (!event.sender.isDestroyed()) {
          event.sender.send(
            'copilot:error',
            workspaceId,
            'Copilot service not initialized',
          );
        }
        return;
      }

      try {
        await copilotService.sendMessage(workspaceId, message, folderPath, {
          onDelta: (delta: string) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send('copilot:message-delta', workspaceId, delta);
            }
          },
          onComplete: () => {
            if (!event.sender.isDestroyed()) {
              event.sender.send('copilot:message-complete', workspaceId);
            }
          },
          onError: (error: string) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send('copilot:error', workspaceId, error);
            }
          },
        });
      } catch (err: unknown) {
        if (!event.sender.isDestroyed()) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          event.sender.send('copilot:error', workspaceId, errorMessage);
        }
      }
    },
  );

  ipcMain.removeHandler('copilot:generate-summary');
  ipcMain.handle('copilot:generate-summary', async (_event, prompt: string) => {
    if (!copilotService) throw new Error('Copilot service not initialized');
    return await copilotService.generateSummary(prompt);
  });

  ipcMain.handle('db:get-daily-summary', (_event, date: string) => {
    if (!databaseService) throw new Error('Database service not initialized');
    return databaseService.getDailySummary(date);
  });

  ipcMain.handle('db:set-daily-summary', (_event, date: string, summary: string) => {
    if (!databaseService) throw new Error('Database service not initialized');
    return databaseService.setDailySummary(date, summary);
  });

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

  // File picker
  ipcMain.handle('dialog:select-file', async (_event, filters?: { name: string; extensions: string[] }[]) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters
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
    'github:get-org-repos',
    (_event, token: string, org: string) => {
      return gitHubService.getOrgRepos(token, org);
    },
  );

  ipcMain.handle(
    'github:sync-repo',
    async (
      _event,
      token: string,
      repoFullName: string,
      toolId: string,
      organization: string,
    ) => {
      if (!tasksService || !projectsService || !syncLogService) {
        throw new Error('Services not initialized');
      }

      const [owner, repo] = repoFullName.split('/');
      const projectTitle = repo;
      const projectId = repoFullName; // Use full name as external ID for repos

      const log = (level: string, message: string, detail = '') => {
        console.log(`[RepoSync][${level}] ${message}${detail ? ': ' + detail : ''}`);
        syncLogService!.add({ toolId, projectExternalId: projectId, projectTitle, level, message, detail });
      };

      log('info', 'Repo Sync started', `repo=${repoFullName}, org=${organization}`);

      const items = await gitHubService.getRepoItems(token, owner, repo);
      log('info', `GitHub API returned ${items.length} items (issues/PRs)`);

      let created = 0;
      let updated = 0;
      for (const item of items) {
        const externalId = item.id;
        const existing = tasksService.getByExternalIdAndTool(externalId, toolId);

        const mappedStatus = mapGitHubStatus(item.status);

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
            githubRepo: repoFullName,
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

      const existingProject = projectsService.getByExternalIdAndTool(projectId, toolId);
      const now = new Date().toISOString();
      if (existingProject) {
        projectsService.update(existingProject.id, { lastSync: now });
      } else {
        projectsService.add({
          name: projectTitle,
          externalId: projectId,
          toolId,
          type: 'GithubRepo',
          lastSync: now,
          organizationId: organization,
          organizationName: organization,
        });
      }

      log('info', 'Repo Sync complete', `created=${created}, updated=${updated}, total=${items.length}`);
      return { created, updated, total: items.length };
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
    'github:update-item-status',
    async (
      _event,
      token: string,
      projectId: string,
      itemId: string,
      status: string,
    ) => {
      return gitHubService.updateItemStatus(token, projectId, itemId, status);
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

  ipcMain.removeHandler('editor:antigravity-open');
  ipcMain.handle(
    'editor:antigravity-open',
    (_event, folderPath: string, cliPath?: string) => {
      return antigravityService.open(folderPath, cliPath);
    },
  );

  ipcMain.removeHandler('editor:rider-find');
  ipcMain.handle('editor:rider-find', () => {
    return riderService.findInstallation();
  });

  ipcMain.removeHandler('editor:rider-open');
  ipcMain.handle(
    'editor:rider-open',
    (_event, folderPath: string, cliPath?: string) => {
      return riderService.open(folderPath, cliPath);
    },
  );

  // --- File System ---
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (err) {
      return null;
    }
  });

  ipcMain.handle('mpp:convert-to-xml', async (_event, mppPath: string) => {
    const xmlPath = mppPath + '.xml';
    const projectRoot = app.getAppPath();
    const scriptsDir = path.join(projectRoot, 'scripts/utils');
    const absoluteCp = `${scriptsDir}:${path.join(scriptsDir, '.mpp_venv/lib/python3.13/site-packages/mpxj/lib/*')}`;

    return new Promise((resolve) => {
      console.log(`[IPC] Converting MPP: ${mppPath} using Java helper`);
      exec(`java -cp "${absoluteCp}" MPPToXML "${mppPath}" "${xmlPath}"`, { cwd: scriptsDir }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[IPC] MPP conversion error: ${error.message}`);
          console.error(`[IPC] Stderr: ${stderr}`);
          resolve({ success: false, error: stderr || error.message });
        } else {
          console.log(`[IPC] MPP conversion success: ${xmlPath}`);
          resolve({ success: true, xmlPath });
        }
      });
    });
  });

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      return false;
    }
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    return fs.existsSync(filePath);
  });

  ipcMain.handle('fs:create-folder', async (_event, parentPath: string, folderName: string) => {
    try {
      const dirPath = path.join(parentPath, folderName);
      if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      return true;
    } catch (err) {
      return false;
    }
  });

  ipcMain.handle('fs:list-files', async (_event, dirPath: string, extension?: string) => {
    try {
      const exists = fs.existsSync(dirPath);
      if (!exists) return [];
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      let files = entries.filter(e => e.isFile()).map(e => e.name);
      if (extension) {
        files = files.filter(f => f.endsWith(extension));
      }
      return files;
    } catch (err) {
      return [];
    }
  });

  ipcMain.handle('fs:list-directory', async (_event, dirPath: string) => {
    try {
      const exists = fs.existsSync(dirPath);
      if (!exists) return [];
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      return entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory()
      }));
    } catch (err) {
      return [];
    }
  });

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

  ipcMain.handle(
    'window:open-mermaid-builder',
    (_event, workspaceId: string, filePath: string) => {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 600,
        minHeight: 400,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        icon: appIcon,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        title: 'Mermaid Builder',
      });

      const isDev = !app.isPackaged;
      if (isDev) {
        win.loadURL(`http://localhost:4300/#/mermaid-builder?workspaceId=${workspaceId}&filePath=${filePath}`);
      } else {
        win.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          { hash: `/mermaid-builder?workspaceId=${workspaceId}&filePath=${filePath}` },
        );
      }
    },
  );

  ipcMain.handle(
    'window:open-ux-design-runner',
    (_event, workspaceId: string, designName: string, designPath: string) => {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        icon: appIcon,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        title: `UX Design Runner - ${designName}`,
      });

      const isDev = !app.isPackaged;
      const queryParams = `workspaceId=${encodeURIComponent(workspaceId)}&designName=${encodeURIComponent(designName)}&designPath=${encodeURIComponent(designPath)}`;
      if (isDev) {
        win.loadURL(
          `http://localhost:4300/#/ux-design-runner?${queryParams}`,
        );
      } else {
        win.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          { hash: `/ux-design-runner?${queryParams}` },
        );
      }
    },
  );

  ipcMain.handle(
    'ux:create-design',
    async (
      _event,
      _workspaceId: string,
      name: string,
      techStack: string,
      workspacePath: string,
    ) => {
      const designPath = path.join(workspacePath, 'designs', name);
      // Use process.cwd() or similar to find ux_starts?
      // In dev, it's in the root.
      const uxStartsPath = path.join(process.cwd(), 'ux_starts');
      const templatePath = path.join(uxStartsPath, techStack);

      if (!fs.existsSync(designPath)) {
        fs.mkdirSync(designPath, { recursive: true });
      }

      // Copy template
      await fs.promises.cp(templatePath, designPath, { recursive: true });

      // Create design info file
      const designType = {
        type: 'UX',
        template: techStack,
        run: techStack === 'angular_primeng' ? 'npm run start:mock -- --port 7777' : 'npm run start',
      };
      await fs.promises.writeFile(
        path.join(designPath, 'designtype.json'),
        JSON.stringify(designType, null, 2),
      );

      // Start npm install and await it
      return new Promise((resolve, reject) => {
        const installProc = spawn('npm', ['install'], {
          cwd: designPath,
          shell: true,
        });

        installProc.on('exit', (code) => {
          console.log(`UX Design ${name} npm install exited with code ${code}`);
          if (code === 0) {
            resolve({ success: true, path: designPath });
          } else {
            resolve({ success: false, error: `npm install failed with code ${code}` });
          }
        });

        installProc.on('error', (err) => {
          console.error(`Failed to start npm install: ${err}`);
          reject(err);
        });
      });
    },
  );

  ipcMain.handle(
    'design:create-folder',
    async (
      _event,
      workspacePath: string,
      name: string,
      type: 'UX' | 'Mermaid',
      template: string = '',
      run: string = ''
    ) => {
      const designPath = path.join(workspacePath, 'designs', name);
      if (!fs.existsSync(designPath)) {
        fs.mkdirSync(designPath, { recursive: true });
      }

      const designType = {
        type,
        template,
        run,
      };

      await fs.promises.writeFile(
        path.join(designPath, 'designtype.json'),
        JSON.stringify(designType, null, 2),
      );

      return { success: true, path: designPath };
    }
  );

  async function killProcessOnPort(port: number) {
    try {
      const cmd = process.platform === 'win32'
        ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`
        : `lsof -ti:${port} | xargs kill -9`;
      execSync(cmd);
      console.log(`Successfully killed process on port ${port}`);
    } catch (err) {
      // This often fails if no process is running on the port, which is fine
    }
  }

  ipcMain.handle('ux:start-dev-server', async (_event, designPath: string) => {
    const normalizedPath = path.normalize(designPath);
    const defaultPort = 7777;
    if (uxProcesses.has(normalizedPath)) {
      return { success: true, port: defaultPort };
    }

    // Kill any process on the target port AND the old default port just in case
    await killProcessOnPort(defaultPort);
    await killProcessOnPort(7021);

    // Read from designtype.json if it exists
    let runCommand = 'npm run start:mock -- --port 7777';
    try {
      const metaPath = path.join(normalizedPath, 'designtype.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.run) runCommand = meta.run;
      }
    } catch (e) {
      console.warn('Failed to read designtype.json for start command', e);
    }

    const command = runCommand;
    const proc = spawn(command, {
      cwd: normalizedPath,
      shell: true,
      detached: true
    });
    uxProcesses.set(normalizedPath, proc);

    proc.stdout?.on('data', (data) => console.log(`[UX Dev Server] ${data}`));
    proc.stderr?.on('data', (data) =>
      console.error(`[UX Dev Server ERR] ${data}`),
    );

    return { success: true, port: defaultPort };
  });

  ipcMain.handle('ux:watch-design', async (event, designPath: string) => {
    const normalizedPath = path.normalize(designPath);
    if (designWatchers.has(normalizedPath)) {
      console.log(`[Watch] Already watching: ${normalizedPath}`);
      return { success: true };
    }

    try {
      console.log(`[Watch] Setting up watcher for: ${normalizedPath}`);
      const watcher = fs.watch(normalizedPath, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.startsWith('.') && !filename.includes('node_modules')) {
          console.log(`[Watch] File ${eventType} in ${normalizedPath}: ${filename}`);
          // Notify the window that requested the watch
          const win = BrowserWindow.fromWebContents(event.sender);
          if (win) {
            console.log(`[Watch] Notifying renderer for change in: ${normalizedPath}`);
            win.webContents.send('ux:design-changed', normalizedPath);
          }
        }
      });
      designWatchers.set(normalizedPath, watcher);
      return { success: true };
    } catch (err) {
      console.error(`Failed to watch design path ${normalizedPath}:`, err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('ux:unwatch-design', async (_event, designPath: string) => {
    const normalizedPath = path.normalize(designPath);
    const watcher = designWatchers.get(normalizedPath);
    if (watcher) {
      watcher.close();
      designWatchers.delete(normalizedPath);
      console.log(`[Watch] Stopped watching: ${normalizedPath}`);
    }
    return { success: true };
  });

  ipcMain.handle('ux:stop-dev-server', async (_event, designPath: string) => {
    const normalizedPath = path.normalize(designPath);
    console.log(`[IPC] ux:stop-dev-server called for: ${normalizedPath}`);

    const proc = uxProcesses.get(normalizedPath);
    if (proc && proc.pid) {
      try {
        console.log(`[IPC] Killing process group -${proc.pid}`);
        // Shoot for the whole process group
        process.kill(-proc.pid, 'SIGKILL');
      } catch (err) {
        console.error(`Failed to kill UX dev server process group -${proc.pid}:`, err);
        try { proc.kill('SIGKILL'); } catch (e) { }
      }
      uxProcesses.delete(normalizedPath);
    }

    // Also explicitly kill anything on 7777 as a safety net
    await killProcessOnPort(7777);

    const watcher = designWatchers.get(normalizedPath);
    if (watcher) {
      console.log(`[Watch] Closing watcher for ${normalizedPath}`);
      watcher.close();
      designWatchers.delete(normalizedPath);
    }

    return { success: true };
  });

  ipcMain.handle('ux:open-finder', async (_event, folderPath: string) => {
    const normalizedPath = path.normalize(folderPath);
    console.log(`[IPC] ux:open-finder called for: ${normalizedPath}`);
    try {
      if (!fs.existsSync(normalizedPath)) {
        console.error(`[IPC] Path does not exist: ${normalizedPath}`);
        return { success: false, error: 'Path does not exist' };
      }
      await shell.openPath(normalizedPath);
      return { success: true };
    } catch (err) {
      console.error(`[IPC] Failed to open finder:`, err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('ux:open-terminal', async (_event, folderPath: string) => {
    const normalizedPath = path.normalize(folderPath);
    console.log(`[IPC] ux:open-terminal called for: ${normalizedPath}`);
    try {
      if (!fs.existsSync(normalizedPath)) {
        console.error(`[IPC] Path does not exist: ${normalizedPath}`);
        return { success: false, error: 'Path does not exist' };
      }

      if (process.platform === 'darwin') {
        spawn('open', ['-a', 'Terminal', normalizedPath]);
      } else if (process.platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { cwd: normalizedPath });
      } else {
        spawn('x-terminal-emulator', [], { cwd: normalizedPath });
      }
      return { success: true };
    } catch (err) {
      console.error(`[IPC] Failed to start terminal:`, err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('ux:delete-design', async (_event, designPath: string) => {
    console.log(`[IPC] ux:delete-design called for: ${designPath}`);
    try {
      if (fs.existsSync(designPath)) {
        await fs.promises.rm(designPath, { recursive: true, force: true });
        return { success: true };
      }
      return { success: false, error: 'Path does not exist' };
    } catch (err) {
      console.error(`[IPC] Failed to delete design:`, err);
      return { success: false, error: String(err) };
    }
  });

  // --- Analysis ---
  ipcMain.handle('analysis:check-dependencies', async () => {
    const check = (cmd: string) => {
      try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    };
    const hasPython = check('python3 --version') || check('python --version');
    const hasLizard = check('lizard --version');
    return { python: hasPython, lizard: hasLizard };
  });

  ipcMain.handle('analysis:run-lizard', async (_event, workspacePath: string, subFolder?: string) => {
    const analysisFolder = path.join(workspacePath, 'analysis');
    try {
      if (!fs.existsSync(analysisFolder)) {
        await fs.promises.mkdir(analysisFolder, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportName = `complexity_report_${timestamp.split('.')[0]}.html`;
      const reportPath = path.join(analysisFolder, reportName);
      const targetPath = subFolder ? path.join(workspacePath, subFolder) : workspacePath;

      // lizard --html -o output target
      const cmd = `lizard --html -o "${reportPath}" "${targetPath}"`;
      console.log(`[IPC] Running analysis: ${cmd}`);

      const { exec } = await import('node:child_process');
      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error('[IPC] Analysis failed:', error, stderr);
            resolve({ success: false, error: stderr || error.message });
          } else {
            resolve({ success: true, reportPath });
          }
        });
      });
    } catch (err) {
      console.error('[IPC] Analysis creation failed:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('analysis:list-reports', async (_event, workspacePath: string) => {
    try {
      const analysisFolder = path.join(workspacePath, 'analysis');
      if (!fs.existsSync(analysisFolder)) return [];
      const files = await fs.promises.readdir(analysisFolder);
      return files
        .filter(f => f.endsWith('.html'))
        .map(f => ({ name: f, path: path.join(analysisFolder, f) }))
        .sort((a, b) => b.name.localeCompare(a.name));
    } catch (err) {
      return [];
    }
  });

  ipcMain.handle('analysis:run-full', async (_event, workspacePath: string, subFolder?: string) => {
    const analysisFolder = path.join(workspacePath, 'analysis');
    const sendProgress = (progress: number, status: string) => {
      _event.sender.send('analysis:progress', { progress, status });
    };

    try {
      sendProgress(5, 'Initializing folders...');
      if (!fs.existsSync(analysisFolder)) {
        await fs.promises.mkdir(analysisFolder, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportName = `full_analysis_${timestamp}.html`;
      const reportPath = path.join(analysisFolder, reportName);
      const targetPath = subFolder ? path.join(workspacePath, subFolder) : workspacePath;

      const reportData: any = {
        scanTime: new Date().toLocaleString(),
        target: targetPath,
        technologies: [],
        dependencies: [],
        sast: [],
        complexity: null
      };

      // 1. Technology Detection
      sendProgress(15, 'Detecting Technologies...');
      const techFlags = [
        { file: 'package.json', name: 'Node.js/NPM' },
        { file: 'tsconfig.json', name: 'TypeScript' },
        { file: 'angular.json', name: 'Angular' },
        { file: 'requirements.txt', name: 'Python' },
        { file: 'go.mod', name: 'Go' },
        { file: 'Dockerfile', name: 'Docker' },
        { file: '.gitignore', name: 'Git' }
      ];
      for (const tech of techFlags) {
        if (fs.existsSync(path.join(workspacePath, tech.file))) {
          reportData.technologies.push(tech.name);
        }
      }

      // 2. Dependency Analysis (Node.js focus)
      sendProgress(30, 'Analyzing Dependencies...');
      const pkgPath = path.join(workspacePath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          reportData.dependencies = Object.entries(deps).map(([name, version]) => ({ name, version }));
        } catch (e) { }
      }

      // 3. SAST Scan (Recursive RegEx)
      sendProgress(50, 'Security Scanning (SAST)...');
      const sastRules = [
        { name: 'Hardcoded Secret', regex: /(API_KEY|SECRET|PASSWORD|TOKEN)\s*[:=]\s*["'][^"']{8,}["']/i, severity: 'High' },
        { name: 'Unsafe Eval', regex: /\beval\s*\(/, severity: 'High' },
        { name: 'Unsafe innerHTML', regex: /\.innerHTML\s*=/, severity: 'Medium' },
        { name: 'Unsafe concat in SQL', regex: /\s(SELECT|INSERT|UPDATE|DELETE)\s.*?\s\+\s/i, severity: 'Medium' }
      ];

      const walk = async (dir: string) => {
        const files = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const res = path.resolve(dir, file.name);
          if (file.isDirectory()) {
            if (file.name === 'node_modules' || file.name === '.git' || file.name === 'dist') continue;
            await walk(res);
          } else {
            const ext = path.extname(file.name);
            if (['.ts', '.js', '.html', '.py', '.go'].includes(ext)) {
              const content = await fs.promises.readFile(res, 'utf8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                for (const rule of sastRules) {
                  if (rule.regex.test(lines[i])) {
                    reportData.sast.push({
                      rule: rule.name,
                      severity: rule.severity,
                      file: path.relative(workspacePath, res),
                      line: i + 1,
                      snippet: lines[i].trim().substring(0, 100)
                    });
                  }
                }
              }
            }
          }
        }
      };
      await walk(targetPath);

      // 4. Complexity (Lizard)
      sendProgress(75, 'Running Complexity Analysis (Lizard)...');
      try {
        const { exec } = await import('node:child_process');
        // Exclude common heavy/non-code directories to prevent stalling/timeout
        const exclusions = [
          '*/node_modules/*',
          '*/.git/*',
          '*/dist/*',
          '*/build/*',
          '*/coverage/*',
          '*/ios/*',
          '*/android/*'
        ].map(p => `-x "${p}"`).join(' ');

        const lizardCmd = `lizard ${exclusions} "${targetPath}"`;
        console.log(`[IPC] Running lizard: ${lizardCmd}`);

        const lizardOutput = await new Promise<string>((resolve) => {
          // Increase maxBuffer to 10MB and add a 5min timeout
          exec(lizardCmd, { maxBuffer: 10 * 1024 * 1024, timeout: 300000 }, (err, stdout, stderr) => {
            if (err) {
              const msg = err.killed ? 'Command timed out after 5 minutes' : (stderr || err.message);
              console.error('[IPC] Lizard exec error:', err, stderr);
              resolve("Lizard analysis failed or not installed. Error: " + msg);
            } else {
              resolve(stdout);
            }
          });
        });
        reportData.complexitySummary = lizardOutput;
      } catch (e) {
        console.error('[IPC] Lizard error:', e);
        reportData.complexitySummary = "Lizard analysis failed.";
      }

      // 5. Generate HTML Report
      sendProgress(95, 'Building Comprehensive Report...');
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Code Analysis Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 40px; background: #f9fafb; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb; }
    h1 { color: #111827; margin-bottom: 8px; }
    h2 { border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-top: 0; color: #374151; font-size: 1.25rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 32px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-right: 4px; background: #f3f4f6; color: #4b5563; }
    .severity-High { color: #991b1b; background: #fee2e2; }
    .severity-Medium { color: #92400e; background: #fef3c7; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; padding: 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
    td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
    pre { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.8125rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .tech-item { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #1d4ed8; border-radius: 6px; font-weight: 500; margin: 4px; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Code Analysis Report</h1>
  <div class="meta">Generated on ${reportData.scanTime} for ${reportData.target}</div>

  <div class="grid">
    <div class="card">
      <h2>Technologies Detected</h2>
      <div style="margin: -4px;">
        ${reportData.technologies.map((t: string) => `<span class="tech-item">${t}</span>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Dependency Summary</h2>
      <p>Total dependencies: <strong>${reportData.dependencies.length}</strong></p>
      <div style="max-height: 150px; overflow-y: auto;">
        ${reportData.dependencies.slice(0, 10).map((d: any) => `<div class="badge">${d.name} @ ${d.version}</div>`).join('')}
        ${reportData.dependencies.length > 10 ? '<div>...</div>' : ''}
      </div>
    </div>
  </div>

  <div class="card">
    <h2>SAST Security Findings</h2>
    @if reportData.sast.length === 0
    <p style="color: #059669;">No potential vulnerabilities detected.</p>
    @else
    <table>
      <thead>
        <tr><th>Issue</th><th>Severity</th><th>File</th><th>Line</th></tr>
      </thead>
      <tbody>
        ${reportData.sast.map((s: any) => `
          <tr>
            <td><strong>${s.rule}</strong></td>
            <td><span class="badge severity-${s.severity}">${s.severity}</span></td>
            <td>${s.file}</td>
            <td>${s.line}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    @endif
  </div>

  <div class="card">
    <h2>Complexity Analysis (Lizard Summary)</h2>
    <pre>${reportData.complexitySummary}</pre>
  </div>

</body>
</html>
      `.replace(/@if (.*)\n/g, (m, cond) => {
        try {
          // Check if condition is true by evaluating it in a controlled way or just simpler
          const isTrue = cond.includes('sast.length === 0') ? reportData.sast.length === 0 : true;
          return isTrue ? '' : '<!-- ';
        } catch (e) { return ''; }
      }).replace(/@else\n/g, '-->').replace(/@endif\n/g, '');

      fs.writeFileSync(reportPath, htmlContent);
      return { success: true, reportPath };
    } catch (err) {
      console.error('[IPC] Full analysis failed:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(
    'window:open-plan-editor',
    (_event, workspaceId: string, filePath: string) => {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 600,
        minHeight: 400,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        icon: appIcon,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        title: 'Plan Editor',
      });

      const isDev = !app.isPackaged;
      if (isDev) {
        win.loadURL(`http://localhost:4300/#/plan-editor?workspaceId=${workspaceId}&filePath=${filePath}`);
      } else {
        win.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          { hash: `/plan-editor?workspaceId=${workspaceId}&filePath=${filePath}` },
        );
      }
    },
  );

  ipcMain.handle(
    'window:open-work-process-runner',
    (_event, workspaceId: string) => {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        icon: appIcon,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        title: 'Work Process Runner',
      });

      const isDev = !app.isPackaged;
      if (isDev) {
        win.loadURL(`http://localhost:4300/#/work-process-runner?workspaceId=${workspaceId}`);
      } else {
        win.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          { hash: `/work-process-runner?workspaceId=${workspaceId}` },
        );
      }
    },
  );

  ipcMain.handle(
    'window:open-note-editor',
    (_event, workspaceId: string, filePath: string) => {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
        },
        icon: appIcon,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        title: 'Note Editor',
      });

      const isDev = !app.isPackaged;
      if (isDev) {
        win.loadURL(`http://localhost:4300/#/note-editor?workspaceId=${workspaceId}&filePath=${filePath}`);
      } else {
        win.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          { hash: `/note-editor?workspaceId=${workspaceId}&filePath=${filePath}` },
        );
      }
    },
  );

  // --- Calendar ---
  ipcMain.handle('calendar:login', async () => {
    if (!calendarService) throw new Error('Calendar service not initialized');
    return calendarService.login();
  });

  ipcMain.handle('calendar:sync', async (_event, accountId: string, otherUserEmail?: string) => {
    if (!calendarService) throw new Error('Calendar service not initialized');
    return calendarService.syncEvents(accountId, otherUserEmail);
  });

  ipcMain.handle('calendar:get-events', (_event, userId: string) => {
    if (!calendarService) throw new Error('Calendar service not initialized');
    if (!userId) return calendarService.getAllEvents();
    return calendarService.getEvents(userId);
  });

  ipcMain.handle('calendar:logout', async () => {
    if (!calendarService) throw new Error('Calendar service not initialized');
    return calendarService.logout();
  });

  // --- Time ---
  ipcMain.handle('time:get-logs', async (_event, date: string) => {
    if (!databaseService) throw new Error('Database service not initialized');
    return databaseService.getTimeLogs(date);
  });

  ipcMain.handle('time:update-log', (_event, id: string, workspaceId: string) => {
    if (!databaseService) throw new Error('Database service not initialized');
    return databaseService.updateTimeLog(id, workspaceId);
  });

  ipcMain.handle('time:update-notes', (_event, id: string, notes: string) => {
    if (!databaseService) throw new Error('Database service not initialized');
    return databaseService.updateTimeLogNotes(id, notes);
  });

  // --- Database Explorer (read-only) ---
  ipcMain.handle('db:get-tables', () => {
    if (!databaseService) return [];
    return databaseService.getTableNames();
  });

  ipcMain.handle('db:query-table', (_event, tableName: string) => {
    if (!databaseService) return { columns: [], rows: [] };
    return databaseService.getTableRows(tableName);
  });
}

app.whenReady().then(async () => {
  // Initialize database + services
  databaseService = new DatabaseService();
  toolSettingsService = new ToolSettingsService(databaseService.getDb());
  tasksService = new TasksService(databaseService.getDb());
  projectsService = new ProjectsService(databaseService.getDb());
  syncLogService = new SyncLogService(databaseService.getDb());
  workspaceAgentsService = new WorkspaceAgentsService(databaseService.getDb());
  calendarService = new CalendarService(databaseService.getDb());
  timeService = new TimeService(databaseService, calendarService);
  timeService.startTracking();
  console.log('Database initialized');

  // Initialize Copilot
  copilotService = new CopilotService();
  if (tasksService && calendarService && databaseService && projectsService && workspaceAgentsService && syncLogService) {
    copilotService.setServices(
      tasksService,
      calendarService,
      databaseService,
      projectsService,
      workspaceAgentsService,
      syncLogService
    );
  }
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  if (copilotService) {
    await copilotService.stop();
  }
  if (databaseService) {
    databaseService.close();
  }
});
