import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../chat/chat.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { PlanEngineService } from '../services/plan-engine.service';
import { PlanData, PlanActivity, PlanResource } from '../models/plan.model';

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
          <label for="path">FILE PATH:</label>
          <input
            id="path"
            type="text"
            [(ngModel)]="filePath"
            placeholder="plans/plan.json"
          />
        </div>
        <div class="header-actions">
           <button class="settings-btn" (click)="showSettings = true" title="Project Settings">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="12" cy="12" r="3"/>
               <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
             </svg>
           </button>
        </div>
      </header>

      @if (showSettings) {
        <div class="dialog-overlay" (click)="showSettings = false">
          <div class="dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Project Settings</h3>
              <button class="dialog-close" (click)="showSettings = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label for="startDate">Project Start Date</label>
                <input id="startDate" type="date" class="form-input" [(ngModel)]="plan.startDate" (ngModelChange)="markDirty()" />
              </div>

              <div class="form-group" style="margin-top: 20px;">
                <label>Work Week Availability (%)</label>
                <div class="work-week-grid">
                  @for (day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; track day; let i = $index) {
                    <div class="day-input">
                      <label>{{day}}</label>
                      <input type="number" class="cell-input" min="0" max="100" 
                             [ngModel]="(plan.workWeek?.[i] || 0) * 100" 
                             (ngModelChange)="updateWorkWeek(i, $event)" />
                    </div>
                  }
                </div>
              </div>

              <div class="form-group" style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label>Holidays</label>
                  <button class="toolbar-btn" style="padding: 2px 8px; font-size: 11px;" (click)="addHoliday()">+ Add</button>
                </div>
                <div class="holidays-list">
                  @for (h of plan.holidays; track h; let i = $index) {
                    <div class="holiday-row">
                       <input type="date" class="cell-input" [(ngModel)]="plan.holidays![i]" (ngModelChange)="markDirty()" />
                       <button class="remove-btn" (click)="removeHoliday(i)">
                         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                           <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                         </svg>
                       </button>
                    </div>
                  }
                  @if (!plan.holidays?.length) {
                    <div class="empty-holidays">No holidays defined</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <div class="builder-body">
        <div class="agent-side">
          <app-chat
            [workspaceId]="'plan-' + workspaceId"
            [folderPath]="workspace?.folderPath || ''"
            [contextProvider]="getPlanContext"
            [hideJson]="true">
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
                            <td>
                              <div class="percentage-input-wrapper">
                                <input class="cell-input percentage-input" type="number" 
                                       [ngModel]="res.allocation * 100" 
                                       (ngModelChange)="res.allocation = $event / 100; markDirty()" 
                                       min="0" max="100" step="1" />
                                <span class="percentage-suffix">%</span>
                              </div>
                            </td>
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
                           <th style="width:70px">Priority</th>
                           <th style="width:90px">Duration</th>
                           <th style="width:130px">Start Date</th>
                           <th style="width:130px">End Date</th>
                           <th style="width:200px">Depends On</th>
                           <th style="width:50px">Color</th>
                           <th style="width:50px"></th>
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
                             <td><input class="cell-input" type="number" [(ngModel)]="act.priority" (ngModelChange)="markDirty()" /></td>
                             <td><input class="cell-input" type="number" [(ngModel)]="act.durationDays" (ngModelChange)="markDirty()" min="0" /></td>
                            <td><span class="date-read-only">{{ act.startDate }}</span></td>
                            <td><span class="date-read-only">{{ act.endDate }}</span></td>
                            <td>
                              <div class="deps-cell">
                                <div class="deps-tags">
                                  @for (depId of act.dependsOn; track depId) {
                                    <span class="dep-tag">
                                      {{ getActivityName(depId) }}
                                      <button class="dep-remove" (click)="removeDependency(act, depId)">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                          <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                                        </svg>
                                      </button>
                                    </span>
                                  }
                                </div>
                                <select class="cell-input dep-select" (change)="addDependency(act, $any($event.target).value); $any($event.target).value = ''">
                                  <option value="">+ Add...</option>
                                  @for (other of getAvailableDependencies(act); track other.id) {
                                    <option [value]="other.id">{{ other.name || other.id }}</option>
                                  }
                                </select>
                              </div>
                            </td>
                            <td><input type="color" [(ngModel)]="act.color" (ngModelChange)="markDirty()" class="color-picker" /></td>
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
                <div class="gantt-toolbar">
                  <div class="zoom-controls">
                    <label>Zoom</label>
                    <input type="range" min="100" max="3000" step="100" [(ngModel)]="ganttZoom" />
                    <span class="zoom-label">{{ ganttZoom }}%</span>
                  </div>
                </div>

                @if (plan.activities.length > 0) {
                  <div class="gantt-scroll-area">
                    <div class="gantt-header-row">
                      <div class="gantt-label-col">Resource</div>
                      <div class="gantt-bar-col" [style.min-width.px]="8 * ganttZoom">
                        <div class="gantt-date-labels">
                          @for (tick of getGanttTicks(); track tick.dateSpace) {
                            <div class="gantt-date-tick" [style.left.%]="tick.dateSpace">
                              {{ tick.label }}
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    @for (row of getGanttRows(); track row.resourceName) {
                      <div class="gantt-row">
                        <div class="gantt-label-col">{{ row.resourceName }}</div>
                        <div class="gantt-bar-col" [style.min-width.px]="8 * ganttZoom">
                          <div class="gantt-grid-lines">
                            @for (tick of getGanttTicks(); track tick.dateSpace) {
                              <div class="gantt-v-line" [style.left.%]="tick.dateSpace"></div>
                            }
                          </div>
                          @for (act of row.activities; track act.id) {
                            <div class="gantt-bar"
                              [style.left.%]="getBarLeft(act)"
                              [style.width.%]="getBarWidth(act)"
                              [style.background-color]="act.color || 'var(--theme-primary)'"
                              [style.border-color]="act.color || 'var(--theme-primary)'"
                              [title]="act.name + ': ' + act.startDate + ' → ' + act.endDate">
                              <span class="gantt-bar-text">{{ act.name }} ({{ act.durationDays }}d)</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
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
      flex: 1;
      width: 100%;
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
      justify-content: space-between;
      padding: 0 80px; /* Balanced padding on both sides for true horizontal centering */
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      -webkit-app-region: drag;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--theme-primary);
      flex: 0 0 150px;
    }

    .header-left h1 {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
      line-height: 1; /* Fix vertical alignment */
      display: flex;
      align-items: center;
      white-space: nowrap;
    }

    .path-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 500px;
      justify-content: center;
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
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 0 0 180px;
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
      flex-shrink: 0;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    app-chat {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
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

    .percentage-input-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-right: 8px;
    }

    .percentage-input {
      text-align: right;
    }

    .percentage-suffix {
      font-size: 11px;
      font-weight: 700;
      color: var(--app-text-muted);
    }

    .color-picker {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid var(--app-border);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--app-background);
    }

    .gantt-toolbar {
      display: flex;
      justify-content: flex-end;
      padding: 10px 16px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .zoom-controls label {
      font-size: 11px;
      font-weight: 700;
      color: var(--app-text-muted);
      text-transform: uppercase;
    }

    .zoom-controls input[type="range"] {
      width: 120px;
    }

    .zoom-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--theme-primary);
      min-width: 40px;
    }

    .gantt-scroll-area {
      flex: 1;
      overflow: auto;
      padding: 20px;
    }

    .gantt-header-row {
      display: flex;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--app-border);
      margin-bottom: 4px;
      width: fit-content;
      min-width: 100%;
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
      position: sticky;
      left: 0;
      background: var(--app-background);
      z-index: 10;
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
      position: relative;
      height: 20px;
      font-size: 10px;
      color: var(--app-text-muted);
    }

    .gantt-date-tick {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    .gantt-grid-lines {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .gantt-v-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: var(--app-border);
      opacity: 0.3;
    }

    .gantt-row {
      display: flex;
      align-items: center;
      width: fit-content;
      min-width: 100%;
      margin-bottom: 2px;
    }

    .gantt-bar {
      position: absolute;
      top: 4px;
      height: 20px;
      background: color-mix(in srgb, var(--theme-primary), transparent 20%);
      border: 1px solid var(--theme-primary);
      border-radius: 4px;
      min-width: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: left 0.2s, width 0.2s;
      overflow: hidden;
      white-space: nowrap;
      z-index: 1;
    }
    
    .gantt-bar:hover {
      z-index: 10;
      background: var(--theme-primary);
    }

    .gantt-bar-text {
      font-size: 10px;
      font-weight: 700;
      color: white;
      white-space: nowrap;
      overflow: hidden;
    }

    /* Settings button */
    .settings-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      color: var(--app-text-muted);
      border: 1px solid var(--app-border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      margin-left: 4px;
    }
    .settings-btn:hover {
      color: var(--theme-primary);
      border-color: var(--theme-primary);
    }

    /* Dialog */
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      width: 550px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--app-border);
    }
    .dialog-header h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--app-text);
    }
    .dialog-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--app-text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .dialog-close:hover {
      background: var(--app-background);
      color: var(--app-text);
    }
    .dialog-body {
      padding: 20px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .form-input {
      background: var(--app-background);
      color: var(--app-text);
      border: 1px solid var(--app-border);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }
    .form-input:focus {
      border-color: var(--theme-primary);
    }

    /* Dependency tags */
    .deps-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .deps-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }
    .dep-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: color-mix(in srgb, var(--theme-primary), transparent 85%);
      color: var(--theme-primary);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .dep-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      background: transparent;
      border: none;
      color: var(--theme-primary);
      cursor: pointer;
      padding: 0;
      border-radius: 2px;
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .dep-remove:hover {
      opacity: 1;
    }
    .dep-select {
      font-size: 11px !important;
      padding: 3px 6px !important;
    }

    .work-week-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
    }
    .day-input {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }
    .day-input label {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    
    .holidays-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 150px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .holiday-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .empty-holidays {
      font-size: 12px;
      color: var(--app-text-muted);
      font-style: italic;
      text-align: center;
      padding: 10px;
    }

    .date-read-only {
      font-size: 13px;
      font-family: 'SF Mono', monospace;
      color: var(--app-text-muted);
      padding: 5px 8px;
      display: block;
      white-space: nowrap;
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
  plan: PlanData = {
    startDate: '',
    resources: [],
    activities: [],
    earnedValue: [],
    workWeek: [0, 1, 1, 1, 1, 1, 0],
    holidays: []
  };
  isDirty = false;
  showSettings = false;
  activeTab: 'activities' | 'gantt' | 'ev' = 'activities';
  ganttMinDate = '';
  ganttMaxDate = '';
  ganttZoom = 100;
  private ganttRangeMs = 1;
  private ganttStartMs = 0;
  private chatSub?: Subscription;
  private saveSubject = new Subject<void>();

  getPlanContext = (): string => {
    const json = JSON.stringify(this.plan, null, 2);
    return `You are a project planning assistant. Here is the current plan:\n\`\`\`json\n${json}\n\`\`\`\n\nExplain what you are changing in plain text first, then ALWAYS end your response with the FULL updated plan JSON inside a single \`\`\`json code block. The JSON must have "startDate", "resources", "activities", "earnedValue", "workWeek", and "holidays" arrays. Activity start and end dates are automatically calculated. Each resource has: id, name, allocation (number 0-1), daysOff[]. Each activity has: id, name, resourceId, resourceName, durationDays, priority (higher is more important), dependsOn (string[] of activity ids), and color (hex string). "workWeek" is an array of 7 numbers (0-1) for Sun-Sat. "holidays" is a string array of YYYY-MM-DD.`;
  };

  private get electron() { return (window as any).electronAPI; }

  constructor(
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService,
    private chatService: ChatService,
    private planEngine: PlanEngineService
  ) {
    this.saveSubject.pipe(debounceTime(1000)).subscribe(() => {
      this.saveFile();
    });
  }

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
                startDate: parsed.startDate || this.plan.startDate || '',
                resources: parsed.resources || [],
                activities: (parsed.activities || []).map((a: any) => ({ ...a, dependsOn: a.dependsOn || [], priority: a.priority || 0 })),
                earnedValue: parsed.earnedValue || [],
                workWeek: parsed.workWeek || this.plan.workWeek || [0, 1, 1, 1, 1, 1, 0],
                holidays: parsed.holidays || this.plan.holidays || [],
              };
              this.isDirty = true;
              this.markDirty();
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
          startDate: parsed.startDate || '',
          resources: parsed.resources || [],
          activities: (parsed.activities || []).map((a: any) => ({ ...a, dependsOn: a.dependsOn || [] })),
          earnedValue: parsed.earnedValue || [],
          workWeek: parsed.workWeek || [0, 1, 1, 1, 1, 1, 0],
          holidays: parsed.holidays || [],
        };
        this.isDirty = false;
        this.recalculateDates();
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
    this.recalculateDates();
    this.saveSubject.next();
  }

  recalculateDates() {
    this.planEngine.calculate(this.plan);
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
      dependsOn: [],
      priority: 0,
      color: '#4db6ac',
    });
    this.markDirty();
  }

  removeActivity(id: string) {
    this.plan.activities = this.plan.activities.filter(a => a.id !== id);
    for (const act of this.plan.activities) {
      act.dependsOn = act.dependsOn.filter(d => d !== id);
    }
    this.markDirty();
  }

  addResource() {
    const id = 'res-' + Math.random().toString(36).substring(2, 9);
    this.plan.resources.push({
      id,
      name: '',
      allocation: 1,
      daysOff: [],
    });
    this.markDirty();
  }

  removeResource(id: string) {
    this.plan.resources = this.plan.resources.filter(r => r.id !== id);
    this.markDirty();
  }

  onResourceSelect(act: PlanActivity) {
    const res = this.plan.resources.find(r => r.id === act.resourceId);
    act.resourceName = res?.name || '';
    this.markDirty();
  }

  getActivityName(id: string): string {
    const act = this.plan.activities.find(a => a.id === id);
    return act?.name || id;
  }

  getAvailableDependencies(act: PlanActivity): PlanActivity[] {
    return this.plan.activities.filter(a => a.id !== act.id && !act.dependsOn.includes(a.id));
  }

  addDependency(act: PlanActivity, depId: string) {
    if (!depId || act.dependsOn.includes(depId)) return;
    act.dependsOn.push(depId);
    this.markDirty();
  }

  removeDependency(act: PlanActivity, depId: string) {
    act.dependsOn = act.dependsOn.filter(d => d !== depId);
    this.markDirty();
  }

  updateWorkWeek(index: number, value: number) {
    if (!this.plan.workWeek) this.plan.workWeek = [0, 1, 1, 1, 1, 1, 0];
    this.plan.workWeek[index] = value / 100;
    this.markDirty();
  }

  addHoliday() {
    if (!this.plan.holidays) this.plan.holidays = [];
    this.plan.holidays.push(new Date().toISOString().split('T')[0]);
    this.markDirty();
  }

  removeHoliday(index: number) {
    this.plan.holidays?.splice(index, 1);
    this.markDirty();
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

  getGanttRows() {
    const rows: { resourceName: string; activities: PlanActivity[] }[] = [];
    for (const res of this.plan.resources) {
      const assigned = this.plan.activities.filter((a) => a.resourceId === res.id);
      if (assigned.length > 0) {
        rows.push({ resourceName: res.name || 'Unnamed Resource', activities: assigned });
      }
    }
    const unassigned = this.plan.activities.filter((a) => !a.resourceId);
    if (unassigned.length > 0) {
      rows.push({ resourceName: 'Unassigned', activities: unassigned });
    }
    return rows;
  }

  getGanttTicks() {
    if (this.ganttRangeMs <= 0) return [];

    const ticks: { label: string; dateSpace: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const numDays = this.ganttRangeMs / dayMs;

    // Determine interval (1 day, 7 days, 30 days) based on zoom and range
    let interval = 1;
    if (numDays > 30) interval = 7;
    if (numDays > 180) interval = 30;

    // Adjust interval based on zoom - if zoomed in far, show more
    if (this.ganttZoom > 1000) interval = Math.max(1, Math.floor(interval / 2));
    if (this.ganttZoom > 2000) interval = 1;

    for (let i = 0; i <= numDays; i += interval) {
      const date = new Date(this.ganttStartMs + i * dayMs);
      ticks.push({
        label: (date.getMonth() + 1) + '/' + date.getDate(),
        dateSpace: (i * dayMs / this.ganttRangeMs) * 100
      });
    }

    // Always ensure the end date is there if not already
    const lastTick = ticks[ticks.length - 1];
    if (lastTick && lastTick.dateSpace < 95) {
      const endDate = new Date(this.ganttStartMs + this.ganttRangeMs);
      ticks.push({
        label: (endDate.getMonth() + 1) + '/' + endDate.getDate(),
        dateSpace: 100
      });
    }

    return ticks;
  }

  private getFullPath() {
    if (!this.workspace) return '';
    const sep = this.workspace.folderPath.includes('\\') ? '\\' : '/';
    return `${this.workspace.folderPath}${sep}${this.filePath}`;
  }
}
