// Queue/Work Queue DTOs

export type QueueItemStatus =
  | 'New'
  | 'In Progress'
  | 'Waiting'
  | 'Completed'
  | 'Cancelled';
export type QueueItemPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type QueueItemType =
  | 'Task'
  | 'Follow-up'
  | 'Call'
  | 'Email'
  | 'Meeting'
  | 'Review'
  | 'Other';

export interface QueueItemDto {
  title: string;
  description?: string;
  type: QueueItemType;
  status: QueueItemStatus;
  priority: QueueItemPriority;
  assignedTo: string; // User ID
  assignedToName?: string; // Display name
  relatedEntity?: string; // e.g., 'student', 'class', 'volunteer'
  relatedEntityId?: string;
  relatedEntityName?: string;
  dueDate?: Date;
  completedDate?: Date;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QueueUserOption {
  id: string;
  name: string;
}
