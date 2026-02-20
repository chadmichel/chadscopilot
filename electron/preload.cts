import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Copilot chat — project-scoped
  sendMessage: (projectId: string, message: string, folderPath?: string): Promise<void> =>
    ipcRenderer.invoke('copilot:send-message', projectId, message, folderPath),

  onMessageDelta: (callback: (projectId: string, delta: string) => void): void => {
    ipcRenderer.on('copilot:message-delta', (_event, projectId, delta) =>
      callback(projectId, delta)
    );
  },

  onMessageComplete: (callback: (projectId: string) => void): void => {
    ipcRenderer.on('copilot:message-complete', (_event, projectId) => callback(projectId));
  },

  onError: (callback: (projectId: string, error: string) => void): void => {
    ipcRenderer.on('copilot:error', (_event, projectId, error) => callback(projectId, error));
  },

  // Directory picker
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-directory'),

  // Database — projects
  getProjects: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-projects'),

  addProject: (id: string, name: string, folderPath: string): Promise<any> =>
    ipcRenderer.invoke('db:add-project', id, name, folderPath),

  removeProject: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-project', id),
});
