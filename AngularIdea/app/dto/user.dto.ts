import { TenantInfo } from './auth.dto';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';
export type TimeOfDay = 'MOR' | 'AFT' | 'EVE';
export type VolunteerStatus = 'Active' | 'Inactive' | 'On Leave' | 'Pending';

export interface UserDto {
  username: string;
  password?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
  isPrimaryBillable?: boolean;
  title?: string;
  classification?: string;
  targetHoursPerWeek?: number;
  managerId?: string;
  managerName?: string;
  isRootNode?: boolean;
  isOwner?: boolean;
  contactId?: string;
  bio?: string;
  isTutor?: boolean;
  isCoordinator?: boolean;

  // Availability (for tutors/coordinators)
  availability?: DayOfWeek[];
  timeOfDay?: TimeOfDay[];
  volunteerStatus?: VolunteerStatus;
  volunteerStartDate?: Date;
  volunteerNotes?: string;
}
