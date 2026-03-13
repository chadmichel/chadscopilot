import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../chat/chat.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { PlanEngineService } from '../services/plan-engine.service';
import { PlanImportService } from '../services/plan-import.service';
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
            <button class="toolbar-btn" (click)="importProject()" title="Import MS Project (XML/MPP)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import
            </button>
            <button class="toolbar-btn" (click)="exportToXml()" title="Export MS Project XML">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
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
                  <div style="display: flex; gap: 4px;">
                    <button class="toolbar-btn" style="padding: 2px 8px; font-size: 11px;" (click)="addCommonHolidays()" title="Add Christmas, Thanksgiving, etc. for this year">Add Common</button>
                    <button class="toolbar-btn" style="padding: 2px 8px; font-size: 11px;" (click)="addHoliday()">+ Add</button>
                  </div>
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

              <div class="form-group" style="margin-top: 20px;">
                  <label for="durationLabel">Duration Column Label</label>
                  <input id="durationLabel" type="text" class="form-input" [(ngModel)]="plan.durationLabel" placeholder="Duration" (ngModelChange)="markDirty()" />
                </div>

                <div class="form-group" style="margin-top: 20px;">
                  <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: normal; text-transform: none; color: var(--app-text);">
                    <input type="checkbox" [(ngModel)]="plan.autoCalculate" (ngModelChange)="markDirty(); recalculateDates()" />
                    Auto-calculate Dates (Recalculate on every change)
                  </label>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                  <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: normal; text-transform: none; color: var(--app-text);">
                    <input type="checkbox" [(ngModel)]="plan.hideValueColumn" (ngModelChange)="markDirty(); recalculateDates()" />
                    Hide Value Column (Assume Duration)
                  </label>
                </div>
            </div>
          </div>
        </div>
      }

      <div class="builder-body">
        <div class="agent-side" [style.width.px]="agentSideWidth">
          <app-chat
            [workspaceId]="'plan-' + workspaceId"
            [folderPath]="workspace?.folderPath || ''"
            [contextProvider]="getPlanContext"
            [hideJson]="true"
            (fileSelected)="importProject($event)">
          </app-chat>
        </div>

        <div class="resizer-v" [class.resizing]="isResizingAgent" (mousedown)="startResizingAgent($event)"></div>

        <div class="editor-side">
          <div class="side-tabs">
            <button [class.active]="activeTab === 'activities'" (click)="activeTab = 'activities'">Activities</button>
            <button [class.active]="activeTab === 'gantt'" (click)="activeTab = 'gantt'">Gantt</button>
            <button [class.active]="activeTab === 'tracking'" (click)="activeTab = 'tracking'">Tracking</button>
            <button [class.active]="activeTab === 'ev'" (click)="activeTab = 'ev'">Earned Value</button>            
            <button [class.active]="activeTab === 'ev-chart'" (click)="activeTab = 'ev-chart'">EV Chart</button>
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
                  <button class="toolbar-btn toolbar-btn-secondary" (click)="resetTracking()" title="Reset all activity completion">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                    Reset Tracking
                  </button>
                </div>


                <div class="resources-section" [style.height.px]="resourcesHeight">
                  <div class="section-label">Resources ({{plan.resources.length}})</div>
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
                    @if (plan.resources.length === 0) {
                      <div class="empty-state">No resources defined. Add one to assign to activities.</div>
                    }
                  </div>
                </div>

                <div class="resizer-h" [class.resizing]="isResizingResources" (mousedown)="startResizingResources($event)"></div>

                <div class="activities-section">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div class="section-label" style="margin-bottom: 0;">Activities ({{plan.activities.length}})</div>
                    
                    <div class="activities-filters" style="display: flex; gap: 12px; padding: 6px 12px; background: var(--app-surface); border: 1px solid var(--app-border); border-radius: 8px; align-items: center;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 10px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase;">Resource:</label>
                        <select class="cell-input" style="width: 120px; font-size: 11px; height: 28px;" [(ngModel)]="activityFilterResource">
                          <option value="">All</option>
                          @for (res of plan.resources; track res.id) {
                            <option [value]="res.id">{{ res.name || 'Unnamed' }}</option>
                          }
                        </select>
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 10px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase;">Priority:</label>
                        <input type="number" class="cell-input" style="width: 50px; font-size: 11px; height: 28px;" [(ngModel)]="activityFilterPriority" placeholder="All" />
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <label style="font-size: 10px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase;">Duration:</label>
                        <input type="number" class="cell-input" style="width: 50px; font-size: 11px; height: 28px;" [(ngModel)]="activityFilterDuration" placeholder="All" />
                      </div>
                      <button class="toolbar-btn" style="padding: 2px 8px; font-size: 10px; height: 24px;" (click)="activityFilterResource = ''; activityFilterPriority = null; activityFilterDuration = null;">Clear</button>
                    </div>
                  </div>
                  <div class="table-wrapper">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Resource</th>
                           <th style="width:70px">Priority</th>
                           <th style="width:90px">{{ plan.durationLabel || 'Duration' }}</th>
                           @if (!plan.hideValueColumn) {
                             <th style="width:70px">Value</th>
                           }
                           <th style="width:130px">Start Date</th>
                           <th style="width:130px">End Date</th>
                           <th style="width:200px">Depends On</th>
                           <th style="width:60px">Float</th>
                           <th style="width:50px">Color</th>
                           <th style="width:50px"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (act of getVisibleActivities(); track act.id) {
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
                             @if (!plan.hideValueColumn) {
                               <td><input class="cell-input" type="number" [(ngModel)]="act.value" (ngModelChange)="markDirty()" placeholder="Auto" /></td>
                             }
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
                             <td>
                               <div class="float-cell" [class.is-critical]="act.criticalPath">
                                 {{ act.float | number:'1.0-1' }}d
                                 @if (act.criticalPath) {
                                   <span class="critical-badge" title="Critical Path">!</span>
                                 }
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
                    @if (plan.activities.length === 0) {
                      <div class="empty-state">No activities defined yet. Click "Add Activity" or ask the AI to generate some.</div>
                    }
                  </div>
                </div>
              </div>
            }

            @if (activeTab === 'gantt') {
              <div class="gantt-container" [class.orientation-vertical]="ganttOrientation === 'vertical'">
                <div class="gantt-toolbar">
                  <div class="zoom-controls">
                    <label>Orientation</label>
                    <div class="toggle-group" style="display: flex; gap: 4px; margin-right: 16px;">
                      <button class="nav-btn" [class.active]="ganttOrientation === 'horizontal'" (click)="ganttOrientation = 'horizontal'" title="Horizontal View">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="9" width="18" height="6" rx="1"/>
                        </svg>
                      </button>
                      <button class="nav-btn" [class.active]="ganttOrientation === 'vertical'" (click)="ganttOrientation = 'vertical'" title="Vertical View">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="3" width="6" height="18" rx="1"/>
                        </svg>
                      </button>
                    </div>
                    <label>Zoom</label>
                    <input type="range" min="100" max="3000" step="100" [(ngModel)]="ganttZoom" />
                    <span class="zoom-label">{{ ganttZoom }}%</span>
                  </div>
                </div>

                @if (plan.activities.length > 0) {
                  <div class="gantt-scroll-area">
                    <div class="gantt-header-row">
                      <div class="gantt-label-col">{{ ganttOrientation === 'horizontal' ? 'Resource' : '' }}</div>
                      <div class="gantt-bar-col" [style.min-width.px]="ganttOrientation === 'horizontal' ? 8 * ganttZoom : 'auto'" [style.min-height.px]="ganttOrientation === 'vertical' ? 8 * ganttZoom : 'auto'">
                        <div class="gantt-date-labels">
                          @for (tick of getGanttTicks(); track tick.dateSpace) {
                            <div class="gantt-date-tick" 
                                 [style.left.%]="ganttOrientation === 'horizontal' ? tick.dateSpace : 0"
                                 [style.top.%]="ganttOrientation === 'vertical' ? tick.dateSpace : 0">
                              {{ tick.label }}
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    <div class="gantt-body">
                      @for (row of getGanttRows(); track row.resourceName) {
                        <div class="gantt-row">
                          <div class="gantt-label-col clickable-resource" (click)="openResourceTasks(row.resourceName, row.activities)">{{ row.resourceName }}</div>
                          <div class="gantt-bar-col" [style.min-width.px]="ganttOrientation === 'horizontal' ? 8 * ganttZoom : 'auto'" [style.min-height.px]="ganttOrientation === 'vertical' ? 8 * ganttZoom : 'auto'">
                            <div class="gantt-grid-lines">
                              @for (tick of getGanttTicks(); track tick.dateSpace) {
                                <div class="gantt-v-line" 
                                     [style.left.%]="ganttOrientation === 'horizontal' ? tick.dateSpace : 0"
                                     [style.top.%]="ganttOrientation === 'vertical' ? tick.dateSpace : 0"></div>
                              }
                            </div>
                            @for (act of row.activities; track act.id) {
                              <div class="gantt-bar"
                                   [ngStyle]="getGanttBarStyles(act)"
                                   [class.critical-bar]="act.criticalPath"
                                   (click)="openActivityDetail(act)"
                                   [attr.title]="act.name + ' (' + act.startDate + ' to ' + act.endDate + ') - Float: ' + act.float + 'd'">
                                <span class="gantt-bar-text">{{ act.name }} ({{ act.durationDays }}d)</span>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
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
                        @for (ev of plan.earnedValue; track ev.date; let i = $index) {
                          <tr class="clickable-row" (click)="openEVDetails(i)">
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

            @if (activeTab === 'tracking') {
              <div class="tracking-container">
                <div class="filters-bar" style="display: flex; gap: 16px; margin-bottom: 20px; padding: 12px; background: var(--app-surface); border: 1px solid var(--app-border); border-radius: 8px; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 11px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase;">Resource:</label>
                    <select class="cell-input" style="width: 150px;" [(ngModel)]="trackingFilterResource">
                      <option value="">All Resources</option>
                      @for (res of plan.resources; track res.id) {
                        <option [value]="res.id">{{ res.name || 'Unnamed' }}</option>
                      }
                    </select>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 11px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase;">Status:</label>
                    <select class="cell-input" style="width: 150px;" [(ngModel)]="trackingFilterStatus">
                      <option value="all">All Statuses</option>
                      <option value="complete">Complete</option>
                      <option value="partial">Partial</option>
                      <option value="not-started">Not Started</option>
                    </select>
                  </div>
                  <div style="flex: 1;"></div>
                  <div style="font-size: 12px; color: var(--app-text-muted);">
                    Showing <strong>{{ getVisibleActivities().length }}</strong> of {{ plan.activities.length - 1 }}
                  </div>
                </div>
                <div class="table-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th style="width:150px">Resource</th>
                        <th style="width:280px">Status</th>
                        <th style="width:140px">Actual Start</th>
                        <th style="width:140px">Actual Finish</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (act of getVisibleActivities(); track act.id) {
                        <tr [class.is-complete]="!!act.actualFinishDate">
                          <td>{{ act.name }}</td>
                          <td>
                             <div style="font-size: 12px; font-weight: 500;">{{ act.resourceName || '--' }}</div>
                          </td>
                          <td>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                              <div style="display: flex; gap: 6px;">
                                <button class="status-btn" 
                                        [class.complete]="!!act.actualFinishDate"
                                        (click)="toggleActivityComplete(act)">
                                  Complete
                                </button>
                                <button class="partial-btn" (click)="openPartialDialog(act)">
                                  Partially Complete
                                </button>
                              </div>
                              <span class="progress-badge" [class.is-done]="act.percentComplete === 100">
                                {{ act.percentComplete || 0 }}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <input class="cell-input" 
                                   type="date" 
                                   [(ngModel)]="act.actualStartDate" 
                                   (ngModelChange)="markDirty()" />
                          </td>
                          <td>
                            <input class="cell-input" 
                                   type="date" 
                                   [(ngModel)]="act.actualFinishDate" 
                                   (ngModelChange)="onActualFinishDateChange()"
                                   [disabled]="!act.actualFinishDate" />
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (activeTab === 'ev-chart') {
              <div class="ev-chart-container">
                <div class="chart-filters" style="margin-bottom: 24px; padding: 16px; background: var(--app-surface); border: 1px solid var(--app-border); border-radius: 12px;">
                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <label style="font-size: 11px; font-weight: 700; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Include Resources in Chart:</label>
                      <div style="display: flex; gap: 8px;">
                        <button class="toolbar-btn" style="padding: 2px 8px; font-size: 10px;" (click)="selectAllEvResources()">All</button>
                        <button class="toolbar-btn" style="padding: 2px 8px; font-size: 10px;" (click)="evFilterResources = []">None</button>
                      </div>
                    </div>
                    <div class="resource-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                      @for (res of plan.resources; track res.id) {
                        <button class="tag-btn" 
                                [class.active]="evFilterResources.includes(res.id)"
                                (click)="toggleEvResource(res.id)">
                          {{ res.name || 'Unnamed' }}
                        </button>
                      }
                      <button class="tag-btn" 
                              [class.active]="evFilterResources.includes('unassigned')"
                              (click)="toggleEvResource('unassigned')">
                        Unassigned
                      </button>
                    </div>
                  </div>
                </div>
                <div class="chart-legend">
                  <div class="legend-item">
                    <span class="legend-color" style="background: var(--theme-primary)"></span>
                    <span>Projected %</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color" style="background: #f44336"></span>
                    <span>Actual %</span>
                  </div>
                </div>

                <div class="chart-wrapper">
                  <svg viewBox="0 0 800 400" preserveAspectRatio="none" class="chart-svg">
                    <!-- Grid Lines -->
                    @for (tick of [0, 25, 50, 75, 100]; track tick) {
                      <line x1="0" [attr.y1]="400 - (tick * 4)" x2="800" [attr.y2]="400 - (tick * 4)" class="chart-axis" style="opacity: 0.2; stroke-dasharray: 4" />
                      <text x="-35" [attr.y]="400 - (tick * 4) + 4" class="chart-text" style="font-size: 10px; fill: var(--app-text-muted)">{{ tick }}%</text>
                    }

                    <!-- X Axis Ticks -->
                    @for (tick of getEVChartTicks(); track tick.label) {
                      <line [attr.x1]="tick.x * 8" y1="400" [attr.x2]="tick.x * 8" y2="405" class="chart-axis" />
                      <text [attr.x]="tick.x * 8" y="420" class="chart-text" style="font-size: 10px; fill: var(--app-text-muted); text-anchor: middle">{{ tick.label }}</text>
                    }

                    <!-- Projected Line -->
                    <path [attr.d]="getEVChartPath('projected')" class="chart-line-projected" />
                    
                    <!-- Actual Line -->
                    <path [attr.d]="getEVChartPath('actual')" class="chart-line-actual" />

                    <!-- Interaction Layer -->
                    @if (plan.earnedValue.length > 1) {
                      @for (ev of plan.earnedValue; track ev.date; let i = $index) {
                        <rect 
                          [attr.x]="(i / (plan.earnedValue.length - 1)) * 800 - (800 / (plan.earnedValue.length - 1) / 2)"
                          y="0"
                          [attr.width]="800 / (plan.earnedValue.length - 1)"
                          height="400"
                          fill="transparent"
                          style="cursor: pointer;"
                          (click)="openEVDetails(i)"
                          class="chart-interaction-rect">
                          <title>{{ ev.date }} - Click for details</title>
                        </rect>
                      }
                    }
                  </svg>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    @if (showPartialDialog && currentPartialAct) {
      <div class="dialog-overlay" (click)="showPartialDialog = false">
        <div class="dialog" style="width: 450px;" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Partial Progress: {{ currentPartialAct.name }}</h3>
            <button class="dialog-close" (click)="showPartialDialog = false">&times;</button>
          </div>
          <div class="dialog-body">
            <p style="font-size: 13px; color: var(--app-text-muted); margin-bottom: 16px;">
              Track incremental progress milestones. The latest date's percentage will be used as the overall activity status.
            </p>
            <div class="partial-rows" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
              @for (row of tempPartialRows; track $index) {
                <div class="partial-row" style="display: flex; gap: 12px; align-items: center;">
                  <div style="flex: 1;">
                    <label style="font-size: 10px; text-transform: uppercase; color: var(--app-text-muted); display: block; margin-bottom: 4px;">Date</label>
                    <input type="date" [(ngModel)]="row.date" class="cell-input" />
                  </div>
                  <div style="width: 80px;">
                    <label style="font-size: 10px; text-transform: uppercase; color: var(--app-text-muted); display: block; margin-bottom: 4px;">% Done</label>
                    <input type="number" [(ngModel)]="row.percentComplete" class="cell-input" min="0" max="100" />
                  </div>
                  <button class="remove-btn" (click)="removePartialRow($index)" style="margin-top: 18px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              }
            </div>
            @if (tempPartialRows.length < 3) {
              <button class="add-row-btn" (click)="addPartialRow()" style="width: 100%; padding: 10px; border: 1px dashed var(--app-border); background: transparent; color: var(--theme-primary); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px;">
                + Add Progress Row
              </button>
            }
          </div>
          <div class="dialog-footer" style="padding: 16px 20px; border-top: 1px solid var(--app-border); display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn-cancel" (click)="showPartialDialog = false">Cancel</button>
            <button class="btn-confirm" (click)="savePartialProgress()">Save Progress</button>
          </div>
        </div>
      </div>
    }

    @if (showDetailDialog && currentDetailAct) {
      <div class="dialog-overlay" (click)="showDetailDialog = false">
        <div class="dialog" style="width: 500px;" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Activity Details</h3>
            <button class="dialog-close" (click)="showDetailDialog = false">&times;</button>
          </div>
          <div class="dialog-body">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="form-group">
                <label>Name</label>
                <input class="form-input" [(ngModel)]="currentDetailAct.name" />
              </div>

              <div style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label>Resource</label>
                  <select class="form-input" [(ngModel)]="currentDetailAct.resourceId">
                    <option value="">-- None --</option>
                    @for (res of plan.resources; track res.id) {
                      <option [value]="res.id">{{ res.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group" style="width: 100px;">
                  <label>Duration (d)</label>
                  <input type="number" class="form-input" [(ngModel)]="currentDetailAct.durationDays" min="0" />
                </div>
              </div>

              <div style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label>Priority</label>
                  <input type="number" class="form-input" [(ngModel)]="currentDetailAct.priority" />
                </div>
                @if (!plan.hideValueColumn) {
                  <div class="form-group" style="flex: 1;">
                    <label>Value</label>
                    <input type="number" class="form-input" [(ngModel)]="currentDetailAct.value" />
                  </div>
                }
                <div class="form-group">
                  <label>Color</label>
                  <input type="color" [(ngModel)]="currentDetailAct.color" class="color-picker" style="width: 100%; height: 38px;" />
                </div>
              </div>

              <div style="display: flex; gap: 16px;">
                <div class="form-group" style="flex: 1;">
                  <label>Actual Start Date</label>
                  <input type="date" class="form-input" [(ngModel)]="currentDetailAct.actualStartDate" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label>Actual Finish Date</label>
                  <input type="date" class="form-input" [(ngModel)]="currentDetailAct.actualFinishDate" />
                </div>
              </div>

              <div class="form-group">
                <label>Status (% Complete)</label>
                <input type="number" class="form-input" [(ngModel)]="currentDetailAct.percentComplete" min="0" max="100" />
              </div>

              <div style="padding: 12px; background: var(--app-background); border-radius: 8px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: var(--app-text-muted);">Calculated Start:</span>
                  <span style="font-family: monospace; font-weight: 600;">{{ currentDetailAct.startDate }}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--app-text-muted);">Calculated End:</span>
                  <span style="font-family: monospace; font-weight: 600;">{{ currentDetailAct.endDate }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="dialog-footer" style="padding: 16px 20px; border-top: 1px solid var(--app-border); display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn-cancel" (click)="showDetailDialog = false">Cancel</button>
            <button class="btn-confirm" (click)="saveActivityDetail()">Save Changes</button>
          </div>
        </div>
      </div>
    }

    @if (showEVDetailDialog && currentEVDetail) {
      <div class="dialog-overlay" (click)="showEVDetailDialog = false">
        <div class="dialog" style="width: 500px;" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <div style="display: flex; align-items: center; gap: 16px;">
              <h3 style="margin: 0;">Changes for {{ currentEVDetail.date }}</h3>
              <div style="display: flex; gap: 4px;">
                <button class="nav-btn" (click)="navigateEV(-1)" [disabled]="currentEVIndex <= 0" title="Previous Day">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <button class="nav-btn" (click)="navigateEV(1)" [disabled]="!plan.earnedValue || currentEVIndex >= plan.earnedValue.length - 1" title="Next Day">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </div>
            <button class="dialog-close" (click)="showEVDetailDialog = false">&times;</button>
          </div>
          <div class="dialog-body" style="max-height: 500px; overflow: auto;">
            <div style="display: flex; flex-direction: column; gap: 20px;">
              
              <!-- Planned Contribution -->
              <section>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                  <span style="width: 12px; height: 12px; border-radius: 3px; background: var(--theme-primary);"></span>
                  <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--app-text);">Planned Work</h4>
                </div>
                <div class="detail-list" style="display: flex; flex-direction: column; gap: 6px;">
                  @for (item of currentEVDetail.plannedContributions; track item.id) {
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--app-background); border: 1px solid var(--app-border); border-radius: 6px;">
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 13px; font-weight: 600;">{{ item.name }}</span>
                        <span style="font-size: 11px; color: var(--app-text-muted);">Resource: {{ item.resourceName || '--' }}</span>
                      </div>
                      <div style="text-align: right;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--theme-primary);">+{{ item.valueContribution | number:'1.1-2' }}%</span>
                      </div>
                    </div>
                  }
                  @if (currentEVDetail.plannedContributions.length === 0) {
                    <div style="font-size: 12px; color: var(--app-text-muted); text-align: center; padding: 10px;">No work planned for this day.</div>
                  }
                </div>
              </section>

              <!-- Earned Contribution -->
              <section>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                  <span style="width: 12px; height: 12px; border-radius: 3px; background: #f44336;"></span>
                  <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--app-text);">Earned Value (Finished)</h4>
                </div>
                <div class="detail-list" style="display: flex; flex-direction: column; gap: 6px;">
                  @for (item of currentEVDetail.earnedContributions; track item.id) {
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--app-background); border: 1px solid var(--app-border); border-radius: 6px;">
                      <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 13px; font-weight: 600;">{{ item.name }}</span>
                        <span style="font-size: 11px; color: var(--app-text-muted);">Resource: {{ item.resourceName || '--' }}</span>
                      </div>
                      <div style="text-align: right;">
                        <span style="font-size: 12px; font-weight: 700; color: #f44336;">+{{ item.valueContribution | number:'1.1-2' }}%</span>
                      </div>
                    </div>
                  }
                  @if (currentEVDetail.earnedContributions.length === 0) {
                    <div style="font-size: 12px; color: var(--app-text-muted); text-align: center; padding: 10px;">No activities finished on this day.</div>
                  }
                </div>
              </section>

              <div style="margin-top: 10px; padding-top: 16px; border-top: 1px solid var(--app-border); display: flex; justify-content: space-between;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 11px; color: var(--app-text-muted); text-transform: uppercase;">Total Projected</span>
                  <span style="font-size: 16px; font-weight: 700; color: var(--app-text);">{{ currentEVDetail.projectedTotalPercent | number:'1.1-1' }}%</span>
                </div>
                <div style="display: flex; flex-direction: column; text-align: right;">
                  <span style="font-size: 11px; color: var(--app-text-muted); text-transform: uppercase;">Total Actual</span>
                  <span style="font-size: 16px; font-weight: 700; color: var(--app-text);">{{ currentEVDetail.actualTotalPercent | number:'1.1-1' }}%</span>
                </div>
              </div>
            </div>
          </div>
          <div class="dialog-footer" style="padding: 16px 20px; border-top: 1px solid var(--app-border); display: flex; justify-content: flex-end;">
            <button class="btn-confirm" (click)="showEVDetailDialog = false">Close</button>
          </div>
        </div>
      </div>
    }
    @if (showResourceTasksDialog && currentResourceTasks) {
      <div class="dialog-overlay" (click)="showResourceTasksDialog = false">
        <div class="dialog" style="width: 700px;" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Tasks for {{ currentResourceName }}</h3>
            <button class="dialog-close" (click)="showResourceTasksDialog = false">&times;</button>
          </div>
          <div class="dialog-body" style="max-height: 500px; overflow-y: auto; padding: 0;">
            <table class="data-table">
              <thead style="position: sticky; top: 0; background: var(--app-surface); z-index: 1;">
                <tr>
                  <th style="text-align: left; padding: 12px 16px;">Task Name</th>
                  <th style="width: 100px; text-align: left; padding: 12px 16px;">Start Date</th>
                  <th style="width: 100px; text-align: left; padding: 12px 16px;">End Date</th>
                  <th style="width: 80px; text-align: right; padding: 12px 16px;">Dur.</th>
                  <th style="width: 100px; text-align: left; padding: 12px 16px;">Act. Start</th>
                  <th style="width: 100px; text-align: left; padding: 12px 16px;">Act. Finish</th>
                </tr>
              </thead>
              <tbody>
                @for (task of currentResourceTasks; track task.id) {
                  <tr>
                    <td style="padding: 12px 16px;">{{ task.name }}</td>
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 11px;">{{ task.startDate }}</td>
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 11px;">{{ task.endDate }}</td>
                    <td style="padding: 12px 16px; text-align: right;">{{ task.durationDays }}d</td>
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 11px; color: var(--theme-primary);">{{ task.actualStartDate || '-' }}</td>
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 11px; color: var(--theme-primary);">{{ task.actualFinishDate || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="dialog-footer">
            <button class="btn-confirm" (click)="showResourceTasksDialog = false">Close</button>
          </div>
        </div>
      </div>
    }
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
      flex-shrink: 0;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      min-width: 200px;
    }

    .resizer-v {
      width: 4px;
      cursor: col-resize;
      background: transparent;
      transition: background 0.2s;
      z-index: 10;
      flex-shrink: 0;
    }

    .resizer-v:hover, .resizer-v.resizing {
      background: var(--theme-primary);
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
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden; /* Let internal sections handle scroll */
    }

    .resources-section, .activities-section {
      display: flex;
      flex-direction: column;
      min-height: 100px;
      overflow: hidden;
    }

    .activities-section {
      flex: 1;
    }

    .resizer-h {
      height: 6px;
      cursor: row-resize;
      background: var(--app-border);
      margin: 4px 0;
      border-radius: 3px;
      transition: background 0.2s, height 0.2s;
      flex-shrink: 0;
      width: 100%;
    }

    .resizer-h:hover, .resizer-h.resizing {
      background: var(--theme-primary);
      height: 8px;
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
    .toolbar-btn-secondary {
      background: transparent;
      opacity: 0.8;
      border-style: dashed;
    }
    .toolbar-btn-secondary:hover {
      opacity: 1;
      border-style: solid;
      background: color-mix(in srgb, var(--theme-primary), transparent 95%);
    }

    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      color: var(--app-text-muted);
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
    }

    .nav-btn:hover:not(:disabled) {
      background: var(--app-surface);
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }

    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
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
      flex: 1;
      overflow: auto;
      min-height: 0;
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

    .clickable-row {
      cursor: pointer;
      transition: background 0.1s;
    }
    .clickable-row:hover {
      background: var(--app-surface);
    }
    .clickable-row:active {
      background: color-mix(in srgb, var(--theme-primary), transparent 90%);
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
      height: 48px; /* Increased from 28px */
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
      top: 6px;
      height: 36px; /* Increased from 20px */
      background: color-mix(in srgb, var(--theme-primary), transparent 20%);
      border: 1px solid var(--theme-primary);
      border-radius: 6px;
      min-width: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: left 0.2s, width 0.2s;
      overflow: hidden;
      white-space: normal; /* Allow wrap */
      padding: 0 4px;
      z-index: 1;
      cursor: pointer;
    }
    
    .gantt-bar:hover {
      z-index: 10;
      background: var(--theme-primary);
    }

    /* Vertical Orientation */
    .orientation-vertical .gantt-scroll-area {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
      overflow-y: auto;
      padding: 0;
      position: relative;
    }
    .orientation-vertical .gantt-header-row {
      display: flex;
      flex-direction: column;
      width: 80px;
      flex-shrink: 0;
      border-right: 1px solid var(--app-border);
      background: var(--app-surface);
      position: sticky;
      left: 0;
      z-index: 20;
      margin: 0;
      padding: 0;
      border-bottom: none;
    }
    .orientation-vertical .gantt-body {
      display: flex;
      flex-direction: row;
      flex: 1;
    }
    .orientation-vertical .gantt-row {
      display: flex;
      flex-direction: column;
      width: 140px;
      flex-shrink: 0;
      margin: 0;
      border-right: 1px solid var(--app-border);
      border-bottom: none;
      min-width: auto;
      align-items: stretch;
      min-height: 100%;
    }
    .orientation-vertical .gantt-label-col {
      width: 100%;
      height: 48px;
      position: sticky;
      top: 0;
      left: auto;
      z-index: 10;
      background: var(--app-surface);
      border-bottom: 1px solid var(--app-border);
      border-right: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      font-size: 11px;
    }
    .orientation-vertical .gantt-header-row .gantt-label-col {
      height: 48px;
      background: var(--app-surface);
      border-bottom: 1px solid var(--app-border);
      z-index: 25;
    }
    .orientation-vertical .gantt-bar-col {
      width: 100%;
      border-radius: 0;
      background: transparent;
      flex: 1;
    }
    .orientation-vertical .gantt-date-labels {
      height: 100%;
      width: 100%;
    }
    .orientation-vertical .gantt-date-tick {
      left: 0;
      width: 100%;
      transform: translateY(-50%);
      text-align: right;
      padding-right: 8px;
      font-size: 9px;
    }
    .orientation-vertical .gantt-v-line {
      top: auto;
      bottom: auto;
      left: 0;
      right: 0;
      width: 100%;
      height: 1px;
    }
    .orientation-vertical .gantt-bar {
      left: 10%;
      width: 80%;
      flex-direction: column;
      padding: 4px 2px;
      transition: top 0.2s, height 0.2s;
    }
    .orientation-vertical .gantt-bar-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      white-space: nowrap;
      font-size: 10px;
    }

    .gantt-bar-text {
      font-size: 10px;
      font-weight: 700;
      color: white;
      line-height: 1.1;
      text-align: center;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
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

    .float-cell {
      font-size: 11px;
      font-weight: 600;
      color: var(--app-text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .float-cell.is-critical {
      color: #f44336;
    }
    .critical-badge {
      background: #f44336;
      color: white;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: bold;
    }
    .critical-bar {
      border: 2px solid #f44336 !important;
      box-shadow: 0 0 8px rgba(244, 67, 54, 0.4);
    }
    .gantt-bar-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
      font-size: 10px;
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

    .clickable-resource {
      cursor: pointer;
      color: var(--theme-primary);
      text-decoration: underline;
      text-decoration-color: transparent;
      transition: all 0.2s;
    }
    .clickable-resource:hover {
      text-decoration-color: var(--theme-primary);
      background: color-mix(in srgb, var(--theme-primary), transparent 95%);
    }

    /* Dialog and Form Styling */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .dialog-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--app-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--app-text);
      letter-spacing: -0.5px;
    }

    .dialog-close {
      background: transparent;
      border: none;
      color: var(--app-text-muted);
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      border-radius: 50%;
      height: 32px;
      width: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .dialog-close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--app-text);
    }

    .dialog-body {
      padding: 24px;
      overflow-y: auto;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .form-input {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      color: var(--app-text);
      transition: all 0.2s;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: var(--theme-primary);
      background: #fff;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-primary), transparent 85%);
    }

    .color-picker {
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
    }

    .dialog-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--app-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-cancel {
      padding: 10px 20px;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      background: #fff;
      color: #475569;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-confirm {
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      background: var(--theme-primary);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-primary), transparent 70%);
    }

    .btn-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px color-mix(in srgb, var(--theme-primary), transparent 60%);
    }

    .tag-btn {
      padding: 6px 14px;
      background: var(--app-background);
      color: var(--app-text-muted);
      border: 1px solid var(--app-border);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tag-btn:hover {
      border-color: var(--theme-primary);
      color: var(--app-text);
    }
    .tag-btn.active {
      background: var(--theme-primary);
      color: white;
      border-color: var(--theme-primary);
      box-shadow: 0 4px 12px rgba(var(--theme-primary-rgb, 0,0,0), 0.3);
    }

    /* Earned Value tab */
    .ev-container, .tracking-container {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }
    .status-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--app-border);
      background: var(--app-surface);
      color: var(--app-text);
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .status-btn:hover {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }
    .status-btn.complete {
      background: var(--theme-primary);
      color: white;
      border-color: var(--theme-primary);
    }
    .chart-interaction-rect:hover {
      fill: rgba(255, 255, 255, 0.05);
    }
    .is-complete {
      background: color-mix(in srgb, var(--theme-primary), transparent 95%);
    }
    .partial-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--app-border);
      background: var(--app-background);
      color: var(--theme-primary);
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .partial-btn:hover {
      background: color-mix(in srgb, var(--theme-primary), transparent 90%);
      border-color: var(--theme-primary);
    }
    .progress-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      color: var(--app-text-muted);
      min-width: 36px;
      text-align: center;
    }
    .progress-badge.is-done {
      background: var(--theme-primary);
      color: white;
      border-color: var(--theme-primary);
    }
      /* Earned Value Chart */
    .ev-chart-container {
      flex: 1;
      padding: 40px 60px 60px 60px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow: hidden;
      background: var(--app-background);
    }
    .chart-wrapper {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 20px;
      flex: 1;
      position: relative;
      min-height: 0;
    }
    .chart-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .chart-axis {
      stroke: var(--app-border);
      stroke-width: 1;
    }
    .chart-line-projected {
      fill: none;
      stroke: var(--theme-primary);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .chart-line-actual {
      fill: none;
      stroke: #f44336;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .chart-legend {
      display: flex;
      gap: 32px;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--app-text);
    }
    .legend-color {
      width: 14px;
      height: 14px;
      border-radius: 4px;
    }
    .chart-text {
      font-family: inherit;
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
    holidays: this.getCommonHolidays(new Date().getFullYear()),
    autoCalculate: true,
  };
  isDirty = false;
  showSettings = false;
  activeTab: 'activities' | 'gantt' | 'ev' | 'ev-chart' | 'tracking' = 'activities';
  ganttMinDate = '';
  ganttMaxDate = '';
  ganttZoom = 100;
  ganttOrientation: 'horizontal' | 'vertical' = 'horizontal';
  resourcesHeight = 200;
  isResizingResources = false;
  private resizeStartY = 0;
  private resizeStartHeight = 0;
  private ganttRangeMs = 1;
  private ganttStartMs = 0;
  private chatSub?: Subscription;
  private saveSubject = new Subject<void>();

  showPartialDialog = false;
  currentPartialAct: PlanActivity | null = null;
  tempPartialRows: { date: string; percentComplete: number }[] = [];

  trackingFilterResource = '';
  trackingFilterStatus: 'all' | 'complete' | 'partial' | 'not-started' = 'all';

  activityFilterResource = '';
  activityFilterPriority: number | null = null;
  activityFilterDuration: number | null = null;

  agentSideWidth = 400;
  isResizingAgent = false;

  showDetailDialog = false;
  currentDetailAct: PlanActivity | null = null;
  
  showResourceTasksDialog = false;
  currentResourceTasks: PlanActivity[] = [];
  currentResourceName = '';

  evFilterResources: string[] = []; // Array of selected resource IDs

  showEVDetailDialog = false;
  currentEVIndex = -1;
  currentEVDetail: {
    date: string;
    plannedContributions: { id: string, name: string, resourceName: string, valueContribution: number }[];
    earnedContributions: { id: string, name: string, resourceName: string, valueContribution: number }[];
    projectedTotalPercent: number;
    actualTotalPercent: number;
  } | null = null;

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isResizingResources) {
      const deltaY = event.clientY - this.resizeStartY;
      this.resourcesHeight = Math.max(80, this.resizeStartHeight + deltaY);
    }
    if (this.isResizingAgent) {
      this.agentSideWidth = Math.max(200, Math.min(window.innerWidth - 300, event.clientX));
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isResizingResources = false;
    this.isResizingAgent = false;
  }

  startResizingAgent(event: MouseEvent) {
    this.isResizingAgent = true;
    event.preventDefault();
  }

  startResizingResources(event: MouseEvent) {
    this.isResizingResources = true;
    this.resizeStartY = event.clientY;
    this.resizeStartHeight = this.resourcesHeight;
    event.preventDefault();
  }

  toggleEvResource(id: string) {
    const idx = this.evFilterResources.indexOf(id);
    if (idx === -1) {
      this.evFilterResources.push(id);
    } else {
      this.evFilterResources.splice(idx, 1);
    }
  }

  selectAllEvResources() {
    this.evFilterResources = [
      ...this.plan.resources.map(r => r.id),
      'unassigned'
    ];
  }

  getPlanContext = (): string => {
    const json = JSON.stringify(this.plan, null, 2);
    return `You are a project planning assistant. Here is the current plan:\n\`\`\`json\n${json}\n\`\`\`\n\nExplain what you are changing in plain text first, then ALWAYS end your response with the FULL updated plan JSON inside a single \`\`\`json code block. The JSON must have "startDate", "resources", "activities", "earnedValue", "workWeek", and "holidays" arrays. Activity start and end dates are automatically calculated. Each resource has: id, name, allocation (number 0-1), daysOff[]. Each activity has: id, name, resourceId, resourceName, durationDays, priority (higher is more important), dependsOn (string[] of activity ids), color (hex string), optional "value" (numeric), "percentComplete" (0-100), and "actualFinishDate" (YYYY-MM-DD). "workWeek" is an array of 7 numbers (0-1) for Sun-Sat. "holidays" is a string array of YYYY-MM-DD. "hideValueColumn" is a boolean that hides the Value column in the UI and forces calculations to use duration. "durationLabel" is an optional string to relabel the Duration column header. Do not try to modify read-only properties like "float", "criticalPath", or the "earnedValue" array. Also, an activity with id "finish" is automatically managed and should not be manually removed or edited in its dependencies. Setting "actualFinishDate" is what calculates the "Actual Earned Value" in the project.`;
  };

  private get electron() { return (window as any).electronAPI; }

  constructor(
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService,
    private chatService: ChatService,
    private planEngine: PlanEngineService,
    private planImport: PlanImportService,
    private el: ElementRef
  ) {
    this.workspaceService.loadWorkspaces();
    this.saveSubject.pipe(debounceTime(1000)).subscribe(() => {
      this.saveFile();
    });
  }

  async importProject(existingFilePath?: string): Promise<void> {
    let file = existingFilePath;
    if (!file) {
      const selected = await this.chatService.selectFile([
        { name: 'MS Project Files (MPP, XML)', extensions: ['mpp', 'xml'] },
        { name: 'All Files', extensions: ['*'] }
      ]);
      file = selected || undefined;
    }

    if (!file) return;

    let finalPath = file;
    let isJson = file.toLowerCase().endsWith('.json');
    let isXml = file.toLowerCase().endsWith('.xml');

    if (file.toLowerCase().endsWith('.mpp')) {
      alert('Converting MPP for processing... This might take a few seconds.');
      const result = await this.chatService.convertMppToXml(file);
      if (!result.success || !result.xmlPath) {
        alert('Failed to convert MPP: ' + result.error);
        return;
      }
      // User specifically asked to convert to XML then import the XML
      finalPath = result.xmlPath;
      isXml = true;
      isJson = false;
    }

    const content = await this.chatService.readFile(finalPath);
    if (!content) {
      alert('Failed to read file: ' + finalPath);
      return;
    }

    try {
      let importedData;
      if (isJson) {
        importedData = this.planImport.parseMpxjJson(content);
      } else {
        // This handles both direct XML files and the XML generated from MPP
        importedData = this.planImport.parseMspdiXml(content);
      }

      // Basic merge/replace logic
      if (confirm(`Imported project with ${importedData.activities.length} activities and ${importedData.resources.length} resources. Replace current plan?`)) {
        this.plan = {
          ...this.plan,
          startDate: importedData.startDate,
          resources: importedData.resources,
          activities: importedData.activities,
          autoCalculate: false // Disable auto-calculate on import by default
        };
        this.markDirty();
        this.recalculateDates();
      }
    } catch (err: any) {
      console.error(err);
      alert('Error parsing data: ' + err.message);
    }
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
        this.selectAllEvResources();
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
    this.ensureFinishActivity();
    this.planEngine.calculate(this.plan);
    this.computeGanttRange();
  }

  private ensureFinishActivity() {
    let finish = this.plan.activities.find(a => a.id === 'finish');
    if (!finish) {
      finish = {
        id: 'finish',
        name: 'FINISH',
        resourceId: '',
        resourceName: '',
        durationDays: 0,
        startDate: '',
        endDate: '',
        dependsOn: [],
        priority: -100,
        color: '#f44336'
      };
      this.plan.activities.push(finish);
    }

    const otherIds = this.plan.activities
      .filter(a => a.id !== 'finish')
      .map(a => a.id);

    finish.dependsOn = [...otherIds];
  }

  getVisibleActivities(): PlanActivity[] {
    let activities = this.plan.activities.filter(a => a.id !== 'finish');

    if (this.activeTab === 'tracking') {
      // Apply Resource Filter
      if (this.trackingFilterResource) {
        activities = activities.filter(a => a.resourceId === this.trackingFilterResource);
      }

      // Apply Status Filter
      if (this.trackingFilterStatus !== 'all') {
        activities = activities.filter(a => {
          const pct = a.percentComplete || 0;
          if (this.trackingFilterStatus === 'complete') return pct === 100 && !!a.actualFinishDate;
          if (this.trackingFilterStatus === 'partial') return pct > 0 && pct < 100;
          if (this.trackingFilterStatus === 'not-started') return pct === 0 && !a.actualFinishDate;
          return true;
        });
      }
    } else if (this.activeTab === 'activities') {
      if (this.activityFilterResource) {
        activities = activities.filter(a => a.resourceId === this.activityFilterResource);
      }
      if (this.activityFilterPriority !== null) {
        activities = activities.filter(a => a.priority === this.activityFilterPriority);
      }
      if (this.activityFilterDuration !== null) {
        activities = activities.filter(a => a.durationDays === this.activityFilterDuration);
      }
    }

    return activities;
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

  isMarkingInProgress = false;
  toggleActivityComplete(act: PlanActivity) {
    if (act.actualFinishDate) {
      act.actualFinishDate = undefined;
      act.percentComplete = 0;
    } else {
      act.actualFinishDate = new Date().toISOString().split('T')[0];
      act.percentComplete = 100;
    }
    this.markDirty();
    this.recalculateDates();
  }

  resetTracking() {
    if (!confirm('Are you sure you want to reset all tracking? This will set all activities to 0% complete and recalculate dates.')) return;

    for (const act of this.plan.activities) {
      act.percentComplete = 0;
      act.actualFinishDate = undefined;
    }

    this.markDirty();
    this.recalculateDates();
  }

  addCommonHolidays() {
    const year = this.plan.startDate ? new Date(this.plan.startDate).getFullYear() : new Date().getFullYear();
    const common = this.getCommonHolidays(year);
    const existing = new Set(this.plan.holidays || []);

    let added = 0;
    const currentHolidays = [...(this.plan.holidays || [])];
    for (const h of common) {
      if (!existing.has(h)) {
        currentHolidays.push(h);
        existing.add(h);
        added++;
      }
    }

    if (added > 0) {
      this.plan.holidays = currentHolidays.sort();
      this.markDirty();
    }
  }

  async exportToXml() {
    const defaultName = (this.route.snapshot.queryParamMap.get('filePath') || 'export').split('/').pop()?.replace('.json', '') || 'my-project';
    const { filePath } = await this.electron.showSaveDialog({
      title: 'Export to MS Project XML',
      defaultPath: `${defaultName}.xml`,
      filters: [{ name: 'MS Project XML', extensions: ['xml'] }]
    });

    if (filePath) {
      const result = await this.electron.exportMppXml(JSON.stringify(this.plan), filePath);
      if (result.success) {
        alert('Export successful: ' + filePath);
      } else {
        alert('Export failed: ' + result.error);
      }
    }
  }

  openPartialDialog(act: PlanActivity) {
    this.currentPartialAct = act;
    this.tempPartialRows = act.partialProgress ? JSON.parse(JSON.stringify(act.partialProgress)) : [];
    this.showPartialDialog = true;
  }

  addPartialRow() {
    if (this.tempPartialRows.length >= 3) return;
    this.tempPartialRows.push({ date: new Date().toISOString().split('T')[0], percentComplete: 0 });
  }

  removePartialRow(index: number) {
    this.tempPartialRows.splice(index, 1);
  }

  savePartialProgress() {
    if (!this.currentPartialAct) return;
    this.currentPartialAct.partialProgress = this.tempPartialRows;

    // Update overall percent complete if rows exist
    if (this.tempPartialRows.length > 0) {
      const sorted = [...this.tempPartialRows].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      this.currentPartialAct.percentComplete = latest.percentComplete;

      // Auto-manage actualFinishDate based on percentage
      if (latest.percentComplete === 100) {
        this.currentPartialAct.actualFinishDate = latest.date;
      } else {
        this.currentPartialAct.actualFinishDate = undefined;
      }
    }

    this.markDirty();
    this.recalculateDates();
    this.showPartialDialog = false;
  }

  onActualFinishDateChange() {
    this.markDirty();
    this.recalculateDates();
  }

  openActivityDetail(act: PlanActivity) {
    this.currentDetailAct = JSON.parse(JSON.stringify(act)); // Edit a copy
    this.showDetailDialog = true;
  }

  openResourceTasks(resourceName: string, activities: PlanActivity[]) {
    this.currentResourceName = resourceName;
    this.currentResourceTasks = activities;
    this.showResourceTasksDialog = true;
  }

  saveActivityDetail() {
    if (!this.currentDetailAct) return;
    const index = this.plan.activities.findIndex(a => a.id === this.currentDetailAct!.id);
    if (index !== -1) {
      this.plan.activities[index] = this.currentDetailAct;
      this.onResourceSelect(this.plan.activities[index]);
      this.markDirty();
      this.recalculateDates();
    }
    this.showDetailDialog = false;
  }

  getAvailableDependencies(act: PlanActivity): PlanActivity[] {
    return this.plan.activities.filter(a => a.id !== act.id && a.id !== 'finish' && !act.dependsOn.includes(a.id));
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

  getGanttBarStyles(act: PlanActivity): any {
    const leftOrTop = this.getBarLeft(act);
    const widthOrHeight = this.getBarWidth(act);
    
    if (this.ganttOrientation === 'vertical') {
      return {
        'top': leftOrTop + '%',
        'height': widthOrHeight + '%',
        'left': '10%',
        'width': '80%',
        'background-color': act.color || '#4db6ac',
        'border-color': act.criticalPath ? '#f44336' : (act.color || '#4db6ac'),
        'position': 'absolute'
      };
    } else {
      return {
        'left': leftOrTop + '%',
        'width': widthOrHeight + '%',
        'background-color': act.color || '#4db6ac',
        'border-color': act.criticalPath ? '#f44336' : (act.color || '#4db6ac'),
        'position': 'absolute'
      };
    }
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

  getEVChartPath(type: 'projected' | 'actual'): string {
    const evs = this.plan.earnedValue || [];
    if (evs.length === 0) return '';

    const width = 800;
    const height = 400;
    const points: string[] = [];

    // Filter logic for multi-resource selection
    let dataEntries = evs;
    
    // Check if we are filtering. If all project resources + unassigned are selected, we can skip complex filter.
    // However, it's safer to always filter if anything is NOT selected.
    const allIds = [...this.plan.resources.map(r => r.id), 'unassigned'];
    const isFiltering = this.evFilterResources.length < allIds.length;

    if (isFiltering) {
      const activities = this.plan.activities.filter(a => {
        const rid = a.resourceId || 'unassigned';
        return this.evFilterResources.includes(rid);
      });
      
      const totalVal = activities.reduce((sum, a) => sum + (this.plan.hideValueColumn ? (a.durationDays || 0.1) : (a.value ?? a.durationDays ?? 0.1)), 0);
      
      if (totalVal === 0) return ''; // No activities for selected resources

      // Calculate cumulative values per date
      let cumulativeProjected = 0;
      let cumulativeActual = 0;
      
      const dailyProjected = new Map<string, number>();
      activities.forEach(act => {
        const val = this.plan.hideValueColumn ? (act.durationDays || 0.1) : (act.value ?? act.durationDays ?? 0.1);
        if (!act.startDate || !act.endDate) return;

        const startMs = new Date(act.startDate).getTime();
        const endMs = new Date(act.endDate).getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        
        const workDays: string[] = [];
        let tempMs = startMs;
        const workWeek = this.plan.workWeek || [0, 1, 1, 1, 1, 1, 0];
        const resource = this.plan.resources.find(r => r.id === act.resourceId);

        while (tempMs < endMs) {
          const d = new Date(tempMs);
          const isoDate = d.toISOString().split('T')[0];
          const dayOfWeek = d.getDay();
          let isWorkDay = workWeek[dayOfWeek] > 0;
          if (this.plan.holidays?.includes(isoDate)) isWorkDay = false;
          if (resource?.daysOff?.includes(isoDate)) isWorkDay = false;
          if (isWorkDay) workDays.push(isoDate);
          tempMs += dayMs;
        }

        if (workDays.length > 0) {
          const valPerDay = val / workDays.length;
          workDays.forEach(d => dailyProjected.set(d, (dailyProjected.get(d) || 0) + valPerDay));
        } else {
          const finishDateStr = new Date(endMs - dayMs).toISOString().split('T')[0];
          dailyProjected.set(finishDateStr, (dailyProjected.get(finishDateStr) || 0) + val);
        }
      });

      dataEntries = evs.map(entry => {
        cumulativeProjected += dailyProjected.get(entry.date) || 0;
        
        // Sum actuals for selected activities on this date
        activities.forEach(a => {
          if (a.actualFinishDate === entry.date) {
            cumulativeActual += (this.plan.hideValueColumn ? (a.durationDays || 0.1) : (a.value ?? a.durationDays ?? 0.1));
          }
        });

        return {
          ...entry,
          projectedPercent: (cumulativeProjected / totalVal) * 100,
          actualPercent: (cumulativeActual / totalVal) * 100
        };
      });
    }

    // For actuals, we only want to draw up to the last entry that has an actual percentage or is not in the future relative to "today"
    let lastValidIdx = -1;
    if (type === 'actual') {
      for (let i = dataEntries.length - 1; i >= 0; i--) {
        const ent = dataEntries[i];
        if (ent.actualPercent > 0 || ent.activitiesWorked?.length > 0 || ent.activitiesFinished?.length > 0) {
          lastValidIdx = i;
          break;
        }
      }
      if (lastValidIdx === -1) return '';
    }

    dataEntries.forEach((ev, i) => {
      if (type === 'actual' && i > lastValidIdx) return;

      const x = (i / (dataEntries.length - 1)) * width;
      const percent = type === 'projected' ? ev.projectedPercent : ev.actualPercent;
      const y = height - (Math.min(100, percent) / 100) * height;
      points.push(`${x},${y}`);
    });

    if (points.length < 2) return '';
    return 'M ' + points.join(' L ');
  }

  getEVChartTicks() {
    const evs = this.plan.earnedValue || [];
    if (evs.length === 0) return [];

    const ticks: { x: number, label: string }[] = [];
    const count = evs.length;
    const skip = Math.max(1, Math.floor(count / 8));

    evs.forEach((ev, i) => {
      if (i % skip === 0 || i === count - 1) {
        const d = new Date(ev.date);
        ticks.push({
          x: (i / (count - 1)) * 100,
          label: (d.getMonth() + 1) + '/' + d.getDate()
        });
      }
    });
    return ticks;
  }

  openEVDetails(index: number) {
    const evs = this.plan.earnedValue || [];
    if (index < 0 || index >= evs.length) return;

    const entry = evs[index];
    const allIds = [...this.plan.resources.map(r => r.id), 'unassigned'];
    const isFiltering = this.evFilterResources.length < allIds.length;

    // Filter focus
    const filteredActivities = this.plan.activities.filter(a => {
      const rid = a.resourceId || 'unassigned';
      return isFiltering ? this.evFilterResources.includes(rid) : true;
    });

    const totalVal = filteredActivities.reduce((sum, a) => sum + (this.plan.hideValueColumn ? (a.durationDays || 0.1) : (a.value ?? a.durationDays ?? 0.1)), 0);
    if (totalVal === 0) return;

    // Planned contributions for this day
    const planned: any[] = [];
    filteredActivities.forEach(act => {
      if (!act.startDate || !act.endDate) return;
      const startMs = new Date(act.startDate).getTime();
      const endMs = new Date(act.endDate).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const workDays: string[] = [];
      let tempMs = startMs;
      const workWeek = this.plan.workWeek || [0, 1, 1, 1, 1, 1, 0];
      const resource = this.plan.resources.find(r => r.id === act.resourceId);

      while (tempMs < endMs) {
        const d = new Date(tempMs);
        const isoDate = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        let isWorkDay = workWeek[dayOfWeek] > 0;
        if (this.plan.holidays?.includes(isoDate)) isWorkDay = false;
        if (resource?.daysOff?.includes(isoDate)) isWorkDay = false;
        if (isWorkDay) workDays.push(isoDate);
        tempMs += dayMs;
      }

      const val = this.plan.hideValueColumn ? (act.durationDays || 0.1) : (act.value ?? act.durationDays ?? 0.1);
      if (workDays.includes(entry.date)) {
        planned.push({
          id: act.id,
          name: act.name,
          resourceName: act.resourceName,
          valueContribution: (val / workDays.length / totalVal) * 100
        });
      } else if (workDays.length === 0) {
        // Milestone or non-work day?
        const finishDateStr = new Date(endMs - dayMs).toISOString().split('T')[0];
        if (finishDateStr === entry.date) {
           planned.push({
             id: act.id,
             name: act.name,
             resourceName: act.resourceName,
             valueContribution: (val / totalVal) * 100
           });
        }
      }
    });

    // Earned contributions (finished on this day)
    const earned: any[] = [];
    filteredActivities.forEach(act => {
      if (act.actualFinishDate === entry.date) {
        const val = this.plan.hideValueColumn ? (act.durationDays || 0.1) : (act.value ?? act.durationDays ?? 0.1);
        earned.push({
          id: act.id,
          name: act.name,
          resourceName: act.resourceName,
          valueContribution: (val / totalVal) * 100
        });
      }
    });

    // We need to calculate cumulative percentages up to this day for the summary
    let cumulativeProjectedVal = 0;
    let cumulativeActualVal = 0;

    for(let i = 0; i <= index; i++) {
        const d = evs[i].date;
        filteredActivities.forEach(act => {
           const val = this.plan.hideValueColumn ? (act.durationDays || 0.1) : (act.value ?? act.durationDays ?? 0.1);
           if (!act.startDate || !act.endDate) return;
           const startMs = new Date(act.startDate).getTime();
           const endMs = new Date(act.endDate).getTime();
           const dayMs = 24 * 60 * 60 * 1000;
           let workDaysCount = 0;
           let isOnThisDay = false;
           let tempMs = startMs;
           const workWeek = this.plan.workWeek || [0, 1, 1, 1, 1, 1, 0];
           const resource = this.plan.resources.find(r => r.id === act.resourceId);
           while(tempMs < endMs) {
               const dayISO = new Date(tempMs).toISOString().split('T')[0];
               const dayOfWeek = new Date(tempMs).getDay();
               let isWD = workWeek[dayOfWeek] > 0;
               if (this.plan.holidays?.includes(dayISO)) isWD = false;
               if (resource?.daysOff?.includes(dayISO)) isWD = false;
               if(isWD) {
                   workDaysCount++;
                   if(dayISO === d) isOnThisDay = true;
               }
               tempMs += dayMs;
           }
           if (workDaysCount > 0 && isOnThisDay) {
               cumulativeProjectedVal += (val / workDaysCount);
           } else if (workDaysCount === 0) {
               const finishDateStr = new Date(endMs - dayMs).toISOString().split('T')[0];
               if(finishDateStr === d) cumulativeProjectedVal += val;
           }

           if (act.actualFinishDate === d) {
               cumulativeActualVal += val;
           }
        });
    }

    this.currentEVIndex = index;
    this.currentEVDetail = {
      date: entry.date,
      plannedContributions: planned.sort((a,b) => b.valueContribution - a.valueContribution),
      earnedContributions: earned.sort((a,b) => b.valueContribution - a.valueContribution),
      projectedTotalPercent: (cumulativeProjectedVal / totalVal) * 100,
      actualTotalPercent: (cumulativeActualVal / totalVal) * 100
    };
    this.showEVDetailDialog = true;
  }

  navigateEV(delta: number) {
    const nextIndex = this.currentEVIndex + delta;
    if (this.plan.earnedValue && nextIndex >= 0 && nextIndex < this.plan.earnedValue.length) {
      this.openEVDetails(nextIndex);
    }
  }

  private getCommonHolidays(year: number): string[] {
    const holidays: string[] = [];

    // July 4th
    holidays.push(`${year}-07-04`);

    // Christmas
    holidays.push(`${year}-12-25`);

    // Memorial Day (Last Monday in May)
    const memorialDay = new Date(year, 4, 31);
    while (memorialDay.getDay() !== 1) memorialDay.setDate(memorialDay.getDate() - 1);
    holidays.push(memorialDay.toISOString().split('T')[0]);

    // Labor Day (First Monday in September)
    const laborDay = new Date(year, 8, 1);
    while (laborDay.getDay() !== 1) laborDay.setDate(laborDay.getDate() + 1);
    holidays.push(laborDay.toISOString().split('T')[0]);

    // Thanksgiving (4th Thursday in Nov)
    const thanksgiving = new Date(year, 10, 1);
    let count = 0;
    while (count < 4) {
      if (thanksgiving.getDay() === 4) count++;
      if (count < 4) thanksgiving.setDate(thanksgiving.getDate() + 1);
    }
    holidays.push(thanksgiving.toISOString().split('T')[0]);

    // Day after Thanksgiving
    const dayAfter = new Date(thanksgiving);
    dayAfter.setDate(dayAfter.getDate() + 1);
    holidays.push(dayAfter.toISOString().split('T')[0]);

    return holidays.sort();
  }
}
