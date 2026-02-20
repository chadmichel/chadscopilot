import { Injectable } from '@angular/core';
import { TaskService } from './task.service';
import { TaskDto } from '../dto/task.dto';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class WorkEngineService {
    constructor(private taskService: TaskService) { }

    /**
     * What should I be working on:
     * - Tasks currently 'inprocess'
     * - Tasks due today
     * - Past due tasks that are not complete
     */
    getWorkingOn(): Observable<TaskDto[]> {
        return this.taskService.getBoardTasks('all').pipe(
            map((res) => {
                const tasks = (res.items || []).map((qi: any) => ({
                    id: qi.id,
                    ...(qi.item || {}),
                })) as TaskDto[];

                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                return tasks.filter((t) => {
                    if (t.status === 'complete') return false;
                    if (t.status === 'inprocess') return true;

                    if (t.dueAt) {
                        const due = new Date(t.dueAt);
                        const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                        if (dueDate.getTime() <= today.getTime()) return true;
                    }

                    return false;
                }).sort((a, b) => this.sortTasks(a, b));
            })
        );
    }

    /**
     * Up next:
     * - Tasks in 'ondeck' status
     * - Sorted by priority and then sort order
     */
    getUpNext(): Observable<TaskDto[]> {
        return this.taskService.getBoardTasks('all').pipe(
            map((res) => {
                const tasks = (res.items || []).map((qi: any) => ({
                    id: qi.id,
                    ...(qi.item || {}),
                })) as TaskDto[];

                return tasks.filter((t) => t.status === 'ondeck')
                    .sort((a, b) => this.sortTasks(a, b));
            })
        );
    }

    /**
     * What's overdue:
     * - Tasks with due date in the past
     * - Not completed
     */
    getOverdue(): Observable<TaskDto[]> {
        return this.taskService.getBoardTasks('all').pipe(
            map((res) => {
                const tasks = (res.items || []).map((qi: any) => ({
                    id: qi.id,
                    ...(qi.item || {}),
                })) as TaskDto[];

                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                return tasks.filter((t) => {
                    if (t.status === 'complete') return false;
                    if (!t.dueAt) return false;

                    const due = new Date(t.dueAt);
                    const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                    return dueDate.getTime() < today.getTime();
                }).sort((a, b) => this.sortTasks(a, b));
            })
        );
    }

    private sortTasks(a: TaskDto, b: TaskDto): number {
        // Priority first
        const pMap: Record<string, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };
        const ap = pMap[a.priority || 'p3'];
        const bp = pMap[b.priority || 'p3'];
        if (ap !== bp) return ap - bp;

        // Then due date
        if (a.dueAt && b.dueAt) {
            return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        }
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;

        // Then sort order
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
}
