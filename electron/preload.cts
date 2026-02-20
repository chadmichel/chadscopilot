import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string): Promise<void> =>
    ipcRenderer.invoke('copilot:send-message', message),

  onMessageDelta: (callback: (delta: string) => void): void => {
    ipcRenderer.on('copilot:message-delta', (_event, delta) =>
      callback(delta)
    );
  },

  onMessageComplete: (callback: () => void): void => {
    ipcRenderer.on('copilot:message-complete', () => callback());
  },

  onError: (callback: (error: string) => void): void => {
    ipcRenderer.on('copilot:error', (_event, error) => callback(error));
  },
});
