import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../chat/chat.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';

interface PlanResource {
    id: string;
    name: string;
    allocation: number;
    daysOff: string[];
}

interface PlanActivity {
    id: string;
    name: string;
    resourceId: string;
    resourceName: string;
    durationDays: number;
    startDate: string;
    endDate: string;
}

interface EarnedValueEntry {
    date: string;
    projectedPercent: number;
    projectedEarned: number;
    actualPercent: number;
    actualEarned: number;
    activitiesFinished: string[];
    activitiesWorked: string[];
    resources: string[];
}

interface PlanData {
    resources: PlanResource[];
    activities: PlanActivity[];
    earnedValue: EarnedValueEntry[];
}

@Component({
    selector: 'app-plan-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, ChatComponent],
    template: `
    <div class="builder-container">
      <header class="builder-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <h1>Plan Editor</h1>
        </div>
        <div class="path-input-group">
          <label for="path">File Path:</label>
          <input
            id="path"
            type="text"
            [(ngModel)]="filePath"
            placeholder="plans/plan.json"
          />
        </div>
        <div class="header-actions">
           <button class="save-btn" (click)="saveFile()" [disabled]="!isDirty">
             Save
           </button>
        </div>
      </header>

      <div class="builder-body">
        <div class="agent-side">
          <app-chat
            [workspaceId]="'plan-' + workspaceId"
            [folderPath]="workspace?.folderPath || ''"
            [contextProvider]="getPlanContext">
          </app-chat>
        </div>

        <div class="editor-side">
          <div class="side-tabs">
            <button [class.active]="activeTab === 'activities'" (click)="activeTab = 'activities'">Activities</button>
            <button [class.active]="activeTab === 'gantt'" (click)="activeTab = 'gantt'">Gantt</button>
            <button [class.active]="activeTab === 'ev'" (click)="activeTab = 'ev'">Earned Value</button>
          </div>

          <div class="tab-content">
            @if (activeTab === 'activities') {
              <div class="activities-container">
                <div class="toolbar">
                  <button class="toolbar-btn" (click)="addActivity()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14"/>
                      <path d="M5 12h14"/>
                    </svg>
                    Add Activity
                  </button>
                  <button class="toolbar-btn" (click)="addResource()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                    Add Resource
                  </button>
                </div>

                @if (plan.resources.length > 0) {
                  <div class="section-label">Resources</div>
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th style="width:100px">Allocation</th>
                          <th style="width:60px"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (res of plan.resources; track res.id) {
                          <tr>
                            <td><input class="cell-input" [(ngModel)]="res.name" (ngModelChange)="markDirty()" /></td>
                            <td><input class="cell-input" type="number" [(ngModel)]="res.allocation" (ngModelChange)="markDirty()" min="0" max="1" step="0.1" /></td>
                            <td>
                              <button class="remove-btn" (click)="removeResource(res.id)" title="Remove">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }

                <div class="section-label">Activities</div>
                @if (plan.activities.length > 0) {
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Resource</th>
                          <th style="width:90px">Duration</th>
                          <th style="width:130px">Start Date</th>
                          <th style="width:130px">End Date</th>
                          <th style="width:60px"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (act of plan.activities; track act.id) {
                          <tr>
                            <td><input class="cell-input" [(ngModel)]="act.name" (ngModelChange)="markDirty()" /></td>
                            <td>
                              <select class="cell-input" [(ngModel)]="act.resourceId" (ngModelChange)="onResourceSelect(act)">
                                <option value="">-- None --</option>
                                @for (res of plan.resources; track res.id) {
                                  <option [value]="res.id">{{ res.name }}</option>
                                }
                              </select>
                            </td>
                            <td><input class="cell-input" type="number" [(ngModel)]="act.durationDays" (ngModelChange)="markDirty()" min="0" /></td>
                            <td><input class="cell-input" type="date" [(ngModel)]="act.startDate" (ngModelChange)="markDirty()" /></td>
                            <td><input class="cell-input" type="date" [(ngModel)]="act.endDate" (ngModelChange)="markDirty()" /></td>
                            <td>
                              <button class="remove-btn" (click)="removeActivity(act.id)" title="Remove">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">No activities yet. Click "Add Activity" or ask the AI to generate a plan.</div>
                }
              </div>
            }

            @if (activeTab === 'gantt') {
              <div class="gantt-container">
                @if (plan.activities.length > 0) {
                  <div class="gantt-header-row">
                    <div class="gantt-label-col">Activity</div>
                    <div class="gantt-bar-col">
                      <div class="gantt-date-labels">
                        <span>{{ ganttMinDate }}</span>
                        <span>{{ ganttMaxDate }}</span>
                      </div>
                    </div>
                  </div>
                  @for (act of plan.activities; track act.id) {
                    <div class="gantt-row">
                      <div class="gantt-label-col">{{ act.name }}</div>
                      <div class="gantt-bar-col">
                        <div class="gantt-bar"
                          [style.left.%]="getBarLeft(act)"
                          [style.width.%]="getBarWidth(act)"
                          [title]="act.startDate + ' → ' + act.endDate">
                          <span class="gantt-bar-text">{{ act.durationDays }}d</span>
                        </div>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="empty-state">No activities to display. Add activities in the Activities tab.</div>
                }
              </div>
            }

            @if (activeTab === 'ev') {
              <div class="ev-container">
                @if (plan.earnedValue.length > 0) {
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Proj %</th>
                          <th>Proj Earned</th>
                          <th>Actual %</th>
                          <th>Actual Earned</th>
                          <th>Finished</th>
                          <th>Worked</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (ev of plan.earnedValue; track ev.date) {
                          <tr>
                            <td>{{ ev.date }}</td>
                            <td>{{ ev.projectedPercent }}%</td>
                            <td>{{ ev.projectedEarned }}</td>
                            <td>{{ ev.actualPercent }}%</td>
                            <td>{{ ev.actualEarned }}</td>
                            <td>{{ ev.activitiesFinished.length }}</td>
                            <td>{{ ev.activitiesWorked.length }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">No earned value data yet. Ask the AI to generate earned value tracking.</div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .builder-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--app-background);
      color: var(--app-text);
    }

    .builder-header {
      height: 56px;
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 30px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      -webkit-app-region: drag;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--theme-primary);
    }

    .header-left h1 {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
    }

    .path-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 600px;
      -webkit-app-region: no-drag;
    }

    .path-input-group label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }

    .path-input-group input {
      flex: 1;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      color: var(--app-text);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'SF Mono', monospace;
      outline: none;
    }

    .path-input-group input:focus {
      border-color: var(--theme-primary);
    }

    .header-actions {
      -webkit-app-region: no-drag;
    }

    .save-btn {
      background: var(--theme-primary);
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .builder-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .agent-side {
      width: 400px;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
    }

    .editor-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .side-tabs {
      display: flex;
      padding: 0 16px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      gap: 4px;
    }

    .side-tabs button {
      padding: 10px 16px;
      background: transparent;
      border: none;
      color: var(--app-text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .side-tabs button:hover {
      color: var(--app-text);
    }

    .side-tabs button.active {
      color: var(--theme-primary);
      border-bottom-color: var(--theme-primary);
    }

    .tab-content {
      flex: 1;
      overflow: hidden;
      display: flex;
    }

    /* Activities tab */
    .activities-container {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .toolbar {
      display: flex;
      gap: 8px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: var(--app-surface);
      color: var(--app-text);
      border: 1px solid var(--app-border);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toolbar-btn:hover {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }

    .section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .data-table th {
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
      border-bottom: 1px solid var(--app-border);
      white-space: nowrap;
    }

    .data-table td {
      padding: 4px 6px;
      border-bottom: 1px solid var(--app-border);
      vertical-align: middle;
    }

    .cell-input {
      width: 100%;
      background: var(--app-background);
      color: var(--app-text);
      border: 1px solid transparent;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }
    .cell-input:hover {
      border-color: var(--app-border);
    }
    .cell-input:focus {
      border-color: var(--theme-primary);
      background: var(--app-surface);
    }

    select.cell-input {
      cursor: pointer;
    }

    .remove-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--app-text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .remove-btn:hover {
      color: #ef4444;
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--app-text-muted);
      font-size: 14px;
      text-align: center;
      padding: 40px;
    }

    /* Gantt tab */
    .gantt-container {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .gantt-header-row {
      display: flex;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--app-border);
      margin-bottom: 4px;
    }

    .gantt-label-col {
      width: 160px;
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--app-text);
      padding: 6px 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gantt-header-row .gantt-label-col {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }

    .gantt-bar-col {
      flex: 1;
      position: relative;
      height: 28px;
      background: var(--app-surface);
      border-radius: 4px;
    }

    .gantt-header-row .gantt-bar-col {
      background: transparent;
      height: auto;
    }

    .gantt-date-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--app-text-muted);
      padding: 0 4px;
    }

    .gantt-row {
      display: flex;
      align-items: center;
    }

    .gantt-bar {
      position: absolute;
      top: 4px;
      height: 20px;
      background: var(--theme-primary);
      border-radius: 4px;
      min-width: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: left 0.2s, width 0.2s;
    }

    .gantt-bar-text {
      font-size: 10px;
      font-weight: 700;
      color: white;
      white-space: nowrap;
      overflow: hidden;
    }

    /* Earned Value tab */
    .ev-container {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }
  `]
})
export class PlanEditorComponent implements OnInit, OnDestroy {
    workspaceId: string = '';
    filePath: string = 'plans/plan.json';
    workspace: Workspace | null = null;
    plan: PlanData = { resources: [], activities: [], earnedValue: [] };
    isDirty = false;
    activeTab: 'activities' | 'gantt' | 'ev' = 'activities';
    ganttMinDate = '';
    ganttMaxDate = '';
    private ganttRangeMs = 1;
    private ganttStartMs = 0;
    private chatSub?: Subscription;

