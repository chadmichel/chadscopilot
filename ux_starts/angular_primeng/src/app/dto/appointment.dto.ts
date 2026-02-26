export type AppointmentType =
  | 'BEST_TEST'
  | 'TEST'
  | 'OTHER'
  // Types shown in API docs/examples
  | 'intake'
  | 'follow_up'
  // Allow backend-defined strings without breaking the UI
  | (string & {});

export interface AppointmentDto {
  id?: string; // Optional because create payloads won't have it
  /**
   * API docs show `date` as "YYYY-MM-DD". We also support ISO date-time strings
   * ("YYYY-MM-DDTHH:mm") to enable time selection in the UI.
   */
  date: string;
  /** Optional start time in HH:MM (24-hour) */
  startTime?: string;
  title?: string;
  appointmentType: AppointmentType;
  duration?: number; // minutes
  description?: string;

  creator?: string;
  createdAt?: string; // ISO string

  studentId: string;
  studentName?: string;

  /** Optional coordinator/tutor assignment */
  userId?: string;
  userDisplayName?: string;
}

export type CreateAppointmentDto = Omit<
  AppointmentDto,
  'studentId' | 'studentName' | 'createdAt'
>;
