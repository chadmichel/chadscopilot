import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToolSettingsService } from '../services/tool-settings.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calendar-page">
      <div class="header">
        <div class="title-section">
          <h2>Calendar</h2>
          <p class="subtitle">Sync your meetings and activities</p>
        </div>
        <div class="actions">
          @if (accountId) {
            <button class="btn btn-secondary" (click)="sync()" [disabled]="isSyncing">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.spinning]="isSyncing">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
            </button>
          }
          <button class="btn btn-secondary" (click)="goToSettings()" title="Configuration">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="content">
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Go to Configuration
            </button>
          </div>
        } @else if (events.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3>No events found</h3>
            <p>Your calendar is connected, but we couldn't find any upcoming events.</p>
            <button class="btn btn-secondary" (click)="sync()" [disabled]="isSyncing">
              {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
            </button>
          </div>
        } @else {
          <div class="events-grid">
            @for (event of events; track event.id) {
              <div class="event-card">
                <div class="event-marker"></div>
                <div class="event-time">
                  <span class="day">{{ event.start | date:'EEE' }}</span>
                  <span class="date">{{ event.start | date:'MMM d' }}</span>
                  <span class="hour">{{ event.start | date:'shortTime' }}</span>
                </div>
                <div class="event-main">
                  <div class="subject">{{ event.subject }}</div>
                  @if (event.location) {
                    <div class="location">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {{ event.location }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .calendar-page {
      padding: 32px;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--app-background);
      color: var(--app-text);
      overflow-y: auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }

    h2 {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, #fff 0%, #aaa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: var(--app-text-muted);
      margin: 4px 0 0 0;
      font-size: 14px;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: var(--theme-primary);
      color: #fff;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: var(--app-surface);
      color: var(--app-text);
      border-color: var(--app-border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--app-border);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .content {
      flex: 1;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
      background: var(--app-surface);
      border-radius: 16px;
      border: 1px dashed var(--app-border);
    }

    .empty-icon {
      color: var(--app-text-muted);
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 20px;
      margin-bottom: 12px;
    }

    .empty-state p {
      color: var(--app-text-muted);
      max-width: 320px;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .events-grid {
      display: grid;
      gap: 12px;
    }

    .event-card {
      display: flex;
      align-items: center;
      padding: 16px;
      background: var(--app-surface);
      border-radius: 12px;
      border: 1px solid var(--app-border);
      transition: transform 0.2s, border-color 0.2s;
      position: relative;
      overflow: hidden;
    }

    .event-card:hover {
      border-color: var(--theme-primary);
      transform: translateX(4px);
    }

    .event-marker {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--theme-primary);
      opacity: 0.7;
    }

    .event-time {
      display: flex;
      flex-direction: column;
      min-width: 100px;
      padding-right: 20px;
      border-right: 1px solid var(--app-border);
      margin-right: 20px;
    }

    .day {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--theme-primary);
      letter-spacing: 1px;
    }

    .date {
      font-size: 16px;
      font-weight: 600;
      margin: 2px 0;
    }

    .hour {
      font-size: 12px;
      color: var(--app-text-muted);
    }

    .event-main {
      flex: 1;
    }

    .subject {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }

    .location {
      font-size: 13px;
      color: var(--app-text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
})
export class CalendarComponent implements OnInit {
  accountId: string | null = null;
  events: any[] = [];
  isSyncing = false;

  constructor(
    private router: Router,
    private toolSettingsService: ToolSettingsService
  ) { }

  get electron() { return (window as any).electronAPI; }

  async ngOnInit() {
    this.accountId = localStorage.getItem('outlook_account_id');
    if (this.accountId) {
      await this.loadEvents();
    }
  }

  async login() {
    try {
      const id = await this.electron.calendarLogin();
      if (id) {
        this.accountId = id;
        localStorage.setItem('outlook_account_id', id);
        await this.sync();
      }
    } catch (err) {
      console.error('Login failed', err);
    }
  }

  async sync() {
    if (!this.accountId) return;
    this.isSyncing = true;
    try {
      await this.electron.calendarSync(this.accountId);
      await this.loadEvents();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      this.isSyncing = false;
    }
  }

  async loadEvents() {
    if (!this.accountId) return;
    this.events = await this.electron.calendarGetEvents(this.accountId);
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