    getPlanContext = (): string => {
        const json = JSON.stringify(this.plan, null, 2);
        return `You are a project planning assistant. Here is the current plan:\n\`\`\`json\n${json}\n\`\`\`\n\nIMPORTANT: Do NOT include explanatory text in your response. Output ONLY the full updated plan JSON inside a single \`\`\`json code block with no other text. The JSON must have "resources", "activities", and "earnedValue" arrays. Each resource has: id, name, allocation, daysOff[]. Each activity has: id, name, resourceId, resourceName, durationDays, startDate, endDate. Each earnedValue entry has: date, projectedPercent, projectedEarned, actualPercent, actualEarned, activitiesFinished[], activitiesWorked[], resources[].`;
    };

    private get electron() { return (window as any).electronAPI; }

    constructor(
        private route: ActivatedRoute,
        private workspaceService: WorkspaceService,
        private chatService: ChatService
    ) { }

    async ngOnInit() {
        this.route.queryParams.subscribe(async params => {
            this.workspaceId = params['workspaceId'] || '';
            this.filePath = params['filePath'] || 'plans/plan.json';

            await this.workspaceService.loadWorkspaces();
            this.workspace = this.workspaceService.getWorkspace(this.workspaceId) || null;

            if (this.workspace) {
                await this.loadFile();
            }
        });

        this.chatSub = this.chatService.messages$.subscribe(allMessages => {
            const myMessages = allMessages['plan-' + this.workspaceId] || [];
            if (myMessages.length === 0) return;

            const lastMessage = myMessages[myMessages.length - 1];
            if (lastMessage.role === 'assistant') {
                const match = lastMessage.content.match(/```json\s*([\s\S]*?)```/);
                if (match) {
                    try {
                        const parsed = JSON.parse(match[1].trim());
                        if (parsed.activities || parsed.resources || parsed.earnedValue) {
                            this.plan = {
                                resources: parsed.resources || [],
                                activities: parsed.activities || [],
                                earnedValue: parsed.earnedValue || [],
                            };
                            this.isDirty = true;
                            this.computeGanttRange();
                        }
                    } catch {
                        // invalid JSON, ignore
                    }
                }
            }
        });
    }

