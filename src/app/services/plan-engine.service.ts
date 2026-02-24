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

        this.runForwardPass(plan);

        // Calculate Project End Date
        let projectEndMs = projectBaseDate.getTime();
        plan.activities.forEach(a => {
            if (a.endDate) {
                const end = new Date(a.endDate).getTime();
                if (end > projectEndMs) projectEndMs = end;
            }
        });

        // Backward Pass
        this.runBackwardPass(plan, projectEndMs);

        // Finalize Float and Critical Path
        plan.activities.forEach(act => {
            if (act.startDate && (act as any).lateStartDate) {
                const es = new Date(act.startDate).getTime();
                const ls = new Date((act as any).lateStartDate).getTime();

                // Calculate float in working days
                act.float = this.calculateWorkingDays(es, ls, plan);
                act.criticalPath = act.float <= 0.001;
            } else {
                act.float = 0;
                act.criticalPath = false;
            }
        });
    }

    private runForwardPass(plan: PlanData): void {
        const projectBaseDate = new Date(plan.startDate);
        const activities = [...plan.activities];
        const processed = new Set<string>();

        const resourceAvailability = new Map<string, number>();
        plan.resources.forEach(r => resourceAvailability.set(r.id, projectBaseDate.getTime()));
        let unassignedAvailability = projectBaseDate.getTime();

        let changed = true;
        while (changed) {
            changed = false;
            const readyActivities = activities.filter(a =>
                !processed.has(a.id) &&
                a.dependsOn.every(depId => processed.has(depId))
            );

            if (readyActivities.length === 0) break;
            readyActivities.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            for (const act of readyActivities) {
                let earliestStart = projectBaseDate.getTime();
                for (const depId of act.dependsOn) {
                    const dep = activities.find(a => a.id === depId);
                    if (dep && dep.endDate) {
                        const depEnd = new Date(dep.endDate).getTime();
                        if (depEnd > earliestStart) earliestStart = depEnd;
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

                const endMs = this.addWorkingDays(startMs, act.durationDays || 0.1, allocation, plan, resource);

                act.startDate = new Date(startMs).toISOString().split('T')[0];
                act.endDate = new Date(endMs).toISOString().split('T')[0];

                if (resourceId) {
                    resourceAvailability.set(resourceId, endMs);
                } else {
                    unassignedAvailability = endMs;
                }

                processed.add(act.id);
                changed = true;
            }
        }
    }

    private runBackwardPass(plan: PlanData, projectEndMs: number): void {
        const activities = [...plan.activities];
        const processed = new Set<string>();

        // Successor map
        const successorsMap = new Map<string, string[]>();
        activities.forEach(a => {
            a.dependsOn.forEach(depId => {
                if (!successorsMap.has(depId)) successorsMap.set(depId, []);
                successorsMap.get(depId)!.push(a.id);
            });
        });

        let changed = true;
        while (changed) {
            changed = false;
            // Ready for backward pass means all successors have been processed
            const readyActivities = activities.filter(a =>
                !processed.has(a.id) &&
                (successorsMap.get(a.id) || []).every(succId => processed.has(succId))
            );

            if (readyActivities.length === 0) break;

            for (const act of readyActivities) {
                const successors = successorsMap.get(act.id) || [];
                let lateFinishMs = projectEndMs;

                if (successors.length > 0) {
                    lateFinishMs = Math.min(...successors.map(succId => {
                        const succ = activities.find(a => a.id === succId);
                        return succ ? new Date((succ as any).lateStartDate).getTime() : projectEndMs;
                    }));
                }

                const resourceId = act.resourceId;
                const resource = plan.resources.find(r => r.id === resourceId);
                const allocation = (resource && resource.allocation > 0) ? resource.allocation : 1.0;

                const lateStartMs = this.subtractWorkingDays(lateFinishMs, act.durationDays || 0.1, allocation, plan, resource);
                (act as any).lateStartDate = new Date(lateStartMs).toISOString().split('T')[0];
                (act as any).lateFinishDate = new Date(lateFinishMs).toISOString().split('T')[0];

                processed.add(act.id);
                changed = true;
            }
        }
    }

    private addWorkingDays(startMs: number, duration: number, allocation: number, plan: PlanData, resource: any): number {
        let effortRemaining = duration;
        let currentMs = startMs;
        const dayMs = 24 * 60 * 60 * 1000;
        const workWeek = plan.workWeek || [0, 1, 1, 1, 1, 1, 0];

        while (effortRemaining > 0.001) {
            const d = new Date(currentMs);
            const dayOfWeek = d.getDay();
            const isoDate = d.toISOString().split('T')[0];

            let dayAvailability = workWeek[dayOfWeek];
            if (plan.holidays?.includes(isoDate)) dayAvailability = 0;
            if (resource?.daysOff?.includes(isoDate)) dayAvailability = 0;

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
        return currentMs + dayMs;
    }

    private subtractWorkingDays(finishMs: number, duration: number, allocation: number, plan: PlanData, resource: any): number {
        let effortRemaining = duration;
        let currentMs = finishMs - (24 * 60 * 60 * 1000); // Start from the day ending at finishMs
        const dayMs = 24 * 60 * 60 * 1000;
        const workWeek = plan.workWeek || [0, 1, 1, 1, 1, 1, 0];

        while (effortRemaining > 0.001) {
            const d = new Date(currentMs);
            const dayOfWeek = d.getDay();
            const isoDate = d.toISOString().split('T')[0];

            let dayAvailability = workWeek[dayOfWeek];
            if (plan.holidays?.includes(isoDate)) dayAvailability = 0;
            if (resource?.daysOff?.includes(isoDate)) dayAvailability = 0;

            const dailyProgress = dayAvailability * allocation;
            if (dailyProgress > 0) {
                if (dailyProgress >= effortRemaining) {
                    effortRemaining = 0;
                } else {
                    effortRemaining -= dailyProgress;
                    currentMs -= dayMs;
                }
            } else {
                currentMs -= dayMs;
            }
        }
        return currentMs;
    }

    private calculateWorkingDays(startMs: number, endMs: number, plan: PlanData): number {
        if (endMs <= startMs) return 0;
        let currentMs = startMs;
        let count = 0;
        const dayMs = 24 * 60 * 60 * 1000;
        const workWeek = plan.workWeek || [0, 1, 1, 1, 1, 1, 0];

        while (currentMs < endMs) {
            const d = new Date(currentMs);
            const dayOfWeek = d.getDay();
            const isoDate = d.toISOString().split('T')[0];

            let dayAvailability = workWeek[dayOfWeek];
            if (plan.holidays?.includes(isoDate)) dayAvailability = 0;

            if (dayAvailability > 0) {
                count += dayAvailability;
            }
            currentMs += dayMs;
        }
        return Math.max(0, count);
    }
}
