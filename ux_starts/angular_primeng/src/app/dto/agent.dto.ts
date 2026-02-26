// Link types for agent navigation
export enum AgentLinkType {
  // Student links
  STUDENT = 'student',
  STUDENT_DASHBOARD = 'student_dashboard',
  STUDENT_EXAMS = 'student_exams',
  STUDENT_CLASSES = 'student_classes',

  // Class links
  CLASS = 'class',
  CLASS_DASHBOARD = 'class_dashboard',
  CLASS_STUDENTS = 'class_students',
  CLASS_SESSION = 'class_session',
  CLASS_ATTENDANCE = 'class_attendance',

  // Exam links
  EXAM = 'exam',
  EXAM_TYPE = 'exam_type',

  // Volunteer links
  VOLUNTEER = 'volunteer',
  VOLUNTEER_CLASSES = 'volunteer_classes',

  // Childcare links
  CHILD = 'child',
  CHILDCARE_CHECKIN = 'childcare_checkin',

  // Queue/Task links
  QUEUE_ITEM = 'queue_item',

  // Admin links
  LOCATION = 'location',
  VEHICLE = 'vehicle',
  USER = 'user',

  // List views
  STUDENTS_LIST = 'students_list',
  CLASSES_LIST = 'classes_list',
  EXAMS_LIST = 'exams_list',
  VOLUNTEERS_LIST = 'volunteers_list',
  CHILDREN_LIST = 'children_list',
  QUEUE_LIST = 'queue_list',
  LOCATIONS_LIST = 'locations_list',
  VEHICLES_LIST = 'vehicles_list',
  USERS_LIST = 'users_list',
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

