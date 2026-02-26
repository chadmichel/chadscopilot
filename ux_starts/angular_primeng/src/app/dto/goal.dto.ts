// Goal related DTOs

export type GoalCategory =
  | 'ENGLISH'
  | 'GED'
  | 'JOB'
  | 'COMPUTER'
  | 'CITIZENSHIP'
  | 'DRIVING'
  | 'COLLEGE'
  | 'CREDENTIAL_EVAL'
  | 'HEALTHCARE'
  | 'CDL'
  | 'EDUCATION_CAREER'
  | 'FOOD_SAFETY'
  | 'PRE_LITERATE'
  | 'FINANCIAL_LITERACY';

export type StudentGoalStatus = 'active' | 'completed' | 'on_hold' | 'abandoned';

export interface GoalPipelineDto {
  name: string;
  sortOrder: number;
}

export interface GoalDto {
  name: string;
  description?: string;
  category: GoalCategory;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Nested levels when fetching a single goal
  levels?: GoalLevelDto[];
  // Pipeline stages for this goal
  pipeline?: GoalPipelineDto[];
}

export interface GoalLevelDto {
  id?: string;
  goalId: string;
  levelNumber: number;
  name: string;
  description?: string;
  requirements?: string;
  estimatedHours?: number;
  hasCertificate?: boolean;
  certificateName?: string;
  certificateTemplate?: string;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Runtime property set from student goal level status
  complete?: boolean;
}

export interface StudentGoalDto {
  id?: string;
  studentId: string;
  goalId: string;
  currentLevel?: number;
  status?: StudentGoalStatus;
  priority?: number;
  startedAt?: Date;
  targetDate?: Date;
  completedAt?: Date;
  notes?: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Populated fields for display
  goal?: GoalDto;
  goalName?: string;
  goalCategory?: GoalCategory;
  levelHistory?: StudentLevelHistoryDto[];
}

export interface StudentLevelHistoryDto {
  id?: string;
  studentGoalId: string;
  levelNumber: number;
  achievedAt?: Date;
  verifiedBy?: string;
  verifiedByName?: string;
  certificateIssued?: boolean;
  certificateIssuedAt?: Date;
  certificateNumber?: string;
  notes?: string;
  examScore?: number;
  hoursCompleted?: number;
  createdAt?: Date;
}

export interface StudentLevelAdvanceDto {
  newLevel: number;
  verifiedBy?: string;
  examScore?: number;
  hoursCompleted?: number;
  notes?: string;
}

// For display in student profile - includes goal info
export interface StudentGoalWithDetails extends StudentGoalDto {
  goal: GoalDto;
  totalLevels: number;
  progressPercent: number;
  nextLevelName?: string;
}

// Response from GET student/:studentId/goals/:goalId/levels
export interface StudentGoalLevelStatusDto {
  studentGoalId: string;
  goalId: string;
  levelName: string;
  complete: boolean;
}
