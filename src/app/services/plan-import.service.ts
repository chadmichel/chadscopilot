import { Injectable } from '@angular/core';
import { PlanData, PlanActivity, PlanResource } from '../models/plan.model';

@Injectable({
    providedIn: 'root'
})
export class PlanImportService {

    parseMspdiXml(xmlContent: string): PlanData {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        const projectNode = xmlDoc.getElementsByTagName('Project')[0];
        if (!projectNode) {
            throw new Error('Invalid MSPDI XML: No Project node found');
        }

        const startDateStr = this.getTagValue(projectNode, 'StartDate');
        const startDate = startDateStr ? startDateStr.split('T')[0] : new Date().toISOString().split('T')[0];

        const resources: PlanResource[] = [];
        const resourceNodes = xmlDoc.getElementsByTagName('Resource');
        for (let i = 0; i < resourceNodes.length; i++) {
            const node = resourceNodes[i];
            const uid = this.getTagValue(node, 'UID');
            const name = this.getTagValue(node, 'Name');

            // Resources without names or tagged as "Unassigned" are often not real workers
            if (uid && name && name !== 'Unassigned' && uid !== '0') {
                resources.push({
                    id: uid,
                    name: name,
                    allocation: 1.0,
                    daysOff: []
                });
            }
        }
        console.log(`[PlanImport] Identified ${resources.length} resources in XML.`);

        const activities: PlanActivity[] = [];
        const taskNodes = xmlDoc.getElementsByTagName('Task');

        console.log(`[PlanImport] Found ${taskNodes.length} task nodes in XML.`);

        // Map of Task UID to Resource UID (from Assignments)
        const assignmentMap = new Map<string, string>();
        const assignmentNodes = xmlDoc.getElementsByTagName('Assignment');
        for (let i = 0; i < assignmentNodes.length; i++) {
            const node = assignmentNodes[i];
            const taskUid = this.getTagValue(node, 'TaskUID');
            const resourceUid = this.getTagValue(node, 'ResourceUID');
            if (taskUid && resourceUid && resourceUid !== '-1') {
                assignmentMap.set(taskUid, resourceUid);
            }
        }

        for (let i = 0; i < taskNodes.length; i++) {
            const node = taskNodes[i];
            const uid = this.getTagValue(node, 'UID');
            const name = this.getTagValue(node, 'Name');
            const isSummary = this.getTagValue(node, 'Summary') === '1';
            const isActive = this.getTagValue(node, 'Active') !== '0'; // Default to active
            const isNull = this.getTagValue(node, 'IsNull') === '1';
            const durationStr = this.getTagValue(node, 'Duration');
            const start = this.getTagValue(node, 'Start');
            const finish = this.getTagValue(node, 'Finish');
            const actualFinish = this.getTagValue(node, 'ActualFinish');

            // Skip project summary (UID 0), summaries (parents), and deleted/null/inactive tasks
            if (!uid || !name || uid === '0' || isSummary || isNull || !isActive) {
                if (name || uid) {
                    console.log(`[PlanImport] Skipping Task: ${name} (UID: ${uid}, Summary: ${isSummary}, Null: ${isNull}, Active: ${isActive})`);
                }
                continue;
            }

            const durationDays = this.parseDurationToDays(durationStr || 'PT0H0M0S');

            // Predecessors
            const dependsOn: string[] = [];
            const predecessorNodes = node.getElementsByTagName('PredecessorLink');
            for (let j = 0; j < predecessorNodes.length; j++) {
                const preId = this.getTagValue(predecessorNodes[j], 'PredecessorUID');
                if (preId && preId !== '0') {
                    dependsOn.push(preId);
                }
            }

            const resourceId = assignmentMap.get(uid) || '';
            const resource = resources.find(r => r.id === resourceId);

            activities.push({
                id: uid,
                name: name,
                resourceId: resourceId,
                resourceName: resource ? resource.name : '',
                durationDays: durationDays,
                startDate: start ? start.split('T')[0] : '',
                endDate: finish ? finish.split('T')[0] : '',
                dependsOn: dependsOn,
                actualFinishDate: actualFinish ? actualFinish.split('T')[0] : undefined,
                value: durationDays * 10,
                priority: 50,
                float: 0,
                criticalPath: false
            });
        }

        console.log(`[PlanImport] Successfully imported ${activities.length} activities.`);
        return {
            startDate: startDate,
            resources: resources,
            activities: activities,
            earnedValue: []
        };
    }

