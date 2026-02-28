import 'dotenv/config';
import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import { spawn, execSync, ChildProcess } from 'node:child_process';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const gitHubService = new GitHubService();
const vsCodeService = new VsCodeService();
const cursorService = new CursorService();
const antigravityService = new GoogleAntigravityService();
const uxProcesses = new Map<string, ChildProcess>();

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

  ipcMain.handle(
    'editor:antigravity-open',
    (_event, folderPath: string, cliPath?: string) => {
      return antigravityService.open(folderPath, cliPath);
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
      if (isDev) {
        win.loadURL(
          `http://localhost:4300/#/ux-design-runner?workspaceId=${workspaceId}&designName=${designName}&designPath=${designPath}`,
        );
      } else {
        win.loadFile(
          path.join(__dirname, '../dist/chadscopilot/browser/index.html'),
          {
            hash: `/ux-design-runner?workspaceId=${workspaceId}&designName=${designName}&designPath=${designPath}`,
          },
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
    const defaultPort = 7777;
    if (uxProcesses.has(designPath)) {
      return { success: true, port: defaultPort };
    }

    // Kill any process on the target port AND the old default port just in case
    await killProcessOnPort(defaultPort);
    await killProcessOnPort(7021);

    // Force the port regardless of what is in package.json
    const command = 'npm run start:mock -- --port 7777';
    const proc = spawn(command, {
      cwd: designPath,
      shell: true,
      detached: true
    });
    uxProcesses.set(designPath, proc);

    proc.stdout?.on('data', (data) => console.log(`[UX Dev Server] ${data}`));
    proc.stderr?.on('data', (data) =>
      console.error(`[UX Dev Server ERR] ${data}`),
    );

    return { success: true, port: defaultPort };
  });

  ipcMain.handle('ux:stop-dev-server', async (_event, designPath: string) => {
    const proc = uxProcesses.get(designPath);
    if (proc && proc.pid) {
      try {
        // Kill the entire process group (the shell and all its children)
        process.kill(-proc.pid, 'SIGINT');
      } catch (err) {
        console.error(`Failed to kill UX dev server process group for ${designPath}:`, err);
        // Fallback to killing just the process if group kill fails
        try { proc.kill('SIGINT'); } catch (e) { }
      }
      uxProcesses.delete(designPath);
    }
    return { success: true };
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
    return calendarService.getEvents(userId);
  });

  ipcMain.handle('calendar:logout', async () => {
    if (!calendarService) throw new Error('Calendar service not initialized');
    return calendarService.logout();
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
