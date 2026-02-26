// Exam & Placement DTOs

import { StudentLevel } from './student.dto';

export type ExamStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';

// Re-export StudentLevel for convenience
export type { StudentLevel };

export interface StudentExamSummaryDto {
  studentId: string;
  studentName: string;
  studentInitials: string;
  currentLevel: StudentLevel;
  examCount: number;
  nextExamDate?: Date;
  nextExamType?: string;
  classId?: string;
  className?: string;
  coordinatorName?: string;
  lastExamDate?: Date;
  lastExamScore?: number;
}

export interface ExamRecordDto {
  id: string;
  studentId: string;
  studentName: string;
  examTypeId: string;
  examTypeName: string;
  examDate: Date;
  scheduledTime?: string;
  status: ExamStatus;
  score?: number;
  maxScore?: number;
  passingScore?: number;
  passed?: boolean;
  levelBefore?: StudentLevel;
  levelAfter?: StudentLevel;
  notes?: string;
  administeredBy?: string;
  classId?: string;
  className?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScheduleExamDto {
  studentId: string;
  examTypeId: string;
  examDate: Date;
  scheduledTime?: string;
  notes?: string;
}

export interface ExamStatsDto {
  studentsAssessed: number;
  dueThisMonth: number;
  levelProgressions: number;
  totalExamsGiven: number;
}
