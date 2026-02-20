import 'dotenv/config';
import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { CopilotService } from './copilot.service.js';
import { DatabaseService } from './database.service.js';
import { ToolSettingsService } from './tool-settings.service.js';
import { TasksService } from './tasks.service.js';
import { VsCodeService } from './vscode.service.js';
import { CursorService } from './cursor.service.js';
import { GoogleAntigravityService } from './google-antigravity.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hot reload in dev: restart Electron when dist-electron files change
if (!app.isPackaged) {
  import('electron-reload').then((mod: any) => {
    mod.default(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      forceHardReset: true,
    });
  }).catch(() => {
    // electron-reload not available, skip
  });
}

const appIcon = nativeImage.createFromPath(
  path.join(__dirname, '..', 'chadscopilot.png')
);

let mainWindow: BrowserWindow | null = null;
let copilotService: CopilotService | null = null;
let databaseService: DatabaseService | null = null;
let toolSettingsService: ToolSettingsService | null = null;
let tasksService: TasksService | null = null;
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
      path.join(__dirname, '../dist/chadscopilot/browser/index.html')
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC(): void {
  // Copilot chat — project-scoped
  ipcMain.handle(
    'copilot:send-message',
    async (event, projectId: string, message: string, folderPath?: string) => {
      if (!copilotService) {
        event.sender.send('copilot:error', projectId, 'Copilot service not initialized');
        return;
      }

      try {
        await copilotService.sendMessage(projectId, message, folderPath, {
          onDelta: (delta: string) => {
            event.sender.send('copilot:message-delta', projectId, delta);
          },
          onComplete: () => {
            event.sender.send('copilot:message-complete', projectId);
          },
          onError: (error: string) => {
            event.sender.send('copilot:error', projectId, error);
          },
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        event.sender.send('copilot:error', projectId, errorMessage);
      }
    }
  );

  // Directory picker
  ipcMain.handle('dialog:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled) {
      return null;
    } else {
      return result.filePaths[0];
    }
  });

  // --- Projects CRUD ---
  ipcMain.handle('db:get-projects', () => {
    if (!databaseService) return [];
    return databaseService.getAllProjects();
  });

  ipcMain.handle('db:add-project', (_event, id: string, name: string, folderPath: string) => {
    if (!databaseService) throw new Error('Database not initialized');
    return databaseService.addProject(id, name, folderPath);
  });

  ipcMain.handle('db:update-project', (_event, id: string, fields: Record<string, unknown>) => {
    if (!databaseService) throw new Error('Database not initialized');
    databaseService.updateProject(id, fields);
  });

  ipcMain.handle('db:remove-project', (_event, id: string) => {
    if (!databaseService) throw new Error('Database not initialized');
    databaseService.removeProject(id);
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

  ipcMain.handle('db:update-tool', (_event, id: string, fields: Record<string, unknown>) => {
    if (!toolSettingsService) throw new Error('Tool settings not initialized');
    toolSettingsService.update(id, fields as any);
  });

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

  ipcMain.handle('db:get-tasks-by-project', (_event, projectId: string) => {
    if (!tasksService) return [];
    return tasksService.getByProject(projectId);
  });

  ipcMain.handle('db:add-task', (_event, task: Record<string, unknown>) => {
    if (!tasksService) throw new Error('Tasks service not initialized');
    return tasksService.add(task as any);
  });

  ipcMain.handle('db:update-task', (_event, id: string, fields: Record<string, unknown>) => {
    if (!tasksService) throw new Error('Tasks service not initialized');
    tasksService.update(id, fields as any);
  });

  ipcMain.handle('db:remove-task', (_event, id: string) => {
    if (!tasksService) throw new Error('Tasks service not initialized');
    tasksService.remove(id);
  });

  // --- Editor services ---
  ipcMain.handle('editor:vscode-find', () => {
    return vsCodeService.findInstallation();
  });

  ipcMain.handle('editor:vscode-open', (_event, folderPath: string, cliPath?: string) => {
    return vsCodeService.open(folderPath, cliPath);
  });

  ipcMain.handle('editor:cursor-find', () => {
    return cursorService.findInstallation();
  });

  ipcMain.handle('editor:cursor-open', (_event, folderPath: string, cliPath?: string) => {
    return cursorService.open(folderPath, cliPath);
  });

  ipcMain.handle('editor:antigravity-find', () => {
    return antigravityService.findInstallation();
  });

  ipcMain.handle('editor:antigravity-open', (_event, folderPath: string, cliPath?: string) => {
    return antigravityService.open(folderPath, cliPath);
  });
}

app.whenReady().then(async () => {
  // Initialize database + services
  databaseService = new DatabaseService();
  toolSettingsService = new ToolSettingsService(databaseService.getDb());
  tasksService = new TasksService(databaseService.getDb());
  console.log('Database initialized');

  // Initialize Copilot
  copilotService = new CopilotService();
  try {
    await copilotService.initialize();
    console.log('Copilot SDK initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Copilot SDK:', err);
    console.error(
      'Make sure the GitHub Copilot CLI is installed and authenticated.'
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
