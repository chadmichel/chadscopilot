import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../chat/chat.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { ToolSettingsService, Tool } from '../services/tool-settings.service';
import { TasksService, Task } from '../services/tasks.service';
import { ProjectsService, Project } from '../services/projects.service';
import { WorkspaceAgentsService, WorkspaceAgent } from '../services/workspace-agents.service';

type TabId = 'plan' | 'design' | 'tasks';

interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  template: `
    @if (workspace) {
      <div class="detail-container">
        <div class="detail-header" [class.popout-header]="isPopout">
          @if (!isPopout) {
            <button class="back-btn" (click)="goBack()" aria-label="Back to workspaces">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
          }
          <h2>{{ workspace.name }}</h2>
          <span class="path-badge">{{ workspace.folderPath }}</span>
          @if (editorTool) {
            <button class="editor-btn" (click)="openEditor()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              {{ editorTool.title }}
            </button>
          }
          @if (!isPopout) {
            <button class="popout-btn" [class.ml-auto]="!editorTool" (click)="popoutWorkspace()" title="Open in new window">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
          }
        </div>

        <div class="split-layout">
          <div class="agent-panel" [class.collapsed]="agentCollapsed">
            @if (!agentCollapsed) {
              <div class="agent-header">
                <select class="agent-select"
                        [value]="activeAgentId"
                        (change)="onAgentChange($any($event.target).value)">
                  <option [value]="workspace.id">Default Agent</option>
                  @for (agent of agents; track agent.id) {
                    <option [value]="agent.id">{{ agent.name }}</option>
                  }
                </select>
                <button class="agent-add-btn"
                        (click)="createNewAgent()"
                        [disabled]="agents.length >= 7"
                        title="New agent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14"/>
                    <path d="M5 12h14"/>
                  </svg>
                </button>
                @if (activeAgentId !== workspace.id) {
                  <button class="agent-delete-btn"
                          (click)="deleteActiveAgent()"
                          title="Delete this agent">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                }
              </div>
              <app-chat [workspaceId]="activeAgentId" [folderPath]="workspace.folderPath"></app-chat>
            } @else {
              <div class="collapsed-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span>Agent</span>
              </div>
            }
            <button class="panel-toggle agent-toggle" (click)="agentCollapsed = !agentCollapsed"
                    [attr.aria-label]="agentCollapsed ? 'Expand agent' : 'Collapse agent'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                @if (agentCollapsed) {
                  <path d="M9 18l6-6-6-6"/>
                } @else {
                  <path d="M15 18l-6-6 6-6"/>
                }
              </svg>
            </button>
          </div>

          <div class="right-panel" [class.collapsed]="tabsCollapsed">
            @if (!tabsCollapsed) {
              <div class="tab-bar">
                @for (tab of tabs; track tab.id) {
                  <button
                    class="tab"
                    [class.active]="activeTab === tab.id"
                    (click)="onTabClick(tab.id)"
                  >{{ tab.label }}</button>
                }
              </div>

              <div class="tab-content">
                @switch (activeTab) {
                  @case ('plan') {
                    <div class="design-tab">
                      <div class="design-actions">
                        <button class="toolbar-btn" (click)="openPlan()">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14"/>
                            <path d="M5 12h14"/>
                          </svg>
                          New Plan
                        </button>
                      </div>
                      @if (planFiles.length > 0) {
                        <div class="design-file-list">
                          @for (file of planFiles; track file) {
                            <button class="design-file-item" (click)="openPlan('plans/' + file)">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <path d="M14 2v6h6"/>
                              </svg>
                              <span class="design-file-name">{{ file }}</span>
                            </button>
                          }
                        </div>
                      } @else {
                        <div class="design-placeholder">
                          <p>No plan files yet. Create one to get started.</p>
                        </div>
                      }
                    </div>
                  }
                  @case ('design') {
                    <div class="design-tab">
                      <div class="design-actions">
                        <div class="split-button">
                          <button class="split-main" (click)="openDesign()">
                            New {{ selectedDesignType | uppercase }} Design
                          </button>
                          <button class="split-trigger" (click)="showDesignMenu = !showDesignMenu">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </button>
                          @if (showDesignMenu) {
                            <div class="split-menu">
                              @for (type of designTypes; track type) {
                                <button class="menu-item" (click)="selectDesignType(type)">{{ type | titlecase }}</button>
                              }
                            </div>
                          }
                        </div>
                      </div>
                      @if (designFiles.length > 0) {
                        <div class="design-file-list">
                          @for (file of designFiles; track file) {
                            <button class="design-file-item" (click)="openDesign('designs/' + file)">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <path d="M14 2v6h6"/>
                              </svg>
                              <span class="design-file-name">{{ file }}</span>
                            </button>
                          }
                        </div>
                      } @else {
                        <div class="design-placeholder">
                          <p>No design files yet. Create one to get started.</p>
                        </div>
                      }
                    </div>
                  }
                  @case ('tasks') {
                    @if (selectedTask) {
                      <div class="task-detail">
                        <button class="task-detail-back" (click)="closeTaskDetail()">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5"/>
                            <path d="M12 19l-7-7 7-7"/>
                          </svg>
                          Back to tasks
                        </button>
                        <div class="task-detail-header">
                          <h3>{{ selectedTask.title }}</h3>
                          <span class="task-status-badge"
                                [class.status-pending]="selectedTask.status === 'pending'"
                                [class.status-in-progress]="selectedTask.status === 'in_progress'"
                                [class.status-done]="selectedTask.status === 'done'">
                            {{ selectedTask.status === 'in_progress' ? 'In Progress' : selectedTask.status === 'done' ? 'Done' : 'Backlog' }}
                          </span>
                        </div>
                        @if (selectedTask.description) {
                          <div class="task-detail-desc">{{ selectedTask.description }}</div>
                        }
                        <button class="start-work-btn" (click)="startWorkOnTask(selectedTask)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          Start Work on Task
                        </button>
                      </div>
                    } @else if (workspaceTasks.length === 0) {
                      <div class="placeholder">
                        @if (!workspace.taskToolId) {
                          <p>No task tool configured. Use the gear icon on the Workspaces page to set one.</p>
                        } @else if (!workspace.taskOrganization) {
                          <p>No organization selected. Configure one in workspace settings.</p>
                        } @else if (!workspace.taskToolExternalId) {
                          <p>No project selected. Configure one in workspace settings.</p>
                        } @else {
                          <p>No active tasks for this project.</p>
                        }
                      </div>
                    } @else {
                      <div class="task-board">
                        <div class="task-column">
                          <div class="task-col-header">
                            <span class="task-col-title">Backlog</span>
                            <span class="task-col-count">{{ backlogTasks.length }}</span>
                          </div>
                          <div class="task-col-body">
                            @for (task of backlogTasks; track task.id) {
                              <div class="task-card pending" (click)="selectTask(task)">
                                <div class="task-card-title">{{ task.title }}</div>
                                @if (task.description) {
                                  <div class="task-card-desc">{{ task.description }}</div>
                                }
                              </div>
                            }
                            @if (backlogTasks.length === 0) {
                              <div class="task-col-empty">No tasks</div>
                            }
                          </div>
                        </div>
                        <div class="task-column">
                          <div class="task-col-header">
                            <span class="task-col-title">In Progress</span>
                            <span class="task-col-count">{{ inProgressTasks.length }}</span>
                          </div>
                          <div class="task-col-body">
                            @for (task of inProgressTasks; track task.id) {
                              <div class="task-card in-progress" (click)="selectTask(task)">
                                <div class="task-card-title">{{ task.title }}</div>
                                @if (task.description) {
                                  <div class="task-card-desc">{{ task.description }}</div>
                                }
                              </div>
                            }
                            @if (inProgressTasks.length === 0) {
                              <div class="task-col-empty">No tasks</div>
                            }
                          </div>
                        </div>
                        <div class="task-column">
                          <div class="task-col-header">
                            <span class="task-col-title">Complete</span>
                            <span class="task-col-count">{{ completeTasks.length }}</span>
                          </div>
                          <div class="task-col-body">
                            @for (task of completeTasks; track task.id) {
                              <div class="task-card done" (click)="selectTask(task)">
                                <div class="task-card-title">{{ task.title }}</div>
                                @if (task.description) {
                                  <div class="task-card-desc">{{ task.description }}</div>
                                }
                              </div>
                            }
                            @if (completeTasks.length === 0) {
                              <div class="task-col-empty">No tasks</div>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  }
                }
              </div>
            } @else {
              <div class="collapsed-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M16 13H8"/>
                  <path d="M16 17H8"/>
                  <path d="M10 9H8"/>
                </svg>
                <span>{{ activeTab | titlecase }}</span>
              </div>
            }
            <button class="panel-toggle tabs-toggle" (click)="tabsCollapsed = !tabsCollapsed"
                    [attr.aria-label]="tabsCollapsed ? 'Expand panel' : 'Collapse panel'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                @if (tabsCollapsed) {
                  <path d="M15 18l-6-6 6-6"/>
                } @else {
                  <path d="M9 18l6-6-6-6"/>
                }
              </svg>
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="not-found">
        <h2>Workspace not found</h2>
        <p>This workspace may have been removed.</p>
        <button class="back-link" (click)="goBack()">Back to Workspaces</button>
      </div>
    }
  `,
  styles: [
    `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      flex: 1;
    }

    .detail-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      min-height: 0;
    }

      /* Header */
      .detail-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--app-text-muted);
        cursor: pointer;
        transition: background-color 0.15s, color 0.15s;
      }
      .back-btn:hover {
        background: var(--app-surface);
        color: var(--app-text);
      }
      h2 {
        font-size: 15px;
        font-weight: 600;
        color: var(--app-text);
        margin: 0;
      }
      .path-badge {
        font-size: 11px;
        color: var(--app-text-muted);
        background: var(--app-surface);
        padding: 3px 10px;
        border-radius: 4px;
        border: 1px solid var(--app-border);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
      }

      /* Editor button */
      .editor-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        padding: 6px 14px;
        background: transparent;
        color: var(--theme-primary);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .editor-btn:hover {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        border-color: var(--theme-primary);
      }

      /* Popout button */
      .popout-btn {
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
        flex-shrink: 0;
      }
      .popout-btn:hover {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
      }
      .ml-auto {
        margin-left: auto;
      }

      /* Popout window header — draggable titlebar */
      .popout-header {
        -webkit-app-region: drag;
        padding-left: 80px; /* room for macOS traffic lights */
      }
      .popout-header button,
      .popout-header select {
        -webkit-app-region: no-drag;
      }

      /* Split layout */
      .split-layout {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      .agent-panel {
        flex: 1;
        min-width: 0;
        border-right: 1px solid var(--app-border);
        overflow: visible;
        position: relative;
        transition: flex 0.2s ease;
        display: flex;
        flex-direction: column;
      }
      app-chat {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .agent-panel.collapsed {
        flex: 0 0 44px;
        min-width: 44px;
      }
      .right-panel {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: visible;
        position: relative;
        transition: flex 0.2s ease;
      }
      .right-panel.collapsed {
        flex: 0 0 44px;
        min-width: 44px;
        border-left: none;
      }

      /* Agent header bar */
      .agent-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .agent-select {
        flex: 1;
        min-width: 0;
        padding: 5px 8px;
        font-size: 12px;
        font-weight: 500;
        color: var(--app-text);
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 5px;
        cursor: pointer;
        outline: none;
      }
      .agent-select:focus {
        border-color: var(--theme-primary);
      }
      .agent-add-btn,
      .agent-delete-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 1px solid var(--app-border);
        border-radius: 5px;
        background: var(--app-surface);
        color: var(--app-text-muted);
        cursor: pointer;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .agent-add-btn:hover:not(:disabled) {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
      }
      .agent-add-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .agent-delete-btn:hover {
        color: #ef4444;
        border-color: #ef4444;
      }

      /* Collapsed label */
      .collapsed-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-top: 16px;
        color: var(--app-text-muted);
        opacity: 0.6;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .collapsed-label svg {
        color: var(--theme-primary);
        opacity: 0.7;
      }
      .collapsed-label span {
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }

      /* Panel toggle buttons */
      .panel-toggle {
        position: absolute;
        top: 50%;
        width: 18px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--app-border);
        border-radius: 4px;
        background: var(--app-surface);
        color: var(--app-text-muted);
        cursor: pointer;
        transition: all 0.15s;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .panel-toggle:hover {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
        background: var(--app-background);
      }
      .agent-toggle {
        right: -9px;
        transform: translateY(-50%);
        margin-top: -20px;
      }
      .agent-panel.collapsed .agent-toggle {
        right: -9px;
        left: auto;
        top: 50%;
        bottom: auto;
        transform: translateY(-50%);
        margin-top: -20px;
      }
      .tabs-toggle {
        left: -9px;
        transform: translateY(-50%);
        margin-top: 20px;
      }
      .right-panel.collapsed .tabs-toggle {
        left: -9px;
        top: 50%;
        bottom: auto;
        transform: translateY(-50%);
        margin-top: 20px;
      }

      /* Tabs */
      .tab-bar {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
        gap: 4px;
      }
      .tab {
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 500;
        color: var(--app-text-muted);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
      }
      .tab:hover {
        color: var(--app-text);
      }
      .tab.active {
        color: var(--theme-primary);
        border-bottom-color: var(--theme-primary);
      }

      /* Tab content */
      .tab-content {
        flex: 1;
        overflow: hidden;
      }
      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--app-text-muted);
        font-size: 14px;
      }

      /* Task board */
      .task-board {
        display: flex;
        gap: 12px;
        flex: 1;
        overflow: hidden;
        padding: 12px 16px;
      }
      .task-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .task-col-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .task-col-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--app-text);
      }
      .task-col-count {
        font-size: 10px;
        font-weight: 600;
        color: var(--app-text-muted);
        background: var(--app-surface);
        padding: 1px 7px;
        border-radius: 10px;
        border: 1px solid var(--app-border);
      }
      .task-col-body {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .task-col-empty {
        text-align: center;
        padding: 20px 8px;
        font-size: 11px;
        color: var(--app-text-muted);
        opacity: 0.5;
      }
      .task-card {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        padding: 10px 12px;
        border-left: 3px solid var(--app-text-muted);
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .task-card:hover {
        border-color: var(--theme-primary);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      }
      .task-card.pending {
        border-left-color: var(--app-text-muted);
      }
      .task-card.in-progress {
        border-left-color: var(--theme-primary);
      }
      .task-card.done {
        border-left-color: #22c55e;
      }
      .task-card-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text);
        line-height: 1.4;
      }
      .task-card-desc {
        font-size: 11px;
        color: var(--app-text-muted);
        margin-top: 4px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Task detail view */
      .task-detail {
        padding: 20px 24px;
        overflow-y: auto;
        height: 100%;
      }
      .task-detail-back {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        background: transparent;
        border: none;
        color: var(--app-text-muted);
        font-size: 12px;
        cursor: pointer;
        transition: color 0.15s;
        margin-bottom: 16px;
      }
      .task-detail-back:hover {
        color: var(--theme-primary);
      }
      .task-detail-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;
      }
      .task-detail-header h3 {
        flex: 1;
        font-size: 16px;
        font-weight: 600;
        color: var(--app-text);
        margin: 0;
        line-height: 1.4;
      }
      .task-status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 12px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .task-status-badge.status-pending {
        background: color-mix(in srgb, var(--app-text-muted), transparent 85%);
        color: var(--app-text-muted);
      }
      .task-status-badge.status-in-progress {
        background: color-mix(in srgb, var(--theme-primary), transparent 85%);
        color: var(--theme-primary);
      }
      .task-status-badge.status-done {
        background: color-mix(in srgb, #22c55e, transparent 85%);
        color: #22c55e;
      }
      .task-detail-desc {
        font-size: 13px;
        color: var(--app-text-muted);
        line-height: 1.6;
        white-space: pre-wrap;
        margin-bottom: 24px;
      }
      .start-work-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .start-work-btn:hover {
        background: var(--theme-primary-hover);
      }

      /* Design tab */
      .design-tab {
        padding: 24px;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .design-actions {
        display: flex;
        justify-content: center;
      }
      .design-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: var(--app-text-muted);
        font-size: 14px;
        text-align: center;
        max-width: 400px;
        margin: 0 auto;
      }
      .design-file-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow-y: auto;
        flex: 1;
      }
      .design-file-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        color: var(--app-text);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
        text-align: left;
      }
      .design-file-item:hover {
        border-color: var(--theme-primary);
        color: var(--theme-primary);
      }
      .design-file-item svg {
        color: var(--app-text-muted);
        flex-shrink: 0;
      }
      .design-file-item:hover svg {
        color: var(--theme-primary);
      }
      .design-file-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Toolbar button */
      .toolbar-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        background: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.15s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .toolbar-btn:hover {
        background: var(--theme-primary-hover);
      }

      /* Split Button */
      .split-button {
        display: flex;
        position: relative;
        border-radius: 8px;
        overflow: visible;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      .split-main {
        padding: 12px 20px;
        background: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 8px 0 0 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.15s;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
      }
      .split-main:hover {
        background: var(--theme-primary-hover);
      }
      .split-trigger {
        padding: 0 10px;
        background: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 0 8px 8px 0;
        cursor: pointer;
        transition: background-color 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .split-trigger:hover {
        background: var(--theme-primary-hover);
      }
      .split-menu {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        width: 100%;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 100;
        overflow: hidden;
      }
      .menu-item {
        width: 100%;
        padding: 10px 16px;
        text-align: left;
        background: transparent;
        border: none;
        color: var(--app-text);
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .menu-item:hover {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        color: var(--theme-primary);
      }

      /* Not found */
      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--app-text-muted);
        gap: 8px;
      }
      .not-found h2 {
        font-size: 18px;
        color: var(--app-text);
      }
      .not-found p {
        font-size: 14px;
        color: var(--app-text-muted);
      }
      .back-link {
        margin-top: 12px;
        padding: 8px 16px;
        background-color: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .back-link:hover {
        background-color: var(--theme-primary-hover);
      }
    `,
  ],
})
export class WorkspaceDetailComponent implements OnInit {
  workspace: Workspace | undefined;
  activeTab: TabId = 'plan';
  agentCollapsed = false;
  tabsCollapsed = false;
  editorTool: Tool | null = null;
  isPopout = false;