    ngOnDestroy() {
        this.chatSub?.unsubscribe();
    }

    async loadFile() {
        if (!this.workspace) return;
        const fullPath = this.getFullPath();
        const result = await this.electron.readFile(fullPath);
        if (result !== null) {
            try {
                const parsed = JSON.parse(result);
                this.plan = {
                    resources: parsed.resources || [],
                    activities: parsed.activities || [],
                    earnedValue: parsed.earnedValue || [],
                };
                this.isDirty = false;
                this.computeGanttRange();
            } catch {
                // invalid JSON file
            }
        }
    }

    async saveFile() {
        if (!this.workspace) return;
        const fullPath = this.getFullPath();
        const json = JSON.stringify(this.plan, null, 2);
        const success = await this.electron.writeFile(fullPath, json);
        if (success) {
            this.isDirty = false;
        }
    }

    markDirty() {
        this.isDirty = true;
        this.computeGanttRange();
    }

    addActivity() {
        const id = 'act-' + Math.random().toString(36).substring(2, 9);
        this.plan.activities.push({
            id,
            name: '',
            resourceId: '',
            resourceName: '',
            durationDays: 1,
            startDate: '',
            endDate: '',
        });
        this.isDirty = true;
    }

    removeActivity(id: string) {
        this.plan.activities = this.plan.activities.filter(a => a.id !== id);
        this.isDirty = true;
        this.computeGanttRange();
    }

