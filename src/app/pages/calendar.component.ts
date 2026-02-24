import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToolSettingsService } from '../services/tool-settings.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calendar-page">
      <div class="header">
        <div class="title-section">
          <div class="selectors">
            <select class="view-select" [(ngModel)]="displayMode">
              <option value="day">Day</option>
              <option value="work-week">Work Week</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>

            <div class="user-selector">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <select [(ngModel)]="selectedUserId" (change)="onUserChange()">
                <option [value]="accountId">My Calendar</option>
                @for (shared of sharedEmails; track shared) {
                  <option [value]="shared">{{ shared }}</option>
                }
                <option value="add_new">+ Add Shared Calendar...</option>
              </select>
            </div>
            <div class="navigation">
              <button class="nav-btn" (click)="prev()" title="Previous Page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button class="nav-btn today-btn" (click)="resetToToday()">Today</button>
              <button class="nav-btn" (click)="next()" title="Next Page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
              <span class="range-label">{{ getRangeLabel() }}</span>
            </div>
          </div>
        </div>

        <div class="actions">
          @if (accountId) {
            <button class="btn btn-secondary" (click)="sync()" [disabled]="isSyncing">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.spinning]="isSyncing">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {{ isSyncing ? 'Syncing...' : 'Sync' }}
            </button>
          }
        </div>
      </div>

      <div class="content">
        @if (isAddingEmail) {
          <div class="add-email-overlay">
            <div class="add-email-card">
              <h3>Add Shared Calendar</h3>
              <p>Enter the email address of the user whose calendar you want to view.</p>
              <input type="email" [(ngModel)]="newEmail" placeholder="user@example.com" class="email-input" (keyup.enter)="confirmAddEmail()">
              <div class="modal-actions">
                <button class="btn btn-secondary" (click)="cancelAddEmail()">Cancel</button>
                <button class="btn btn-primary" (click)="confirmAddEmail()">Add Calendar</button>
              </div>
            </div>
          </div>
        }

        @if (!accountId) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3>Connect your calendar</h3>
            <p>Bring your Outlook schedule into Chad's Copilot to stay organized.</p>
            <button class="btn btn-primary" (click)="goToSettings()">
              Go to Configuration
            </button>
          </div>
        } @else {
          <!-- DAY VIEW -->
          @if (displayMode === 'day') {
            <div class="day-view">
              <div class="date-header">{{ viewDate | date:'fullDate' }}</div>
              <div class="events-list">
                @for (event of getEventsForDate(viewDate); track event.id) {
                  <div class="event-item">
                    <div class="time">{{ event.start | date:'h:mm a' }}</div>
                    <div class="details">
                      <div class="subject">{{ event.subject }}</div>
                      <div class="location">{{ event.location }}</div>
                    </div>
                  </div>
                } @empty {
                  <div class="no-events">No events scheduled for today</div>
                }
              </div>
            </div>
          }

          <!-- WEEK / WORK WEEK VIEW -->
          @if (displayMode === 'week' || displayMode === 'work-week') {
            <div class="week-view">
              <div class="week-metrics-bar">
                <span class="bar-label">Weekly Summary</span>
                @let weekMetrics = getWeekMetrics();
                <div class="bar-metrics">
                  <div class="bar-metric">
                    <span class="val">{{ weekMetrics.allocated }}%</span>
                    <span class="lab">Allocated</span>
                  </div>
                  <div class="bar-metric">
                    <span class="val">{{ weekMetrics.deepWork }}%</span>
                    <span class="lab">Deep Work</span>
                  </div>
                </div>
              </div>
              <div class="week-grid" [style.grid-template-columns]="'repeat(' + (displayMode === 'work-week' ? 5 : 7) + ', minmax(0, 1fr))'">
                @for (day of weekDays; track day.getTime()) {
                  @if (displayMode === 'week' || (day.getDay() !== 0 && day.getDay() !== 6)) {
                    <div class="week-col" [class.is-today]="isToday(day)">
                      <div class="day-header">
                        <span class="day-name">{{ day | date:'EEE' }}</span>
                        <span class="day-num">{{ day | date:'d' }}</span>
                        <div class="day-metrics">
                          @let metrics = getDayMetrics(day);
                          <div class="metric-item" title="% of 9am-5pm allocated to meetings">
                            <span class="metric-value">{{ metrics.allocated }}%</span>
                            <span class="metric-label">Allocated</span>
                          </div>
                          <div class="metric-item" title="% of 9am-5pm available for deep work (gaps >= 1hr)">
                            <span class="metric-value">{{ metrics.deepWork }}%</span>
                            <span class="metric-label">Deep Work</span>
                          </div>
                        </div>
                        @if (metrics.bestRange) {
                          <div class="deep-work-rec">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 2v20M2 12h20"/>
                            </svg>
                            Best: {{ metrics.bestRange }}
                          </div>
                        } @else {
                          <div class="deep-work-rec none">
                            No Deep Work Available
                          </div>
                        }
                      </div>
                      <div class="day-events">
                        @for (event of getEventsForDate(day); track event.id) {
                          <div class="event-bubble" [title]="event.subject">
                            <span class="time">{{ event.start | date:'h:mm a' }}</span>
                            <span class="title">{{ event.subject }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          }

          <!-- MONTH VIEW -->
          @if (displayMode === 'month') {
            <div class="month-view">
              <div class="week-metrics-bar">
                <span class="bar-label">Monthly Summary</span>
                @let monthMetrics = getMonthMetrics();
                <div class="bar-metrics">
                  <div class="bar-metric">
                    <span class="val">{{ monthMetrics.allocated }}%</span>
                    <span class="lab">Allocated</span>
                  </div>
                  <div class="bar-metric">
                    <span class="val">{{ monthMetrics.deepWork }}%</span>
                    <span class="lab">Deep Work</span>
                  </div>
                </div>
              </div>
              <div class="month-grid">
                <div class="weekday-labels">
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>
                <div class="days-container">
                  @for (day of monthDays; track day.getTime()) {
                    <div class="month-day" 
                         [class.is-today]="isToday(day)"
                         [class.other-month]="day.getMonth() !== viewDate.getMonth()">
                      <span class="day-number">{{ day | date:'d' }}</span>
                      <div class="event-dots">
                        @for (event of getEventsForDate(day).slice(0, 3); track event.id) {
                          <div class="event-dot" [title]="event.subject"></div>
                        }
                        @if (getEventsForDate(day).length > 3) {
                          <div class="plus-more">+{{ getEventsForDate(day).length - 3 }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .calendar-page {
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--app-background);
      color: var(--app-text);
      overflow: hidden;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .title-section h2 {
      font-size: 24px;
      margin: 0 0 12px 0;
      font-weight: 700;
    }

    .selectors {
      display: flex;
      gap: 12px;
    }

    .view-select, .user-selector select {
      background: var(--app-surface);
      color: var(--app-text);
      border: 1px solid var(--app-border);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }

    .user-selector {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      padding: 0 8px;
      border-radius: 6px;
    }

    .user-selector select { border: none; }

    .actions { display: flex; gap: 8px; }
    
    .navigation {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      padding-left: 12px;
      border-left: 1px solid var(--app-border);
    }

    .nav-btn {
      background: transparent;
      border: 1px solid var(--app-border);
      color: var(--app-text);
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .nav-btn:hover {
      background: var(--app-surface);
      border-color: var(--theme-primary);
    }
    .today-btn {
      width: auto;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .range-label {
      margin-left: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--app-text);
      min-width: 150px;
    }

    .content {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    /* Day View */
    .day-view {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 24px;
    }
    .date-header { font-size: 18px; font-weight: 600; margin-bottom: 20px; }
    .event-item {
      display: flex;
      gap: 20px;
      padding: 12px 0;
      border-bottom: 1px solid var(--app-border);
    }
    .event-item .time { min-width: 80px; color: var(--theme-primary); font-weight: 600; }
    .event-item .subject { font-weight: 600; }
    .event-item .location { font-size: 12px; color: var(--app-text-muted); }

    /* Week View */
    .week-view { height: 100%; overflow: hidden; }
    .week-grid {
      display: grid;
      height: 100%;
      background: var(--app-border);
      gap: 1px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .week-col {
      background: var(--app-surface);
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0; /* Important for grid item shrinking */
    }
    .week-col.is-today { background: var(--app-background); }
    .day-header {
      padding: 12px;
      text-align: center;
      border-bottom: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
    }
    .day-name { font-size: 11px; text-transform: uppercase; color: var(--app-text-muted); }
    .day-num { font-size: 18px; font-weight: 700; }
    .is-today .day-num { color: var(--theme-primary); }
    
    /* Metrics */
    .day-metrics {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--app-border);
    }
    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .metric-value {
      font-size: 11px;
      font-weight: 700;
      color: var(--app-text);
    }
    .metric-label {
      font-size: 9px;
      text-transform: uppercase;
      color: var(--app-text-muted);
      letter-spacing: 0.2px;
    }
    
    .deep-work-rec {
      margin-top: 8px;
      font-size: 10px;
      font-weight: 600;
      color: var(--theme-primary);
      background: color-mix(in srgb, var(--theme-primary), transparent 92%);
      padding: 4px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .deep-work-rec.none {
      color: var(--app-text-muted);
      background: var(--app-background);
      border: 1px dashed var(--app-border);
      font-weight: 500;
    }

    /* Weekly Bar */
    .week-metrics-bar {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 8px;
      padding: 12px 20px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .bar-label {
      font-size: 14px;
      font-weight: 700;
      color: var(--app-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .bar-metrics {
      display: flex;
      gap: 32px;
    }
    .bar-metric {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .bar-metric .val {
      font-size: 20px;
      font-weight: 800;
      color: var(--theme-primary);
    }
    .bar-metric .lab {
      font-size: 11px;
      font-weight: 600;
      color: var(--app-text-muted);
      text-transform: uppercase;
    }
    
    .day-events {
      flex: 1;
      padding: 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .event-bubble {
      background: color-mix(in srgb, var(--theme-primary), transparent 90%);
      border-left: 3px solid var(--theme-primary);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
    }
    .event-bubble .time { font-weight: 700; color: var(--theme-primary); margin-bottom: 2px; white-space: nowrap; }
    .event-bubble .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Month View */
    .month-view { height: 100%; }
    .month-grid {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .weekday-labels {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: var(--app-surface);
      border-bottom: 1px solid var(--app-border);
    }
    .weekday-labels span {
      padding: 8px;
      text-align: center;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--app-text-muted);
    }
    .days-container {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-auto-rows: 1fr;
      flex: 1;
      background: var(--app-border);
      gap: 1px;
    }
    .month-day {
      background: var(--app-surface);
      padding: 8px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .month-day.other-month { opacity: 0.4; background: var(--app-background); }
    .day-number { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .is-today .day-number { 
      background: var(--theme-primary); 
      color: #fff; 
      width: 20px; 
      height: 20px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%;
    }
    .event-dots { display: flex; flex-wrap: wrap; gap: 2px; }
    .event-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--theme-primary); }
    .plus-more { font-size: 9px; color: var(--app-text-muted); }

    .btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .btn-secondary { background: var(--app-surface); border-color: var(--app-border); color: var(--app-text); }
    .btn-primary { background: var(--theme-primary); color: #fff; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Modal Overlay */
    .add-email-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .add-email-card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .add-email-card h3 { font-size: 20px; margin: 0 0 12px 0; }
    .add-email-card p { font-size: 14px; color: var(--app-text-muted); margin-bottom: 24px; }

    .email-input {
      width: 100%;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      color: var(--app-text);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 24px;
      outline: none;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `],
})
export class CalendarComponent implements OnInit {
  accountId: string | null = null;
  selectedUserId: string | null = null;
  displayMode: 'day' | 'week' | 'work-week' | 'month' = 'work-week';
  events: any[] = [];
  sharedEmails: string[] = [];
  isSyncing = false;
  isAddingEmail = false;
  newEmail = '';

  realToday = new Date();
  viewDate = new Date();
  weekDays: Date[] = [];
  monthDays: Date[] = [];

  constructor(
    private router: Router,
    private toolSettingsService: ToolSettingsService
  ) { }

  get electron() { return (window as any).electronAPI; }

  calculateGrids() {
    // Week grid
    const startOfWeek = new Date(this.viewDate);
    startOfWeek.setDate(this.viewDate.getDate() - this.viewDate.getDay()); // Sunday
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    // Month grid
    const startOfMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const startGrid = new Date(startOfMonth);
    startGrid.setDate(startGrid.getDate() - startGrid.getDay()); // Start on Sunday of first week

    this.monthDays = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startGrid);
      d.setDate(startGrid.getDate() + i);
      return d;
    });
  }

  isToday(d: Date) {
    return d.toDateString() === this.realToday.toDateString();
  }

  getDayMetrics(date: Date) {
    const events = this.events.filter(e => new Date(e.start).toDateString() === date.toDateString());

    const dayStart = new Date(date);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    const totalMinutes = 8 * 60; // 9am - 5pm

    // Sort and filter events to 9-5 window
    const dayEvents = events.map(e => ({
      start: new Date(e.start),
      end: new Date(e.end)
    })).filter(e => e.end > dayStart && e.start < dayEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Merge overlapping events and clip to 9-5
    const merged: { start: Date, end: Date }[] = [];
    for (const e of dayEvents) {
      const s = e.start < dayStart ? dayStart : e.start;
      const f = e.end > dayEnd ? dayEnd : e.end;

      if (merged.length > 0 && s <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = new Date(Math.max(merged[merged.length - 1].end.getTime(), f.getTime()));
      } else {
        merged.push({ start: s, end: f });
      }
    }

    let allocatedMins = 0;
    merged.forEach(m => {
      allocatedMins += (m.end.getTime() - m.start.getTime()) / (1000 * 60);
    });

    let deepWorkMins = 0;
    let cursor = dayStart.getTime();
    let longestGapMins = 0;
    let bestRange = '';

    const formatRange = (start: number, end: number) => {
      const s = new Date(start);
      const e = new Date(end);
      const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${fmt(s)} - ${fmt(e)}`;
    };

    const processGap = (start: number, end: number) => {
      const gap = (end - start) / (1000 * 60);
      if (gap >= 60) {
        deepWorkMins += gap;
        if (gap > longestGapMins) {
          longestGapMins = gap;
          bestRange = formatRange(start, end);
        }
      }
    };

    for (const m of merged) {
      processGap(cursor, m.start.getTime());
      cursor = Math.max(cursor, m.end.getTime());
    }
    processGap(cursor, dayEnd.getTime());

    return {
      allocated: Math.round((allocatedMins / totalMinutes) * 100),
      deepWork: Math.round((deepWorkMins / totalMinutes) * 100),
      bestRange: bestRange || null
    };
  }

  getWeekMetrics() {
    const activeDays = this.weekDays.filter(day =>
      this.displayMode === 'week' || (day.getDay() !== 0 && day.getDay() !== 6)
    );

    let totalAllocated = 0;
    let totalDeepWork = 0;

    activeDays.forEach(day => {
      const m = this.getDayMetrics(day);
      totalAllocated += m.allocated;
      totalDeepWork += m.deepWork;
    });

    return {
      allocated: Math.round(totalAllocated / activeDays.length),
      deepWork: Math.round(totalDeepWork / activeDays.length)
    };
  }

  getMonthMetrics() {
    const activeDays = this.monthDays.filter(day =>
      day.getMonth() === this.viewDate.getMonth() && (day.getDay() !== 0 && day.getDay() !== 6)
    );

    if (activeDays.length === 0) return { allocated: 0, deepWork: 0 };

    let totalAllocated = 0;
    let totalDeepWork = 0;

    activeDays.forEach(day => {
      const m = this.getDayMetrics(day);
      totalAllocated += m.allocated;
      totalDeepWork += m.deepWork;
    });

    return {
      allocated: Math.round(totalAllocated / activeDays.length),
      deepWork: Math.round(totalDeepWork / activeDays.length)
    };
  }

  getEventsForDate(d: Date) {
    const dateStr = d.toDateString();
    return this.events.filter(e => new Date(e.start).toDateString() === dateStr);
  }

  get filteredEvents() {
    const startOfView = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), this.viewDate.getDate());

    return this.events.filter(event => {
      const eventDate = new Date(event.start);
      const diffDays = Math.floor((eventDate.getTime() - startOfView.getTime()) / (1000 * 60 * 60 * 24));

      if (this.displayMode === 'day') {
        return diffDays === 0;
      } else if (this.displayMode === 'week' || this.displayMode === 'work-week') {
        const isWithinWeek = diffDays >= 0 && diffDays < 7;
        if (this.displayMode === 'work-week') {
          return isWithinWeek && eventDate.getDay() !== 0 && eventDate.getDay() !== 6;
        }
        return isWithinWeek;
      } else {
        return diffDays >= 0 && diffDays < 30;
      }
    });
  }

  getRangeLabel(): string {
    if (this.displayMode === 'day') {
      return this.viewDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (this.displayMode === 'month') {
      return this.viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else {
      const start = this.weekDays[0];
      const end = this.weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString(undefined, { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
    }
  }

  prev() { this.navigate(-1); }
  next() { this.navigate(1); }

  resetToToday() {
    this.viewDate = new Date();
    this.calculateGrids();
  }

  private navigate(delta: number) {
    if (this.displayMode === 'day') {
      this.viewDate.setDate(this.viewDate.getDate() + delta);
    } else if (this.displayMode === 'month') {
      this.viewDate.setMonth(this.viewDate.getMonth() + delta);
    } else {
      this.viewDate.setDate(this.viewDate.getDate() + (delta * 7));
    }
    this.viewDate = new Date(this.viewDate); // Trigger change detection
    this.calculateGrids();
  }

  async ngOnInit() {
    this.accountId = localStorage.getItem('outlook_account_id');
    this.selectedUserId = this.accountId;

    // Load previously added shared emails from local storage
    const saved = localStorage.getItem('calendar_shared_emails');
    if (saved) {
      this.sharedEmails = JSON.parse(saved);
    }

    this.calculateGrids();

    if (this.accountId) {
      await this.loadEvents();
    }
  }

  async onUserChange() {
    if (this.selectedUserId === 'add_new') {
      this.isAddingEmail = true;
      this.newEmail = '';
    } else {
      await this.loadEvents();
    }
  }

  async confirmAddEmail() {
    if (this.newEmail && this.newEmail.includes('@')) {
      if (!this.sharedEmails.includes(this.newEmail)) {
        this.sharedEmails.push(this.newEmail);
        localStorage.setItem('calendar_shared_emails', JSON.stringify(this.sharedEmails));
      }
      this.selectedUserId = this.newEmail;
      this.isAddingEmail = false;
      await this.loadEvents();
    }
  }

  cancelAddEmail() {
    this.isAddingEmail = false;
    this.selectedUserId = this.accountId;
  }

  async sync() {
    if (!this.accountId || !this.selectedUserId) return;
    this.isSyncing = true;
    try {
      // If selectedUserId is the accountId, it's 'me', otherwise it's the specific email
      const targetEmail = this.selectedUserId === this.accountId ? undefined : this.selectedUserId;
      await this.electron.calendarSync(this.accountId, targetEmail);
      await this.loadEvents();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      this.isSyncing = false;
    }
  }

  async loadEvents() {
    if (!this.selectedUserId) return;
    this.events = await this.electron.calendarGetEvents(this.selectedUserId);
  }

  async goToSettings() {
    await this.toolSettingsService.loadTools();
    const calendarTool = this.toolSettingsService.tools.find(t => t.toolType === 'calendar');
    if (calendarTool) {
      this.router.navigate(['/tools', calendarTool.id]);
    } else {
      this.router.navigate(['/tools']);
    }
  }
}