  // Design tab
  designTypes: string[] = ['mermaid', 'ux', 'system'];
  selectedDesignType = 'mermaid';
  showDesignMenu = false;
  designFiles: string[] = [];
  planFiles: string[] = [];

  // Tasks for this workspace
  workspaceTasks: Task[] = [];

  // Agents
  agents: WorkspaceAgent[] = [];
  activeAgentId = '';

  // Task detail
  selectedTask: Task | null = null;

  tabs: Tab[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'design', label: 'Design' },
    { id: 'tasks', label: 'Tasks' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workspaceService: WorkspaceService,
    private toolSettingsService: ToolSettingsService,
    private tasksService: TasksService,
    private projectsService: ProjectsService,
    private workspaceAgentsService: WorkspaceAgentsService,
    private chatService: ChatService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.isPopout = this.route.snapshot.queryParamMap.get('popout') === '1';
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      if (this.workspaceService.workspaces.length === 0) {
        await this.workspaceService.loadWorkspaces();
      }
      this.workspace = this.workspaceService.getWorkspace(id);
      if (this.workspace) {
        this.activeAgentId = this.workspace.id;
        localStorage.setItem('chadscopilot_last_workspace_id', id);
        await this.loadEditorTool();
        await this.loadWorkspaceTasks();
        await this.loadAgents();
        await this.loadDesignFiles();
        await this.loadPlanFiles();
      } else {
        localStorage.removeItem('chadscopilot_last_workspace_id');
      }
    }
  }

  get backlogTasks(): Task[] {
    return this.workspaceTasks.filter(t => t.status === 'pending');
  }

  get inProgressTasks(): Task[] {
    return this.workspaceTasks.filter(t => t.status === 'in_progress');
  }

  get completeTasks(): Task[] {
    return this.workspaceTasks.filter(t => t.status === 'done');
  }

  onAgentChange(agentId: string): void {
    this.activeAgentId = agentId;
  }

  async createNewAgent(): Promise<void> {
    if (!this.workspace || this.agents.length >= 7) return;
    const agent = await this.workspaceAgentsService.addAgent({
      workspaceId: this.workspace.id,
      name: `Agent ${this.agents.length + 1}`,
      summary: '',
      taskId: '',
      taskName: '',
      taskDescription: '',
    });
    this.agents.push(agent);
    this.activeAgentId = agent.id;
  }

  async deleteActiveAgent(): Promise<void> {
    if (!this.workspace || this.activeAgentId === this.workspace.id) return;
    await this.workspaceAgentsService.removeAgent(this.activeAgentId);
    this.agents = this.agents.filter(a => a.id !== this.activeAgentId);
    this.activeAgentId = this.workspace.id;
  }

  selectTask(task: Task): void {
    this.selectedTask = task;
  }

  closeTaskDetail(): void {
    this.selectedTask = null;
  }

  onTabClick(tabId: TabId): void {
    this.activeTab = tabId;
    if (tabId !== 'tasks') {
      this.selectedTask = null;
    }
  }

  selectDesignType(type: string) {
    this.selectedDesignType = type;
    this.showDesignMenu = false;
  }

  async openPlan(fileName?: string) {
    if (!this.workspace) return;
    const electron = (window as any).electronAPI;
    const file = fileName || 'plans/plan.json';
    await electron?.openPlanEditor?.(this.workspace.id, file);
  }

  async openDesign(fileName?: string) {
    if (!this.workspace) return;
    const electron = (window as any).electronAPI;
    if (this.selectedDesignType === 'mermaid') {
      const file = fileName || 'designs/mermaid.md';
      await electron?.openMermaidBuilder?.(this.workspace.id, file);
    }
  }

  async startWorkOnTask(task: Task): Promise<void> {
    if (!this.workspace) return;

    // Check if we already have an agent for this task
    const existingAgent = this.agents.find(a => a.taskId === task.id);
    if (existingAgent) {
      this.activeAgentId = existingAgent.id;
      this.selectedTask = null;
      this.agentCollapsed = false;
      return;
    }

    // Enforce 7-agent limit
    if (this.agents.length >= 7) return;

    // Create new agent for this task
    const agent = await this.workspaceAgentsService.addAgent({
      workspaceId: this.workspace.id,
      name: task.title,
      summary: '',
      taskId: task.id,
      taskName: task.title,
      taskDescription: task.description,
    });
    this.agents.push(agent);
    this.activeAgentId = agent.id;
    this.selectedTask = null;
    this.agentCollapsed = false;

    // Send initial message to the new agent's chat
    const message = `I'm working on task: ${task.title}\n\nDescription: ${task.description || 'No description provided.'}\n\nHelp me plan and implement this task.`;
    await this.chatService.sendMessage(message, agent.id, this.workspace.folderPath);
  }

  private async loadEditorTool(): Promise<void> {
    if (!this.workspace?.editorToolId) return;
    if (this.toolSettingsService.tools.length === 0) {
      await this.toolSettingsService.loadTools();
    }
    this.editorTool = this.toolSettingsService.tools.find(
      (t) => t.id === this.workspace!.editorToolId
    ) ?? null;
  }

  private async loadWorkspaceTasks(): Promise<void> {
    if (!this.workspace?.taskToolId) return;

    // Determine which project(s) to show
    let projectExternalIds: Set<string>;

    if (this.workspace.taskToolExternalId) {
      // Specific project selected
      projectExternalIds = new Set([this.workspace.taskToolExternalId]);
    } else if (this.workspace.taskOrganization) {
      // All projects for this org
      const projects = await this.projectsService.getByToolId(this.workspace.taskToolId);
      const orgProjects = projects.filter(
        p => p.organizationId === this.workspace!.taskOrganization
      );
      projectExternalIds = new Set(orgProjects.map(p => p.externalId));
    } else {
      return;
    }

    // Load all tasks and filter to matching projects
    await this.tasksService.loadTasks();
    this.workspaceTasks = this.tasksService.tasks.filter(task => {
      if (task.toolId !== this.workspace!.taskToolId) return false;
      try {
        const extra = JSON.parse(task.extra);
        return projectExternalIds.has(extra.githubProjectId);
      } catch {
        return false;
      }
    });
  }

  private async loadAgents(): Promise<void> {
    if (!this.workspace) return;
    this.agents = await this.workspaceAgentsService.getByWorkspace(this.workspace.id);
  }

  private async loadPlanFiles(): Promise<void> {
    if (!this.workspace) return;
    const electron = (window as any).electronAPI;
    const sep = this.workspace.folderPath.includes('\\') ? '\\' : '/';
    const plansDir = `${this.workspace.folderPath}${sep}plans`;
    const files: string[] = await electron?.listFiles?.(plansDir, '.json') ?? [];
    this.planFiles = files.sort();
  }

  private async loadDesignFiles(): Promise<void> {
    if (!this.workspace) return;
    const electron = (window as any).electronAPI;
    const sep = this.workspace.folderPath.includes('\\') ? '\\' : '/';
    const designsDir = `${this.workspace.folderPath}${sep}designs`;
    const files: string[] = await electron?.listFiles?.(designsDir, '.md') ?? [];
    this.designFiles = files.sort();
  }

  async openEditor(): Promise<void> {
    if (!this.editorTool || !this.workspace) return;
    const electron = (window as any).electronAPI;
    const title = this.editorTool.title.toLowerCase();
    const folderPath = this.workspace.folderPath;
    const cliPath = this.editorTool.localPath || undefined;

    if (title.includes('vs code') || title.includes('vscode') || title.includes('visual studio code')) {
      await electron?.vscodeOpen?.(folderPath, cliPath);
    } else if (title.includes('cursor')) {
      await electron?.cursorOpen?.(folderPath, cliPath);
    } else if (title.includes('antigravity')) {
      await electron?.antigravityOpen?.(folderPath, cliPath);
    }
  }

  async popoutWorkspace(): Promise<void> {
    if (!this.workspace) return;
    const electron = (window as any).electronAPI;
    await electron?.popoutWorkspace?.(this.workspace.id, this.workspace.name);
  }

  goBack(): void {
    this.router.navigate(['/workspaces']);
  }
}
