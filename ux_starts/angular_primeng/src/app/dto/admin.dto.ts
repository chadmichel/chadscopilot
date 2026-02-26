// Admin configuration DTOs

export type VolunteerStatus = 'Active' | 'Inactive' | 'On Leave' | 'Pending';
export type VolunteerRole = 'Tutor' | 'Coordinator' | 'Intern' | 'Assistant' | 'Mentor';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type TimeOfDay = 'MOR' | 'AFT' | 'EVE';

export interface VolunteerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: VolunteerStatus;
  role: VolunteerRole;
  availability: DayOfWeek[];
  timeOfDay: TimeOfDay[];
  assignedClasses?: string[]; // Class IDs
  notes?: string;
  startDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleDto {
  name: string;
  type: 'Van' | 'Bus' | 'Car' | 'SUV';
  capacity: number;
  licensePlate: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  driverName?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExamTypeDto {
  name: string;
  code: string;
  description?: string;
  category: 'Placement' | 'Progress' | 'Achievement' | 'Certification';
  duration?: number; // in minutes
  passingScore?: number;
  maxScore?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LocationDto {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  email?: string;
  type: 'Center' | 'Library' | 'School' | 'Community' | 'Other';
  capacity?: number;
  rooms?: string[];
  hasParking: boolean;
  isAccessible: boolean;
  isActive: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

