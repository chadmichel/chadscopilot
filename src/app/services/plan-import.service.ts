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
            const type = this.getTagValue(node, 'Type'); // 1 = Work, 0 = Material

            if (uid && name && name !== 'Unassigned' && type === '1') {
                resources.push({
                    id: uid,
                    name: name,
                    allocation: 1.0, // Default 100%
                    daysOff: []
                });
            }
        }

        const activities: PlanActivity[] = [];
        const taskNodes = xmlDoc.getElementsByTagName('Task');

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
            const durationStr = this.getTagValue(node, 'Duration'); // Format PT8H0M0S
            const start = this.getTagValue(node, 'Start');
            const finish = this.getTagValue(node, 'Finish');
            const milestone = this.getTagValue(node, 'Milestone') === '1';
            const actualFinish = this.getTagValue(node, 'ActualFinish');

            if (uid && name && !isSummary && uid !== '0') {
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
                    value: durationDays * 10, // Just a heuristic
                    priority: 50,
                    float: 0,
                    criticalPath: false
                });
            }
        }

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
