// Transportation DTOs

import { AssignedUser } from './user.dto';

export type RouteStatus = 'active' | 'inactive' | 'completed';
export type AttendanceStatus = 'OnBoard' | 'NoShow' | 'Absent' | 'Excused' | 'Unmarked';
export type Priority = 'High' | 'Medium' | 'Low';

// Route Location
export interface RouteLocation {
  address: string;
  lat?: number;
  lng?: number;
  order: number;
  type?: 'pickup' | 'dropoff';
  notes?: string;
}

// Waitlist Item
export interface WaitlistItem {
  studentId: string;
  childIds?: string[];
  priority?: Priority;
  notes?: string;
  requestedClassIds?: string[];
  createdAt: string;
}

export interface WaitlistData {
  items: WaitlistItem[];
}

// Route DTO
export interface RouteDto {
  name: string;
  capacity: number;
  arrivalTime?: string; // HH:MM:SS - when van arrives at destination
  departTime?: string; // HH:MM:SS - when van departs from destination
  coordinatorId?: string;
  waitlist?: WaitlistData;
  locations?: RouteLocation[];
  status?: RouteStatus;
  notes?: string;
  tenantId?: string;
  origin?: string; // Origin / starting location for the route
  destination?: string; // Final destination for the route
  driverIds?: string[];
  vanIds?: string[];

  // Read-only fields populated from relations
  coordinatorName?: string;
  coordinatorPhone?: string;
  vans?: VanDto[];
  drivers?: AssignedUser[];
  classes?: any[];
  assignedStudentsCount?: number;
  waitlistCount?: number;
}

// Van DTO
export interface VanDto {
  name: string;
  capacity: number;
  licensePlate?: string;
  status?: string; // active, inactive, maintenance
  notes?: string;
  tenantId?: string;
}

// Student Address DTO
export interface StudentAddressDto {
  id?: string;
  studentId?: string;
  nickname: string; // e.g., "Home", "Work", "Church"
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  isDefault?: boolean;
  tenantId?: string;
}

// Route Student DTO
export interface RouteStudentDto {
  routeId: string;
  studentId: string;
  date?: string | null; // YYYY-MM-DD or null for ongoing
  status?: string; // assigned, waitlist_promoted, temporary
  notes?: string;
  tenantId?: string;
  pickupOrder?: number; // Order for pickup optimization
  addressId?: string; // Selected address for pickup
  selectedChildIds?: string[]; // IDs of children selected for this route assignment

  // Read-only fields
  studentName?: string;
  routeName?: string;
  address?: string; // Student street address
  addressNickname?: string; // Nickname for the pickup address
  phone?: string; // Student phone number
  children?: any[];
}

// Route Attendance DTO
export interface RouteAttendanceDto {
  routeId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  tenantId?: string;

  // Read-only fields
  studentName?: string;
  markedAt?: string;
}

// Batch Attendance DTO
export interface BatchRouteAttendanceDto {
  date: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
  }>;
}

export interface MapUrlResponse {
  routeId: string;
  routeName: string;
  mapUrl: string;
  locationCount: number;
}
