import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { ProjectService, Project } from '../services/project.service';

type TabId = 'plan' | 'design' | 'tasks';

interface Tab {
  id: TabId;
  label: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  template: `
    @if (project) {
      <div class="detail-container">
        <div class="detail-header">
          <button class="back-btn" (click)="goBack()" aria-label="Back to projects">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>{{ project.name }}</h2>
          <span class="path-badge">{{ project.folderPath }}</span>
        </div>

        <div class="split-layout">
          <div class="agent-panel" [class.collapsed]="agentCollapsed">
            @if (!agentCollapsed) {
              <app-chat [projectId]="project.id" [folderPath]="project.folderPath"></app-chat>
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
                    (click)="activeTab = tab.id"
                  >{{ tab.label }}</button>
                }
              </div>

              <div class="tab-content">
                @switch (activeTab) {
                  @case ('plan') {
                    <div class="placeholder">
                      <p>Plan view coming soon.</p>
                    </div>
                  }
                  @case ('design') {
                    <div class="placeholder">
                      <p>Design view coming soon.</p>
                    </div>
                  }
                  @case ('tasks') {
                    <div class="placeholder">
                      <p>Tasks view coming soon.</p>
                    </div>
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
        <h2>Project not found</h2>
        <p>This project may have been removed.</p>
        <button class="back-link" (click)="goBack()">Back to Projects</button>
      </div>
    }
  `,
  styles: [
    `
      .detail-container {
        display: flex;
        flex-direction: column;
        height: 100%;
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
        overflow: hidden;
        position: relative;
        transition: flex 0.2s ease;
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
        overflow: hidden;
        position: relative;
        transition: flex 0.2s ease;
      }
      .right-panel.collapsed {
        flex: 0 0 44px;
        min-width: 44px;
        border-left: none;
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
        top: 8px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--app-border);
        border-radius: 4px;
        background: var(--app-surface);
        color: var(--app-text-muted);
        cursor: pointer;
        transition: color 0.15s, background-color 0.15s;
        z-index: 1;
      }
      .panel-toggle:hover {
        color: var(--app-text);
        background: var(--app-background);
      }
      .agent-toggle {
        right: 8px;
      }
      .agent-panel.collapsed .agent-toggle {
        right: auto;
        left: 50%;
        top: auto;
        bottom: 12px;
        transform: translateX(-50%);
      }
      .tabs-toggle {
        left: 8px;
      }
      .right-panel.collapsed .tabs-toggle {
        left: 50%;
        top: auto;
        bottom: 12px;
        transform: translateX(-50%);
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
export class ProjectDetailComponent implements OnInit {
  project: Project | undefined;
  activeTab: TabId = 'plan';
  agentCollapsed = false;
  tabsCollapsed = false;

  tabs: Tab[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'design', label: 'Design' },
    { id: 'tasks', label: 'Tasks' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.project = this.projectService.getProject(id);
      if (this.project) {
        localStorage.setItem('chadscopilot_last_project_id', id);
      } else {
        localStorage.removeItem('chadscopilot_last_project_id');
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}
