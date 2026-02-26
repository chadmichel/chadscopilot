// Child Care DTOs
import { DayOfWeek } from '../utils';

// ============ Child DTOs ============
export interface ChildDto {
  id?: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  age?: number;
  allergies: string;
  language?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  needsCarSeat?: boolean;
  needsBooster?: boolean;
  parentName?: string;
  classId?: string;
  className?: string;
  notes?: string;
  tenantId?: string;
  photoConsent?: boolean;
}

export interface CreateChildDto {
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  allergies: string;
  language?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  needsCarSeat?: boolean;
  needsBooster?: boolean;
  photoConsent?: boolean;
}

export interface UpdateChildDto extends Partial<CreateChildDto> {}

// ============ Session DTOs ============
export interface EnrolledChildInfo {
  id: string;
  childId: string;
  childName: string;
  age?: number;
  parentId: string;
  parentName: string;
  enrolledDays: DayOfWeek[];
}

export interface ChildcareSessionDto {
  id: string;
  scheduleId: string;
  locationId: string;
  locationName: string;
  coordinatorId: string;
  coordinatorName: string;
  name: string;
  startTime: string;
  endTime: string;
  sessionDate: string;
  maxCapacity: number;
  currentCount: number;
  status: 'active' | 'cancelled';
  daysOfWeek: DayOfWeek[];
  minders: MinderInfo[];
  enrolledChildren: EnrolledChildInfo[];
}

export interface CreateSessionDto {
  scheduleId: string;
  locationId: string;
  coordinatorId: string;
  name: string;
  startTime: string;
  endTime: string;
  sessionDate: string;
  maxCapacity?: number;
}

export interface UpdateSessionDto {
  name?: string;
  startTime?: string;
  endTime?: string;
  maxCapacity?: number;
  status?: 'active' | 'cancelled';
}

// ============ Minder DTOs ============
export interface MinderInfo {
  id: string;
  userId: string;
  userName: string;
}

// ============ Attendance DTOs ============
export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface ChildAttendanceInfo {
  childId: string;
  childName: string;
  age?: number;
  parentId: string;
  parentName: string;
  attendanceStatus: AttendanceStatus;
  allergies: string;
  language?: string;
  notes?: string;
  photoConsent?: boolean;
}

// ============ Location/Shift Options ============
export interface LocationOption {
  id: string;
  name: string;
  hasChildcare: boolean;
}

// ============ Query Params ============
export interface SessionQueryParams {
  date: string;
  coordinatorId?: string;
  locationId?: string;
}

export interface AttendanceQueryParams {
  sessionId: string;
  date: string;
}

export interface StatsQueryParams {
  date: string;
  sessionId?: string;
}

// ============ Incident DTOs ============
export interface CreateIncidentDto {
  childId: string;
  sessionId: string;
  sessionDate: string;
  incidentType: 'injury' | 'behavioral' | 'medical' | 'other';
  description: string;
}

export interface ChildIncidentInfo {
  id: string;
  childId: string;
  childName: string;
  incidentType: 'injury' | 'behavioral' | 'medical' | 'other';
  description: string;
  createdAt: string;
}

// ============ Enrollment DTOs ============
export interface EnrollChildDto {
  scheduleId: string;
  childId: string;
  enrolledDays: DayOfWeek[];
  notes?: string;
}

export interface SessionEnrollmentDto {
  id: string;
  scheduleId: string;
  childId: string;
  childName: string;
  age?: number;
  parentId: string;
  parentName: string;
  enrolledDays: DayOfWeek[];
  status: string;
  notes?: string;
  allergies?: string;
  enrolledAt: string;
}

// ============ Session Schedule DTOs ============
export interface CreateScheduleDto {
  name: string;
  locationId: string;
  coordinatorId: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  startDate: string;
  endDate: string;
  maxCapacity?: number;
}

export interface UpdateScheduleDto {
  name?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: DayOfWeek[];
  startDate?: string;
  endDate?: string;
  maxCapacity?: number;
  status?: string;
}

export interface SessionScheduleDto {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  coordinatorId: string;
  coordinatorName: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  startDate: string;
  endDate: string;
  maxCapacity: number;
  status: string;
}

