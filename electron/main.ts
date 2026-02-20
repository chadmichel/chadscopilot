import 'dotenv/config';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { CopilotService } from './copilot.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let copilotService: CopilotService | null = null;

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
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e',
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
  ipcMain.handle(
    'copilot:send-message',
    async (event, message: string) => {
      if (!copilotService) {
        event.sender.send('copilot:error', 'Copilot service not initialized');
        return;
      }

      try {
        await copilotService.sendMessage(message, {
          onDelta: (delta: string) => {
            event.sender.send('copilot:message-delta', delta);
          },
          onComplete: () => {
            event.sender.send('copilot:message-complete');
          },
          onError: (error: string) => {
            event.sender.send('copilot:error', error);
          },
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        event.sender.send('copilot:error', errorMessage);
      }
    }
  );
}

app.whenReady().then(async () => {
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
