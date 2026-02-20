import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { ProjectService, Project } from '../services/project.service';

type TabId = 'agent' | 'plan' | 'design' | 'tasks';

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
            @case ('agent') {
              <app-chat [projectId]="project.id" [folderPath]="project.folderPath"></app-chat>
            }
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
        padding: 14px 24px;
        border-bottom: 1px solid #2d2d2d;
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
        color: #888;
        cursor: pointer;
        transition: background-color 0.15s, color 0.15s;
      }
      .back-btn:hover {
        background: #2a2a2a;
        color: #d4d4d4;
      }
      h2 {
        font-size: 16px;
        font-weight: 600;
        color: #d4d4d4;
      }
      .path-badge {
        font-size: 12px;
        color: #888;
        background: #2a2a2a;
        padding: 3px 10px;
        border-radius: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
      }

      /* Tabs */
      .tab-bar {
        display: flex;
        padding: 0 24px;
        border-bottom: 1px solid #2d2d2d;
        flex-shrink: 0;
      }
      .tab {
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 500;
        color: #888;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
      }
      .tab:hover {
        color: #d4d4d4;
      }
      .tab.active {
        color: #569cd6;
        border-bottom-color: #569cd6;
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
        color: #888;
        font-size: 14px;
      }

      /* Not found */
      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #888;
        gap: 8px;
      }
      .not-found h2 {
        font-size: 18px;
        color: #d4d4d4;
      }
      .not-found p {
        font-size: 14px;
        color: #888;
      }
      .back-link {
        margin-top: 12px;
        padding: 8px 16px;
        background-color: #569cd6;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .back-link:hover {
        background-color: #4a8cc7;
      }
    `,
  ],
})
export class ProjectDetailComponent implements OnInit {
  project: Project | undefined;
  activeTab: TabId = 'agent';

  tabs: Tab[] = [
    { id: 'agent', label: 'Agent' },
    { id: 'plan', label: 'Plan' },
    { id: 'design', label: 'Design' },
    { id: 'tasks', label: 'Tasks' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.project = this.projectService.getProject(id);
    }
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}
