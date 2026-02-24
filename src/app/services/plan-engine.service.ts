import { Injectable } from '@angular/core';
import { PlanData, PlanActivity } from '../models/plan.model';

@Injectable({
    providedIn: 'root'
})
export class PlanEngineService {

    calculate(plan: PlanData): void {
        if (!plan.startDate) return;
        const projectBaseDate = new Date(plan.startDate);
        if (isNaN(projectBaseDate.getTime())) return;

        // Reset dates for all activities
        plan.activities.forEach(a => {
            a.startDate = '';
            a.endDate = '';
        });

        const activities = [...plan.activities];
        const processed = new Set<string>();

        // Track next available date for each resource
        const resourceAvailability = new Map<string, number>();
        plan.resources.forEach(r => resourceAvailability.set(r.id, projectBaseDate.getTime()));
        // Global availability for unassigned tasks
        const globalAvailability = projectBaseDate.getTime();
        let unassignedAvailability = globalAvailability;

        let changed = true;
        while (changed) {
            changed = false;

            // Find activities that haven't been processed but whose dependencies are ALL processed
            const readyActivities = activities.filter(a =>
                !processed.has(a.id) &&
                a.dependsOn.every(depId => processed.has(depId))
            );

            if (readyActivities.length === 0) break;

            // Sort ready activities by priority (descending, higher priority first)
            readyActivities.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            for (const act of readyActivities) {
                // Calculate the earliest start date based on dependencies
                let earliestStart = projectBaseDate.getTime();
                for (const depId of act.dependsOn) {
                    const dep = activities.find(a => a.id === depId);
                    if (dep && dep.endDate) {
                        const depEnd = new Date(dep.endDate).getTime();
                        if (depEnd > earliestStart) {
                            earliestStart = depEnd;
                        }
                    }
                }

                const resourceId = act.resourceId;
                const resource = plan.resources.find(r => r.id === resourceId);
                const allocation = (resource && resource.allocation > 0) ? resource.allocation : 1.0;

                let startMs: number;
                if (resourceId) {
                    const resStart = resourceAvailability.get(resourceId) || earliestStart;
                    startMs = Math.max(earliestStart, resStart);
                } else {
                    startMs = Math.max(earliestStart, unassignedAvailability);
                }

                // Advance day-by-day to calculate end date based on effort
                let effortRemaining = act.durationDays || 0.1;
                let currentMs = startMs;
                const dayMs = 24 * 60 * 60 * 1000;

                // Normalizing work week defaults if missing (Sat/Sun 0, others 1)
                const workWeek = plan.workWeek || [0, 1, 1, 1, 1, 1, 0];

                while (effortRemaining > 0.001) {
                    const d = new Date(currentMs);
                    const dayOfWeek = d.getDay();
                    const isoDate = d.toISOString().split('T')[0];

                    let dayAvailability = workWeek[dayOfWeek];

                    if (plan.holidays && plan.holidays.includes(isoDate)) {
                        dayAvailability = 0;
                    }

                    if (resource && resource.daysOff && resource.daysOff.includes(isoDate)) {
                        dayAvailability = 0;
                    }

                    const dailyProgress = dayAvailability * allocation;

                    if (dailyProgress > 0) {
                        if (dailyProgress >= effortRemaining) {
                            effortRemaining = 0;
                        } else {
                            effortRemaining -= dailyProgress;
                            currentMs += dayMs;
                        }
                    } else {
                        currentMs += dayMs;
                    }
                }

                const start = new Date(startMs);
                const end = new Date(currentMs + dayMs); // Task ends at end of day

                act.startDate = start.toISOString().split('T')[0];
                act.endDate = end.toISOString().split('T')[0];

                // Update availability
                if (resourceId) {
                    resourceAvailability.set(resourceId, end.getTime());
                } else {
                    unassignedAvailability = end.getTime();
                }

                processed.add(act.id);
                changed = true;
            }
        }
    }
}
