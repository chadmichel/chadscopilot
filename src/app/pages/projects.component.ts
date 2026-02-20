import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../services/project.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Projects</h2>
        <button class="add-btn" (click)="showAddForm = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Project
        </button>
      </div>

      @if (showAddForm) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>New Project</h3>
            <div class="form-group">
              <label for="projectName">Project Name</label>
              <input
                id="projectName"
                type="text"
                [(ngModel)]="newName"
                placeholder="My Project"
                (keydown.enter)="addProject()"
                autofocus
              />
            </div>
            <div class="form-group">
              <label for="folderPath">Folder Path</label>
              <div class="input-with-button">
                <input
                  id="folderPath"
                  type="text"
                  [(ngModel)]="newFolderPath"
                  placeholder="/path/to/project"
                  (keydown.enter)="addProject()"
                />
                <button type="button" class="browse-btn" (click)="pickFolder()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  Browse
                </button>
              </div>
            </div>
            <div class="modal-actions">
              <button class="cancel-btn" (click)="closeModal()">Cancel</button>
              <button
                class="confirm-btn"
                (click)="addProject()"
                [disabled]="!newName.trim() || !newFolderPath.trim()"
              >Add</button>
            </div>
          </div>
        </div>
      }

      @if (projectService.projects.length === 0 && !showAddForm) {
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No projects yet</p>
          <span class="empty-hint">Create a project to get started with a scoped Copilot agent.</span>
        </div>
      } @else {
        <div class="project-list">
          @for (project of projectService.projects; track project.id) {
            <div class="project-row" (click)="openProject(project.id)">
              <svg class="row-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span class="row-name">{{ project.name }}</span>
              <span class="row-path">{{ project.folderPath }}</span>
              <svg class="row-chevron" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px 28px;
        color: var(--app-text);
        height: 100%;
        overflow-y: auto;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
      .add-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: transparent;
        color: var(--theme-primary);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .add-btn:hover {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        border-color: var(--theme-primary);
      }

      /* Modal */
      .modal-overlay {
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
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .modal {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 12px;
        padding: 28px;
        width: 440px;
        max-width: 90vw;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideUp {
        from { transform: translateY(16px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .modal h3 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 20px;
        color: var(--app-text);
        margin-top: 0;
      }
      .form-group {
        margin-bottom: 16px;
      }
      .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text-muted);
        margin-bottom: 6px;
      }
      .form-group input {
        width: 100%;
        padding: 10px 12px;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: all 0.15s;
      }
      .form-group input::placeholder {
        color: var(--app-text-muted);
        opacity: 0.4;
      }
      .form-group input:focus {
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary), transparent 85%);
      }

      .input-with-button {
        display: flex;
        gap: 8px;
      }
      .input-with-button input {
        flex: 1;
      }
      .browse-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 12px;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .browse-btn:hover {
        border-color: var(--theme-primary);
      }
      .browse-btn svg {
        color: var(--theme-primary);
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }
      .cancel-btn {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .cancel-btn:hover {
        background: var(--app-background);
      }
      .confirm-btn {
        padding: 8px 20px;
        background-color: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .confirm-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .confirm-btn:hover:not(:disabled) {
        background-color: var(--theme-primary-hover);
      }

      /* Empty state */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60%;
        color: var(--app-text-muted);
        gap: 12px;
        opacity: 0.5;
      }
      .empty-state svg {
        color: var(--theme-primary);
        opacity: 0.6;
      }
      .empty-state p {
        font-size: 16px;
        color: var(--app-text);
        font-weight: 600;
        margin: 0;
      }
      .empty-hint {
        font-size: 13px;
        color: var(--app-text-muted);
      }

      /* Project list */
      .project-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .project-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.12s;
      }
      .project-row:hover {
        background: var(--app-surface);
      }
      .row-icon {
        flex-shrink: 0;
        color: var(--theme-primary);
        opacity: 0.7;
      }
      .row-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--app-text);
        white-space: nowrap;
      }
      .row-path {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        color: var(--app-text-muted);
        opacity: 0.6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row-chevron {
        flex-shrink: 0;
        color: var(--app-text-muted);
        opacity: 0.3;
      }
      .project-row:hover .row-chevron {
        opacity: 0.6;
      }
    `,
  ],
})
export class ProjectsComponent implements OnInit {
  showAddForm = false;
  newName = '';
  newFolderPath = '';

  constructor(
    public projectService: ProjectService,
    private router: Router
  ) {
    this.projectService.loadProjects();
  }

  ngOnInit(): void {
    localStorage.removeItem('chadscopilot_last_project_id');
  }

  async addProject(): Promise<void> {
    const name = this.newName.trim();
    const folderPath = this.newFolderPath.trim();
    if (!name || !folderPath) return;

    const project = await this.projectService.addProject(name, folderPath);
    this.closeModal();
    this.router.navigate(['/projects', project.id]);
  }

  async pickFolder(): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.selectDirectory) {
      const path = await electronAPI.selectDirectory();
      if (path) {
        this.newFolderPath = path;
        // If name is empty, try to auto-populate from folder name
        if (!this.newName.trim()) {
          const parts = path.split(/[/\\]/);
          const folderName = parts[parts.length - 1] || parts[parts.length - 2];
          if (folderName) {
            this.newName = folderName;
          }
        }
      }
    } else {
      console.warn('Electron API or selectDirectory not available');
    }
  }

  closeModal(): void {
    this.showAddForm = false;
    this.newName = '';
    this.newFolderPath = '';
  }

  openProject(id: string): void {
    this.router.navigate(['/projects', id]);
  }
}
