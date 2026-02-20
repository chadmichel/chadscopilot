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

  // --- Projects ---
  getProjects: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-projects'),

  addProject: (id: string, name: string, folderPath: string): Promise<any> =>
    ipcRenderer.invoke('db:add-project', id, name, folderPath),

  updateProject: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-project', id, fields),

  removeProject: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-project', id),

  // --- Tools ---
  getTools: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-tools'),

  getTool: (id: string): Promise<any> =>
    ipcRenderer.invoke('db:get-tool', id),

  getToolsByType: (toolType: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-tools-by-type', toolType),

  addTool: (tool: Record<string, any>): Promise<any> =>
    ipcRenderer.invoke('db:add-tool', tool),

  updateTool: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-tool', id, fields),

  removeTool: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-tool', id),

  // --- Tasks ---
  getTasks: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-tasks'),

  getTask: (id: string): Promise<any> =>
    ipcRenderer.invoke('db:get-task', id),

  getTasksByProject: (projectId: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-tasks-by-project', projectId),

  addTask: (task: Record<string, any>): Promise<any> =>
    ipcRenderer.invoke('db:add-task', task),

  updateTask: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-task', id, fields),

  removeTask: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-task', id),

  // --- Editor services ---
  vscodeFindInstallation: (): Promise<{ found: boolean; path: string; cli: string }> =>
    ipcRenderer.invoke('editor:vscode-find'),

  vscodeOpen: (folderPath: string, cliPath?: string): Promise<boolean> =>
    ipcRenderer.invoke('editor:vscode-open', folderPath, cliPath),

  cursorFindInstallation: (): Promise<{ found: boolean; path: string; cli: string }> =>
    ipcRenderer.invoke('editor:cursor-find'),

  cursorOpen: (folderPath: string, cliPath?: string): Promise<boolean> =>
    ipcRenderer.invoke('editor:cursor-open', folderPath, cliPath),

  antigravityFindInstallation: (): Promise<{ found: boolean; path: string; cli: string }> =>
    ipcRenderer.invoke('editor:antigravity-find'),

  antigravityOpen: (folderPath: string, cliPath?: string): Promise<boolean> =>
    ipcRenderer.invoke('editor:antigravity-open', folderPath, cliPath),
});
