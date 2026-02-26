// Class related DTOs

export type ClassStatus = 'Active' | 'Upcoming' | 'Completed' | 'Cancelled';
export type ClassLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type ClassType =
  | 'ESL'
  | 'Citizenship'
  | 'GED'
  | 'Conversation'
  | 'Other';

export interface ClassDto {
  name: string;
  description?: string;
  status: ClassStatus;
  level: ClassLevel;
  type: ClassType;

  // Staff
  tutorId?: string;
  tutorName: string;
  coordinatorId?: string;
  coordinatorName: string;

  // Schedule
  schedule: string; // e.g., "Mon, Wed, Fri"
  startTime: string; // e.g., "9:00 AM"
  endTime: string; // e.g., "11:00 AM"
  startDate?: Date;
  endDate?: Date;

  // Location
  location: string; // e.g., "Downtown Center"
  room: string; // e.g., "Room 201"

  // Enrollment
  enrolledCount: number;
  maxCapacity: number;
  waitlistCount?: number;

  // Services
  hasTransportation?: boolean;
  hasChildcare?: boolean;

  // Goal association (optional)
  goalId?: string;
  goalName?: string;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
}

export interface ClassEnrollmentDto {
  id?: string;
  classId: string;
  studentId: string;
  studentName: string;
  enrolledAt: Date;
  status: 'Enrolled' | 'Waitlisted' | 'Dropped' | 'Completed';
  notes?: string;
}

export interface ClassSessionDto {
  id?: string;
  classId: string;
  className?: string;
  maxCapacity?: number;
  date: Date;
  startTime: string;
  endTime: string;
  topic?: string;
  notes?: string;
  tutorId?: string;
  tutorName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  location?: string;
  locationId?: string;
  room?: string;
  isVirtual?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Excused'
  | 'Unmarked';

export interface AttendanceRecordDto {
  id?: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  notes?: string;
  markedAt?: Date;
  markedBy?: string;
  lastAttendedAt?: string; // e.g., "2d ago"
  createdAt?: Date;
  updatedAt?: Date;
  // UI state property
  updating?: boolean;
}

export interface SessionWithAttendance extends ClassSessionDto {
  attendanceRecords?: AttendanceRecordDto[];
  presentCount?: number;
  absentCount?: number;
  excusedCount?: number;
  unmarkedCount?: number;
  totalEnrolled?: number;
}
