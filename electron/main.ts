import 'dotenv/config';
import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { CopilotService } from './copilot.service.js';
import { DatabaseService } from './database.service.js';

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
  // Copilot chat — now project-scoped
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

  // Database — projects CRUD
  ipcMain.handle('db:get-projects', () => {
    if (!databaseService) return [];
    return databaseService.getAllProjects();
  });

  ipcMain.handle('db:add-project', (_event, id: string, name: string, folderPath: string) => {
    if (!databaseService) throw new Error('Database not initialized');
    return databaseService.addProject(id, name, folderPath);
  });

  ipcMain.handle('db:remove-project', (_event, id: string) => {
    if (!databaseService) throw new Error('Database not initialized');
    databaseService.removeProject(id);
  });
}

app.whenReady().then(async () => {
  // Initialize database
  databaseService = new DatabaseService();
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
