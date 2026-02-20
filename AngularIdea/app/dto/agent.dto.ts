export enum AgentLinkType {
  BOARD = 'board',
  BOARDS_LIST = 'boards_list',
  PROJECT = 'project',
  PROJECTS_LIST = 'projects_list',
  TASK = 'task',
  TASKS_LIST = 'tasks_list',
  INTEGRATIONS = 'integrations',
  USER = 'user',
  SETTINGS = 'settings',
}

// Navigation link for frontend routing
export interface AgentLinkDto {
  type: AgentLinkType;
  label: string;
  path: string;
  resourceId?: string;
  parentId?: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
  links?: AgentLinkDto[];
}

export interface AgentConversationDto {
  id?: string;
  title: string;
  summary?: string;
  status: 'active' | 'completed' | 'archived';
  messages: AgentMessage[];
  messageCount: number;
  lastMessageAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentChatRequest {
  message: string;
}

export interface AgentChatResponse {
  message: string;
  conversationId: string;
  toolsUsed?: string[];
  links?: AgentLinkDto[];
}

export interface AgentCapabilities {
  tools: AgentToolInfo[];
  model: string;
}

export interface AgentToolInfo {
  name: string;
  description: string;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface CreateConversationResponse {
  conversation: AgentConversationDto;
}