    addResource() {
        const id = 'res-' + Math.random().toString(36).substring(2, 9);
        this.plan.resources.push({
            id,
            name: '',
            allocation: 1,
            daysOff: [],
        });
        this.isDirty = true;
    }

    removeResource(id: string) {
        this.plan.resources = this.plan.resources.filter(r => r.id !== id);
        this.isDirty = true;
    }

    onResourceSelect(act: PlanActivity) {
        const res = this.plan.resources.find(r => r.id === act.resourceId);
        act.resourceName = res?.name || '';
        this.isDirty = true;
    }

    computeGanttRange() {
        const dates: number[] = [];
        for (const act of this.plan.activities) {
            if (act.startDate) dates.push(new Date(act.startDate).getTime());
            if (act.endDate) dates.push(new Date(act.endDate).getTime());
        }
        if (dates.length === 0) {
            this.ganttMinDate = '';
            this.ganttMaxDate = '';
            this.ganttRangeMs = 1;
            this.ganttStartMs = 0;
            return;
        }
        const min = Math.min(...dates);
        const max = Math.max(...dates);
        this.ganttStartMs = min;
        this.ganttRangeMs = Math.max(max - min, 1);
        this.ganttMinDate = new Date(min).toLocaleDateString();
        this.ganttMaxDate = new Date(max).toLocaleDateString();
    }

    getBarLeft(act: PlanActivity): number {
        if (!act.startDate || this.ganttRangeMs <= 1) return 0;
        const start = new Date(act.startDate).getTime();
        return ((start - this.ganttStartMs) / this.ganttRangeMs) * 100;
    }

    getBarWidth(act: PlanActivity): number {
        if (!act.startDate || !act.endDate || this.ganttRangeMs <= 1) return 2;
        const start = new Date(act.startDate).getTime();
        const end = new Date(act.endDate).getTime();
        const w = ((end - start) / this.ganttRangeMs) * 100;
        return Math.max(w, 1);
    }

    private getFullPath() {
        if (!this.workspace) return '';
        const sep = this.workspace.folderPath.includes('\\') ? '\\' : '/';
        return `${this.workspace.folderPath}${sep}${this.filePath}`;
    }
}
