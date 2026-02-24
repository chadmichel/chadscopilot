import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Copilot chat — workspace-scoped
  sendMessage: (workspaceId: string, message: string, folderPath?: string): Promise<void> =>
    ipcRenderer.invoke('copilot:send-message', workspaceId, message, folderPath),

  onMessageDelta: (callback: (workspaceId: string, delta: string) => void): void => {
    ipcRenderer.on('copilot:message-delta', (_event, workspaceId, delta) =>
      callback(workspaceId, delta)
    );
  },

  onMessageComplete: (callback: (workspaceId: string) => void): void => {
    ipcRenderer.on('copilot:message-complete', (_event, workspaceId) => callback(workspaceId));
  },

  onError: (callback: (workspaceId: string, error: string) => void): void => {
    ipcRenderer.on('copilot:error', (_event, workspaceId, error) => callback(workspaceId, error));
  },

  // Directory picker
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-directory'),

  // --- Workspaces ---
  getWorkspaces: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-workspaces'),

  addWorkspace: (id: string, name: string, folderPath: string): Promise<any> =>
    ipcRenderer.invoke('db:add-workspace', id, name, folderPath),

  updateWorkspace: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-workspace', id, fields),

  removeWorkspace: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-workspace', id),

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

  getTasksByWorkspace: (workspaceId: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-tasks-by-workspace', workspaceId),

  addTask: (task: Record<string, any>): Promise<any> =>
    ipcRenderer.invoke('db:add-task', task),

  updateTask: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-task', id, fields),

  removeTask: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-task', id),

  // --- Projects ---
  getProjects: (): Promise<any[]> =>
    ipcRenderer.invoke('db:get-projects'),

  getProjectsByTool: (toolId: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-projects-by-tool', toolId),

  getProjectsByOrg: (organizationId: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-projects-by-org', organizationId),

  addProject: (project: Record<string, any>): Promise<any> =>
    ipcRenderer.invoke('db:add-project', project),

  updateProject: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-project', id, fields),

  removeProject: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-project', id),

  // --- Workspace Agents ---
  getWorkspaceAgents: (workspaceId: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-workspace-agents', workspaceId),

  getWorkspaceAgent: (id: string): Promise<any> =>
    ipcRenderer.invoke('db:get-workspace-agent', id),

  addWorkspaceAgent: (agent: Record<string, any>): Promise<any> =>
    ipcRenderer.invoke('db:add-workspace-agent', agent),

  updateWorkspaceAgent: (id: string, fields: Record<string, any>): Promise<void> =>
    ipcRenderer.invoke('db:update-workspace-agent', id, fields),

  removeWorkspaceAgent: (id: string): Promise<void> =>
    ipcRenderer.invoke('db:remove-workspace-agent', id),

  // --- GitHub ---
  githubCheckConnectivity: (token: string): Promise<{ ok: boolean; login: string; error?: string }> =>
    ipcRenderer.invoke('github:check-connectivity', token),

  githubGetOrgs: (token: string): Promise<{ id: number; login: string; avatar_url: string }[]> =>
    ipcRenderer.invoke('github:get-orgs', token),

  githubGetOrgProjects: (token: string, org: string): Promise<{ id: string; title: string; number: number; url: string; closed: boolean }[]> =>
    ipcRenderer.invoke('github:get-org-projects', token, org),

  githubSyncProject: (
    token: string, projectId: string, projectTitle: string,
    projectNumber: number, toolId: string, organization: string
  ): Promise<{ created: number; updated: number; total: number }> =>
    ipcRenderer.invoke('github:sync-project', token, projectId, projectTitle, projectNumber, toolId, organization),

  githubUnsyncProject: (projectExternalId: string, toolId: string): Promise<void> =>
    ipcRenderer.invoke('github:unsync-project', projectExternalId, toolId),

  // --- Sync Log ---
  getSyncLogs: (toolId: string): Promise<any[]> =>
    ipcRenderer.invoke('db:get-sync-logs', toolId),

  clearSyncLogs: (toolId: string): Promise<void> =>
    ipcRenderer.invoke('db:clear-sync-logs', toolId),

  githubCheckConnectivityCli: (): Promise<{ ok: boolean; login: string; error?: string }> =>
    ipcRenderer.invoke('github:check-connectivity-cli'),

  githubGetOrgsCli: (): Promise<{ id: number; login: string; avatar_url: string }[]> =>
    ipcRenderer.invoke('github:get-orgs-cli'),

  // --- Copilot ---
  copilotGetAuthStatus: (): Promise<any> =>
    ipcRenderer.invoke('copilot:auth-status'),

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

  // --- Popout workspace window ---
  popoutWorkspace: (workspaceId: string, workspaceName: string): Promise<void> =>
    ipcRenderer.invoke('window:popout-workspace', workspaceId, workspaceName),

  openMermaidBuilder: (workspaceId: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke('window:open-mermaid-builder', workspaceId, filePath),

  openPlanEditor: (workspaceId: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke('window:open-plan-editor', workspaceId, filePath),

  // --- File System ---
  readFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('fs:read-file', filePath),

  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:write-file', filePath, content),

  exists: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:exists', filePath),

  listFiles: (dirPath: string, extension?: string): Promise<string[]> =>
    ipcRenderer.invoke('fs:list-files', dirPath, extension),

  // --- Calendar ---
  calendarLogin: (): Promise<string | null> =>
    ipcRenderer.invoke('calendar:login'),

  calendarSync: (accountId: string, otherUserEmail?: string): Promise<void> =>
    ipcRenderer.invoke('calendar:sync', accountId, otherUserEmail),

  calendarGetEvents: (userId: string): Promise<any[]> =>
    ipcRenderer.invoke('calendar:get-events', userId),

  calendarLogout: (): Promise<void> =>
    ipcRenderer.invoke('calendar:logout'),
});
