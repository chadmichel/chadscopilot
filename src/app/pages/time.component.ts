import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../services/workspace.service';

interface TimeLog {
  id: string;
  appName: string;
  windowTitle: string;
  folderPath: string;
  workspaceId: string;
  timestamp: string;
  notes: string;
  isEditingNotes?: boolean;
}

interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location: string;
}

interface WorkspaceTime {
  workspaceId: string;
  workspaceName: string;
  minutes: number;
  percentage: number;
}

@Component({
  selector: 'app-time',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <span class="active-date">{{ getFormattedDate() }}</span>
        </div>
        <div class="date-controls">
          <button class="icon-btn" (click)="changeDate(-1)" title="Previous Day">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <input type="date" [ngModel]="selectedDate" (ngModelChange)="onDateSelect($event)" class="date-picker">
          <button class="icon-btn" (click)="changeDate(1)" title="Next Day">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button class="text-btn" (click)="resetToToday()" *ngIf="!isToday()">Today</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-header">
            <h3>Workspaces Breakdown <small>{{ isToday() ? '(Today)' : '' }}</small></h3>
          </div>
          <div class="workspace-list">
            <div *ngFor="let ws of workspaceBreakdown" class="workspace-item">
              <div class="ws-info">
                <span class="ws-name">{{ ws.workspaceName || 'Other Activity' }}</span>
                <span class="ws-time">{{ formatMinutes(ws.minutes) }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="ws.percentage"></div>
              </div>
            </div>
            <div *ngIf="workspaceBreakdown.length > 0" class="total-bar">
              <span>Total Tracked</span>
              <span class="total-value">{{ workspaceBreakdown.length > 0 ? getTotalTime() : '0m' }}</span>
            </div>
            <div *ngIf="workspaceBreakdown.length === 0" class="empty-state-text">No activity logged for this day</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <h3>Upcoming / Recent Meetings</h3>
          </div>
          <div class="meeting-list">
            <div *ngFor="let event of todayEvents" class="meeting-item">
              <div class="meeting-time">{{ formatTime(event.start) }} - {{ formatTime(event.end) }}</div>
              <div class="meeting-subject">{{ event.subject }}</div>
              <div class="meeting-location" *ngIf="event.location">📍 {{ event.location }}</div>
            </div>
            <div *ngIf="todayEvents.length === 0" class="empty-state-text">No meetings today</div>
          </div>
        </div>
      </div>

      <div class="history-section">
        <div class="section-title">
          <h3>Activity History</h3>
        </div>
        <div class="history-list">
          <!-- Evening Logs -->
          <div class="log-region" *ngIf="lateLogs.length > 0">
            <button class="region-toggle" (click)="showLateLogs = !showLateLogs">
               <span>{{ showLateLogs ? 'Hide' : 'Show' }} Evening Activity ({{ formatMinutes(lateLogs.length * 5) }})</span>
               <svg class="chevron" [class.open]="showLateLogs" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div *ngIf="showLateLogs">
              <div *ngFor="let log of lateLogs" class="history-item-container">
                <ng-container *ngTemplateOutlet="logItem; context: {log: log}"></ng-container>
              </div>
            </div>
          </div>

          <!-- Work Day Logs -->
          <div *ngFor="let log of workLogs" class="history-item-container">
            <ng-container *ngTemplateOutlet="logItem; context: {log: log}"></ng-container>
          </div>

          <!-- Early Morning Logs -->
          <div class="log-region" *ngIf="earlyLogs.length > 0">
            <button class="region-toggle" (click)="showEarlyLogs = !showEarlyLogs">
               <span>{{ showEarlyLogs ? 'Hide' : 'Show' }} Early Morning Activity ({{ formatMinutes(earlyLogs.length * 5) }})</span>
               <svg class="chevron" [class.open]="showEarlyLogs" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div *ngIf="showEarlyLogs">
              <div *ngFor="let log of earlyLogs" class="history-item-container">
                <ng-container *ngTemplateOutlet="logItem; context: {log: log}"></ng-container>
              </div>
            </div>
          </div>

          <div *ngIf="timeLogs.length === 0" class="empty-history">No detailed logs available for today</div>
        </div>

        <ng-template #logItem let-log="log">
          <div class="history-item" [class.has-notes]="log.notes">
            <div class="log-time">{{ formatTimeDay(log.timestamp) }}</div>
            <div class="log-details">
              <div class="app-info">
                <span class="app-name">
                  {{ log.workspaceId ? getWorkspaceName(log.workspaceId) : log.appName }}
                </span>
                <span class="window-title" *ngIf="log.windowTitle">{{ log.windowTitle }}</span>
              </div>
              <div class="dir-info" *ngIf="log.folderPath">📁 {{ log.folderPath }}</div>
              <div class="log-notes-preview" *ngIf="log.notes && !log.isEditingNotes">
                📝 {{ log.notes }}
              </div>
            </div>
            <div class="history-actions">
              <select 
                [ngModel]="log.workspaceId || ''" 
                (ngModelChange)="onWorkspaceChange(log, $event)"
                class="workspace-select"
                [class.unassigned]="!log.workspaceId"
              >
                <option value="">(Other Activity)</option>
                <option *ngFor="let ws of workspaces" [value]="ws.id">
                  {{ ws.name }}
                </option>
              </select>
              <button class="icon-btn" (click)="log.isEditingNotes = !log.isEditingNotes" title="Add note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <div class="copy-btns">
                <button class="icon-btn tiny" (click)="copySettings(log, 'up')" title="Copy to later entry">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button class="icon-btn tiny" (click)="copySettings(log, 'down')" title="Copy to earlier entry">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            </div>
          </div>
          
          <div class="note-editor" *ngIf="log.isEditingNotes">
            <input 
              type="text" 
              [(ngModel)]="log.notes" 
              placeholder="Add a note..." 
              (keyup.enter)="saveNote(log)"
              (blur)="saveNote(log)"
              #noteInput
              [autofocus]="true"
            >
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
    .page {
      padding: 24px 28px;
      color: var(--app-text);
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      background: transparent;
      scrollbar-width: thin;
      scrollbar-color: var(--app-border) transparent;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      flex-shrink: 0;
    }
    .stat-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .stat-card-header h3 {
      margin: 0 0 16px 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--app-text);
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--app-border);
      margin-bottom: 4px;
    }
    .section-title {
      margin-bottom: 16px;
    }
    .section-title h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--app-text);
    }
    .header-left {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .active-date {
      font-size: 18px;
      color: var(--app-text);
      font-weight: 700;
    }
    .date-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .date-picker {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      color: var(--app-text);
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 13px;
      outline: none;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .date-picker:hover {
      border-color: var(--theme-primary);
    }
    .text-btn {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      color: var(--app-text);
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .text-btn:hover {
      background: var(--app-border);
      border-color: var(--theme-primary);
    }
    .workspace-list {
      flex: 1;
    }
    .workspace-item {
      margin-bottom: 16px;
    }
    .ws-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .ws-name { color: var(--app-text); font-weight: 500; }
    .ws-time { color: var(--app-text-muted); }
    .progress-bar {
      height: 6px;
      background: color-mix(in srgb, var(--app-text-muted), transparent 90%);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--theme-primary);
      border-radius: 3px;
    }
    .total-bar {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px dashed var(--app-border);
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      color: var(--app-text);
    }
    .total-value {
      color: var(--theme-primary);
    }
    .meeting-item {
      padding: 10px 0;
      border-bottom: 1px solid var(--app-border);
    }
    .meeting-item:last-child {
      border-bottom: none;
    }
    .meeting-time {
      font-size: 12px;
      font-weight: 600;
      color: var(--theme-primary);
      margin-bottom: 2px;
    }
    .meeting-subject {
      font-weight: 500;
      color: var(--app-text);
      font-size: 13px;
    }
    .meeting-location {
      font-size: 11px;
      color: var(--app-text-muted);
      margin-top: 2px;
    }
    .empty-state-text {
      color: var(--app-text-muted);
      font-style: italic;
      padding: 10px 0;
      font-size: 13px;
    }
    .history-section {
       display: flex;
       flex-direction: column;
       flex: 1;
       min-height: 400px;
    }
    .history-list {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
    }
    .history-item-container {
      border-bottom: 1px solid var(--app-border);
    }
    .history-item-container:last-child {
      border-bottom: none;
    }
    .history-item {
      display: flex;
      padding: 14px 20px;
      align-items: center;
    }
    .history-item.has-notes {
      padding-bottom: 8px;
    }
    .log-time {
      min-width: 80px;
      color: var(--app-text-muted);
      font-size: 12px;
      font-weight: 600;
    }
    .log-details {
      flex: 1;
      margin-left: 20px;
      min-width: 0;
    }
    .app-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 2px;
    }
    .app-name {
      font-weight: 600;
      color: var(--app-text);
      font-size: 13px;
    }
    .window-title {
      color: var(--app-text-muted);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dir-info {
      font-size: 11px;
      color: var(--app-text-muted);
      font-family: 'SF Mono', monospace;
      opacity: 0.8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .log-notes-preview {
      font-size: 12px;
      color: var(--theme-primary);
      margin-top: 4px;
      font-style: italic;
    }
    .history-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .workspace-select {
        background: color-mix(in srgb, var(--theme-primary), transparent 85%);
        color: var(--theme-primary);
        border: 1px solid color-mix(in srgb, var(--theme-primary), transparent 70%);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 600;
        outline: none;
        cursor: pointer;
        max-width: 150px;
        transition: all 0.2s;
    }
    .workspace-select:hover {
        background: color-mix(in srgb, var(--theme-primary), transparent 75%);
    }
    .workspace-select.unassigned {
        background: color-mix(in srgb, var(--app-text-muted), transparent 90%);
        color: var(--app-text-muted);
        border: 1px solid color-mix(in srgb, var(--app-text-muted), transparent 80%);
    }
    .icon-btn {
      background: transparent;
      border: none;
      color: var(--app-text-muted);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .icon-btn:hover {
      background: var(--app-border);
      color: var(--app-text);
    }
    .icon-btn.tiny {
      padding: 2px;
    }
    .copy-btns {
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-left: 1px solid var(--app-border);
      padding-left: 8px;
    }
    .note-editor {
      padding: 0 20px 14px 120px;
    }
    .note-editor input {
      width: 100%;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      border-radius: 4px;
      padding: 6px 10px;
      color: var(--app-text);
      font-size: 12px;
      outline: none;
    }
    .note-editor input:focus {
      border-color: var(--theme-primary);
    }
    .empty-history {
      padding: 30px;
      text-align: center;
      color: var(--app-text-muted);
      font-style: italic;
      font-size: 13px;
    }
    .log-region {
      border-bottom: 1px solid var(--app-border);
    }
    .log-region:last-child {
      border-bottom: none;
    }
    .region-toggle {
      width: 100%;
      padding: 12px 20px;
      background: var(--app-surface);
      border: none;
      color: var(--theme-primary);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s;
    }
    .region-toggle:hover {
      background: color-mix(in srgb, var(--theme-primary), transparent 95%);
    }
    .chevron {
      transition: transform 0.2s;
      color: var(--app-text-muted);
    }
    .chevron.open {
      transform: rotate(180deg);
      color: var(--theme-primary);
    }
  `]
})
export class TimeComponent implements OnInit {
  timeLogs: TimeLog[] = [];
  earlyLogs: TimeLog[] = [];
  workLogs: TimeLog[] = [];
  lateLogs: TimeLog[] = [];
  showEarlyLogs = false;
  showLateLogs = false;
  todayEvents: CalendarEvent[] = [];
  workspaceBreakdown: WorkspaceTime[] = [];
  workspaces: any[] = [];
  selectedDate: string = new Date().toISOString().split('T')[0];

  getTotalTime() {
    const totalMinutes = this.workspaceBreakdown.reduce((sum, ws) => sum + ws.minutes, 0);
    return this.formatMinutes(totalMinutes);
  }

  constructor(private workspaceService: WorkspaceService) { }

  async ngOnInit() {
    this.workspaces = await this.workspaceService.getWorkspaces();
    await this.loadData();
  }

  async loadData() {
    const electron = (window as any).electronAPI;
    const dateStr = this.selectedDate;

    // Get logs
    this.timeLogs = await electron.timeGetLogs(dateStr);

    // Get meetings
    const events = await electron.calendarGetEvents('');

    this.todayEvents = events
      .filter((e: any) => e.start.startsWith(dateStr))
      .sort((a: any, b: any) => a.start.localeCompare(b.start));

    this.splitLogs();
    this.calculateBreakdown();
  }

  splitLogs() {
    this.earlyLogs = this.timeLogs.filter(log => this.getLogHour(log.timestamp) < 8);
    this.workLogs = this.timeLogs.filter(log => {
      const h = this.getLogHour(log.timestamp);
      return h >= 8 && h < 17;
    });
    this.lateLogs = this.timeLogs.filter(log => this.getLogHour(log.timestamp) >= 17);
  }

  getLogHour(timestamp: string): number {
    const d = new Date(timestamp.replace(' ', 'T') + 'Z');
    return d.getHours();
  }

  changeDate(days: number) {
    const d = new Date(this.selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    this.selectedDate = d.toISOString().split('T')[0];
    this.loadData();
  }

  onDateSelect(newDate: string) {
    this.selectedDate = newDate;
    this.loadData();
  }

  resetToToday() {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.loadData();
  }

  isToday() {
    return this.selectedDate === new Date().toISOString().split('T')[0];
  }

  getFormattedDate() {
    const d = new Date(this.selectedDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  calculateBreakdown() {
    const totalSlots = this.timeLogs.length;
    if (totalSlots === 0) {
      this.workspaceBreakdown = [];
      return;
    }

    const counts: Record<string, number> = {};
    this.timeLogs.forEach(log => {
      const key = log.workspaceId || 'generic';
      counts[key] = (counts[key] || 0) + 1;
    });

    // 5 minutes per log (as per requirements)
    this.workspaceBreakdown = Object.entries(counts).map(([id, count]) => {
      const ws = this.workspaces.find(w => w.id === id);
      return {
        workspaceId: id,
        workspaceName: ws ? ws.name : (id === 'generic' ? 'Other Activity' : 'Unknown'),
        minutes: count * 5,
        percentage: (count / totalSlots) * 100
      };
    }).sort((a, b) => b.minutes - a.minutes);
  }

  getWorkspaceName(id: string) {
    const ws = this.workspaces.find(w => w.id === id);
    return ws ? ws.name : 'Unknown';
  }

  formatMinutes(m: number) {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  }

  formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatTimeDay(iso: string) {
    // timestamp from SQLite is YYYY-MM-DD HH:MM:SS
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async onWorkspaceChange(log: TimeLog, newWorkspaceId: string) {
    const electron = (window as any).electronAPI;
    try {
      await electron.timeUpdateLog(log.id, newWorkspaceId);
      log.workspaceId = newWorkspaceId;
      this.calculateBreakdown();
    } catch (err) {
      console.error('Failed to update log workspace:', err);
    }
  }

  async saveNote(log: TimeLog) {
    log.isEditingNotes = false;
    const electron = (window as any).electronAPI;
    try {
      await electron.timeUpdateNotes(log.id, log.notes);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  }

  async copySettings(log: TimeLog, direction: 'up' | 'down') {
    const electron = (window as any).electronAPI;
    const index = this.timeLogs.indexOf(log);
    let targetIndex = direction === 'up' ? index - 1 : index + 1;

    // "Keep pushing" logic: Skip entries that are already identical to the source
    while (targetIndex >= 0 && targetIndex < this.timeLogs.length) {
      const targetLog = this.timeLogs[targetIndex];
      const isIdentical = targetLog.workspaceId === log.workspaceId && targetLog.notes === log.notes;

      if (!isIdentical) {
        break;
      }

      // Move to next one in the same direction
      targetIndex = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
    }

    if (targetIndex >= 0 && targetIndex < this.timeLogs.length) {
      const targetLog = this.timeLogs[targetIndex];

      try {
        // Copy Workspace
        if (targetLog.workspaceId !== log.workspaceId) {
          await electron.timeUpdateLog(targetLog.id, log.workspaceId);
          targetLog.workspaceId = log.workspaceId;
        }

        // Copy Notes
        if (targetLog.notes !== log.notes) {
          await electron.timeUpdateNotes(targetLog.id, log.notes);
          targetLog.notes = log.notes;
        }

        this.calculateBreakdown();
      } catch (err) {
        console.error('Failed to copy settings:', err);
      }
    }
  }
}
