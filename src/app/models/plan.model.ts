export interface PlanResource {
    id: string;
    name: string;
    allocation: number;
    daysOff: string[];
}

export interface PlanActivity {
    id: string;
    name: string;
    resourceId: string;
    resourceName: string;
    durationDays: number;
    startDate: string;
    endDate: string;
    dependsOn: string[];
    priority: number;
    color?: string;
    float?: number;
    criticalPath?: boolean;
    value?: number;
}

export interface EarnedValueEntry {
    date: string;
    projectedPercent: number;
    projectedEarned: number;
    actualPercent: number;
    actualEarned: number;
    activitiesFinished: string[];
    activitiesWorked: string[];
    resources: string[];
}

export interface PlanData {
    startDate: string;
    resources: PlanResource[];
    activities: PlanActivity[];
    earnedValue: EarnedValueEntry[];
    workWeek?: number[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat] - values 0-1
    holidays?: string[]; // YYYY-MM-DD
}
