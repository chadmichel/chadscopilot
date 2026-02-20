import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DayFact, MonthFact } from '../dto/fact.dto';
import { TaskService } from './task.service';
import { AgentService } from './agent.service';
import { OfflineSyncService } from './offline-sync.service';
import { map, switchMap } from 'rxjs/operators';
import { from } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class FactService {
    constructor(
        private syncService: OfflineSyncService,
        private taskService: TaskService,
        private agentService: AgentService
    ) { }

    getDayFact(dayDimension: number): Observable<DayFact | null> {
        const all = this.syncService.getDayFactsSnapshot();
        const found = (all?.items || []).find((it) => it.item.dayDimension === dayDimension);
        return of(found ? found.item : null);
    }

    saveDayFact(dayDimension: number, fact: Partial<DayFact>): Observable<void> {
        const existing = this.syncService.getDayFactsSnapshot();
        let existingFact: DayFact | undefined;
        let id: string;

        // Find existing fact by dayDimension
        const found = (existing?.items || []).find((it) => it.item.dayDimension === dayDimension);
        if (found) {
            existingFact = found.item;
            id = found.id;
        } else {
            // Generate new UUID for new fact
            id = crypto.randomUUID();
        }

        const prev = existingFact || {
            dayDimension,
            friendlyName: this.formatFriendlyDate(dayDimension),
        };

        // Merge the partial fact, but ensure required fields are always set
        const next: DayFact = {
            ...prev,
            ...fact,
            // Always override with the correct values to prevent undefined from partial
            dayDimension,
            friendlyName: existingFact?.friendlyName || this.formatFriendlyDate(dayDimension),
        };

        // Enqueue for sync instead of direct local storage write
        this.syncService.enqueueDayFactUpsert(id, next);
        return of(undefined);
    }

    private formatFriendlyDate(dayDimension: number): string {
        const str = dayDimension.toString();
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const date = new Date(year, month, day);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    syncTodayTasks(): Observable<DayFact | null> {
        const today = new Date();
        const dayDimension = parseInt(
            today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0')
        );

        return this.taskService.getBoardTasks('all').pipe(
            switchMap(res => {
                const tasks = (res.items || []).map(it => it.item);
                const tasksActive = tasks
                    .filter(t => t && (t.status === 'ondeck' || t.status === 'inprocess'))
                    .map(t => t!.title);
                const tasksCompleted = tasks
                    .filter(t => t && t.status === 'complete')
                    .map(t => t!.title);

                return this.getDayFact(dayDimension).pipe(
                    switchMap(existing => {
                        const fact: Partial<DayFact> = {
                            tasksActive,
                            tasksCompleted,
                            // Preserve notes from existing fact
                            notes: existing?.notes || ''
                        };

                        // If no description exists, or tasks changed significantly, generate a new summary
                        const shouldUpdateSummary = !existing?.description ||
                            (existing.tasksActive?.length !== tasksActive.length) ||
                            (existing.tasksCompleted?.length !== tasksCompleted.length);

                        const baseFact = { ...(existing || {}), ...fact, dayDimension, friendlyName: this.formatFriendlyDate(dayDimension) } as DayFact;

                        if (shouldUpdateSummary) {
                            return from(this.generateDaySummary(baseFact)).pipe(
                                switchMap(summary => {
                                    const finalFact = { ...baseFact, description: summary };
                                    return this.saveDayFact(dayDimension, finalFact).pipe(
                                        map(() => finalFact)
                                    );
                                })
                            );
                        }

                        return this.saveDayFact(dayDimension, baseFact).pipe(
                            map(() => baseFact)
                        );
                    })
                );
            })
        );
    }

    private async generateDaySummary(fact: DayFact): Promise<string> {
        const activeTasksText = (fact.tasksActive || []).join(', ');
        const completedTasksText = (fact.tasksCompleted || []).join(', ');
        const meetingsText = (fact.meetings || []).map(m => m.summary || m.title).join(', ');

        const prompt = `System: You are a professional productivity assistant. Summarize the user's daily work based ONLY on the provided data.
        
Data Input:
- Active Ongoing Focus: ${activeTasksText || 'None'}
- Completed Achievements: ${completedTasksText || 'None'}
- Key Collaborative Meetings: ${meetingsText || 'None'}
        
Task: Write a high-quality 2-sentence summary.
- Be specific: Mention the actual task names or themes (e.g., "Refactoring the auth module" instead of "working on tasks").
- Be professional but active: Use words like "spearheaded", "finalized", "focused on", "coordinated".
- If no tasks are present, mention that the day was primarily focused on planning or coordination.
- DO NOT use generic phrases like "Busy day working on tasks".
- Format: Return ONLY the summary text.`;

        try {
            const summary = await this.agentService.generateSummary(prompt);
            return summary || "Focusing on core project milestones and coordination.";
        } catch (e) {
            console.error("Failed to generate summary:", e);
            return "Focusing on task progression and daily objectives.";
        }
    }

    getMonthFact(monthDimension: number): Observable<MonthFact | null> {
        const all = this.syncService.getMonthFactsSnapshot();
        const found = (all?.items || []).find((it) => it.item.monthDimension === monthDimension);
        return of(found ? found.item : null);
    }

    saveMonthFact(monthDimension: number, fact: Partial<MonthFact>): Observable<void> {
        const existing = this.syncService.getMonthFactsSnapshot();
        let existingFact: MonthFact | undefined;
        let id: string;

        // Find existing fact by monthDimension
        const found = (existing?.items || []).find((it) => it.item.monthDimension === monthDimension);
        if (found) {
            existingFact = found.item;
            id = found.id;
        } else {
            // Generate new UUID for new fact
            id = crypto.randomUUID();
        }

        const prev = existingFact || {
            monthDimension,
            friendlyName: this.formatFriendlyMonth(monthDimension),
        };

        // Merge the partial fact, but ensure required fields are always set
        const next: MonthFact = {
            ...prev,
            ...fact,
            // Always override with the correct values to prevent undefined from partial
            monthDimension,
            friendlyName: existingFact?.friendlyName || this.formatFriendlyMonth(monthDimension),
        };

        // Enqueue for sync instead of direct local storage write
        this.syncService.enqueueMonthFactUpsert(id, next);
        return of(undefined);
    }

    private formatFriendlyMonth(monthDimension: number): string {
        const str = monthDimension.toString();
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const date = new Date(year, month, 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
}
