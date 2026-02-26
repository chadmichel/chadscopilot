export interface DashboardSummaryDto {
    activeStudents: number;
    newRegistrations: number;
    attendanceRate: number;
    activeClasses: number;
    goalsCompleted: number;
    examsPassed: number;
    childrenInChildcare: number;
    studentsTransported: number;
    openTasks: number;
    overdueTasks: number;
}

export interface DashboardStudentMetricsDto {
    totalActive: number;
    newRegistrations: number;
    statusBreakdown: { status: string; count: number }[];
    programBreakdown: { program: string; count: number }[];
    levelBreakdown: { level: string; count: number }[];
    funnelStages: { funnelStage: string; count: number }[];
    servicesNeeded: {
        needsTransportation: number;
        needsChildcare: number;
        needsBoth: number;
    };
    agreements: {
        signed: number;
        unsigned: number;
        signedPercentage: number;
    };
}

export interface DashboardAttendanceMetricsDto {
    overview: {
        attended: number;
        total: number;
        attendanceRate: number;
    };
    byStatus: { status: string; count: number; percentage: number }[];
    trend: { period: string; attended: number; total: number; attendanceRate: number }[];
    byClass: { classId: string; className: string; attended: number; total: number; attendanceRate: number }[];
    lowAttendanceStudents: { studentId: string; studentName: string; attended: number; total: number; attendanceRate: number }[];
}

export interface DashboardClassMetricsDto {
    byStatus: { status: string; count: number }[];
    enrollmentSummary: {
        classId: string;
        className: string;
        maxCapacity: number;
        enrolledCount: number;
        availableSpots: number;
        fillRate: number;
    }[];
    byType: { type: string; count: number }[];
    byLocation: { locationId: string; locationName: string; classCount: number }[];
    sessionsHeld: number;
    newEnrollments: number;
}

export interface DashboardGoalMetricsDto {
    activeGoals: { goalName: string; category: string; studentCount: number }[];
    completion: {
        goalsCompleted: number;
        levelAdvancements: number;
        uniqueStudentGoals: number;
        certificatesIssued: number;
    };
    pipelineStages: any[];
    avgHoursByGoal: { goalName: string; avgHoursToComplete: number }[];
}

export interface DashboardTaskMetricsDto {
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    overdueTasks: number;
    tasksCompleted: number;
    byAssignee: { userId: string; userName: string; openTasks: number; completedTasks: number }[];
}

export interface DashboardTransportationMetricsDto {
    activeRoutes: number;
    totalCapacity: number;
    studentsTransported: number;
    routeUtilization: {
        routeId: string;
        routeName: string;
        capacity: number;
        assignedStudents: number;
        utilizationRate: number;
    }[];
    attendanceByStatus: { status: string; count: number; percentage: number }[];
    noShowCount: number;
    uniqueNoShowStudents: number;
    fleetStatus: { status: string; count: number }[];
}

export interface DashboardChildcareMetricsDto {
    overview: {
        totalChildren: number;
        uniqueParents: number;
        sessionsHeld: number;
        locationsUsed: number;
    };
    attendance: {
        present: number;
        total: number;
        attendanceRate: number;
    };
    sessionUtilization: {
        sessionId: string;
        sessionName: string;
        locationName: string;
        maxCapacity: number;
        attended: number;
        utilizationRate: number;
    }[];
    incidents: { incidentType: string; count: number }[];
}

export interface DashboardStaffMetricsDto {
    overview: {
        totalStaff: number;
        coordinators: number;
        tutors: number;
        volunteers: number;
    };
    tutorWorkload: {
        tutorId: string;
        tutorName: string;
        classCount: number;
        totalStudentCapacity: number;
    }[];
    appointmentsByStaff: { userId: string; userName: string; appointmentCount: number }[];
}

export interface DashboardFiltersDto {
    dateRange: 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';
    startDate?: string;
    endDate?: string;
}