    parseMpxjJson(jsonContent: string): PlanData {
        const data = JSON.parse(jsonContent);
        const project = data.project || data;

        const startDateStr = project.startDate || project.start_date;
        const startDate = startDateStr ? startDateStr.split('T')[0] : new Date().toISOString().split('T')[0];

        const resources: PlanResource[] = [];
        const resourceList = project.resources || [];
        resourceList.forEach((r: any) => {
            const uid = r.unique_id || r.id;
            const name = r.name;

            if (uid !== undefined && name && name !== 'Unassigned' && String(uid) !== '0') {
                resources.push({
                    id: String(uid),
                    name: name,
                    allocation: 1.0,
                    daysOff: []
                });
            }
        });
        console.log(`[PlanImport] Identified ${resources.length} resources in JSON.`);

        const activities: PlanActivity[] = [];
        const taskList = project.tasks || [];

        console.log(`[PlanImport] Found ${taskList.length} tasks in JSON.`);

        // Map of Task UID to Resource UID (from Assignments)
        const assignmentMap = new Map<string, string>();
        const assignmentList = project.assignments || [];
        assignmentList.forEach((a: any) => {
            const taskId = a.task_unique_id || a.task_id || a.taskId;
            const resourceId = a.resource_unique_id || a.resource_id || a.resourceId;
            if (taskId !== undefined && resourceId !== undefined && String(resourceId) !== '-1') {
                assignmentMap.set(String(taskId), String(resourceId));
            }
        });

        taskList.forEach((t: any) => {
            const uid = t.unique_id || t.id;
            const name = t.name;
            const isSummary = t.summary === true || t.summary === 1;
            const isActive = t.active !== false && t.active !== 0; // Default to active
            const isNull = t.isNull === true;

            // Note: MPXJ JSON usually provides duration in various ways.
            // Let's assume t.duration has a value in hours or days, or just use the difference between start/finish.
            let durationDays = 0;
            if (t.duration) {
                if (typeof t.duration === 'object') {
                    // MPXJ often uses { "duration": { "value": 40.0, "units": "Hours" } }
                    const val = t.duration.value || 0;
                    const units = String(t.duration.units || 'Hours').toLowerCase();
                    if (units === 'days') durationDays = val;
                    else if (units === 'hours') durationDays = val / 8;
                    else durationDays = val; // Fallback
                } else if (typeof t.duration === 'number') {
                    durationDays = t.duration / 8 / 60 / 60; // Usually seconds or something?
                }
            }

            if (uid !== undefined && name && !isSummary && uid !== 0 && !isNull && isActive) {
                const dependsOn: string[] = [];
                const predecessors = t.predecessors || t.predecessor_links || [];
                predecessors.forEach((p: any) => {
                    const preId = p.unique_id || p.target_unique_id || p.id || p.taskId;
                    if (preId !== undefined && String(preId) !== '0') {
                        dependsOn.push(String(preId));
                    }
                });

                const resourceId = assignmentMap.get(String(uid)) || '';
                const resource = resources.find(r => r.id === resourceId);

                activities.push({
                    id: String(uid),
                    name: name,
                    resourceId: resourceId,
                    resourceName: resource ? resource.name : '',
                    durationDays: Math.round(durationDays * 100) / 100,
                    startDate: t.start ? t.start.split('T')[0] : '',
                    endDate: t.finish ? t.finish.split('T')[0] : '',
                    dependsOn: dependsOn,
                    actualFinishDate: t.actual_finish ? t.actual_finish.split('T')[0] : undefined,
                    value: durationDays * 10,
                    priority: 50,
                    float: 0,
                    criticalPath: false
                });
            } else if (uid !== 0 && name) {
                console.log(`[PlanImport] Skipping JSON Task: ${name} (UID: ${uid}, Summary: ${isSummary}, Active: ${isActive})`);
            }
        });

        console.log(`[PlanImport] Successfully imported ${activities.length} activities from JSON.`);
        return {
            startDate: startDate,
            resources: resources,
            activities: activities,
            earnedValue: []
        };
    }

    private getTagValue(node: Element, tagName: string): string | null {
        const tags = node.getElementsByTagName(tagName);
        if (tags && tags.length > 0) {
            // In MSPDI, some tags like PredecessorLink might have sub-tags.
            // We usually want the direct child text.
            for (let i = 0; i < tags.length; i++) {
                const tag = tags[i];
                if (tag.parentNode === node) {
                    return tag.textContent;
                }
            }
            // Fallback to first if not direct child (sometimes tags are nested)
            return tags[0].textContent;
        }
        return null;
    }

    private parseDurationToDays(duration: string): number {
        // Format is PT[H]H[M]M[S]S or similar (ISO 8601 duration)
        // Actually MS Project uses PT8H0M0S or PT40H0M0S
        // We want days (assuming 8h workday)
        const hoursMatch = duration.match(/PT(\d+)H/);
        const minutesMatch = duration.match(/(\d+)M/);

        let totalHours = 0;
        if (hoursMatch) totalHours += parseInt(hoursMatch[1]);
        if (minutesMatch) totalHours += parseInt(minutesMatch[1]) / 60;

        return Math.round((totalHours / 8) * 100) / 100;
    }
}
