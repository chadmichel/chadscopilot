// Student related DTOs

export type StudentStatus = 'Active' | 'Inactive';
export type StudentProgram = 'ELL' | 'ADS' | 'BOTH';
export type StudentLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type StudentClassPreference = 'online' | 'in-person';

export type StudentScheduleSlot = 'morning' | 'afternoon' | 'evening';
export type StudentScheduleAvailability = Partial<
  Record<
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday',
    StudentScheduleSlot[]
  >
>;

export interface StudentAlternateContactDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface StudentEmploymentEducationDto {
  employmentStatus?: string;
  occupationInUs?: string;
  occupationInHomeCountry?: string;
  highestEducationLevel?: string;
  hasTranscripts?: boolean;
  annualFamilyIncome?: string;
  householdSize?: number;
}
export interface StudentNoteDto {
  id?: string;
  studentId: string;
  content: string;
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
}

export interface ClassAssignmentDto {
  id?: string;
  studentId: string;
  classId: string;
  className: string;
  classLevel: StudentLevel;
  classStatus?: string; // e.g., "Active"
  classType?: string; // e.g., "ESL"
  instructor?: string;
  location?: string;
  schedule: string; // e.g., "Mon, Wed, Fri"
  time?: string; // e.g., "9:00 AM - 11:00 AM"
  startTime?: string; // e.g., "09:00:00"
  endTime?: string; // e.g., "11:00:00"
  enrolledCount?: number;
  maxCapacity?: number;
  enrolledAt?: Date;
  status?: 'Enrolled' | 'Waitlisted' | 'Completed' | 'Dropped';
}

export interface TestResultDto {
  id?: string;
  studentId: string;
  testType: string; // e.g., "BEST Test"
  testDate: Date;
  administeredBy?: string;
  rawScore?: number;
  level?: number;
  status?: 'Improved' | 'Maintained' | 'Declined';
  notes?: string;
}

export interface StudentDto {
  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  // Both spellings exist across docs/legacy
  nickname?: string;
  nickName?: string;
  displayName?: string; // Computed: nickname + lastName or firstName + lastName
  previousNames?: string[];
  llNumber?: string; // LL# identifier (not present for public/unconfirmed)
  age?: number;
  dateOfBirth?: Date;
  gender?: string;

  // Contact Information
  username?: string;
  phone?: string;
  email?: string;
  smsConsent?: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Background Information
  nativeCountry?: string;
  nativeLanguage?: string;
  refugeeStatus?: boolean;
  snapStatus?: boolean | null; // null = unknown
  raceEthnicity?: string[];
  alternateContact?: StudentAlternateContactDto;
  canReadWriteNativeLanguage?: boolean;
  canReadWriteEnglish?: boolean;
  married?: boolean;
  hasChildrenUnder12?: boolean;
  classPreference?: StudentClassPreference;
  scheduleAvailability?: StudentScheduleAvailability;
  hasTransportation?: boolean;
  employmentEducation?: StudentEmploymentEducationDto;
  goals?: string[];
  goalsOther?: string;
  photoPermission?: boolean;
  studentAgreementAccepted?: boolean;
  studentAgreementSignature?: string;
  studentAgreementSignedAt?: string | Date;
  hasFormHelper?: boolean;

  // Program Information
  program: StudentProgram;
  level: StudentLevel;
  status: StudentStatus;
  funnelStage?: string;

  // Service Needs
  needsTransportation?: boolean;
  needsChildCare?: boolean;

  // Relationships (for detail view)
  classAssignments?: ClassAssignmentDto[];
  testResults?: TestResultDto[];
  notes?: StudentNoteDto[];

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
}

// Summary for list view
export interface StudentListItemDto {
  firstName: string;
  lastName: string;
  nickname?: string;
  displayName: string;
  email?: string;
  llNumber: string;
  program: StudentProgram;
  level: StudentLevel;
  enrolledClasses: string[];
  status: StudentStatus;
  needsTransportation?: boolean;
  needsChildCare?: boolean;
}
