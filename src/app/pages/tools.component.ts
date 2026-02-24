import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToolSettingsService, Tool } from '../services/tool-settings.service';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
      </div>

      @if (toolSettingsService.tools.length === 0) {
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <p>No tools configured</p>
        </div>
      } @else {
        <div class="tool-list">
          @for (tool of toolSettingsService.tools; track tool.id) {
            <div class="tool-row">
              <div class="tool-icon" [class]="'type-' + tool.toolType.replace(' ', '-')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  @switch (tool.toolType) {
                    @case ('editor') {
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      <path d="m15 5 4 4"/>
                    }
                    @case ('repository') {
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/>
                      <path d="M9 18c-4.51 2-5-2-7-2"/>
                    }
                    @case ('project management') {
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <path d="M9 3v18"/>
                      <path d="M13 8h4"/>
                      <path d="M13 12h4"/>
                      <path d="M13 16h4"/>
                    }
                    @case ('mcp') {
                      <path d="M12 2v4"/>
                      <path d="M12 18v4"/>
                      <path d="M4.93 4.93l2.83 2.83"/>
                      <path d="M16.24 16.24l2.83 2.83"/>
                      <path d="M2 12h4"/>
                      <path d="M18 12h4"/>
                      <path d="M4.93 19.07l2.83-2.83"/>
                      <path d="M16.24 7.76l2.83-2.83"/>
                    }
                    @case ('rag') {
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                    }
                    @default {
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    }
                  }
                </svg>
              </div>
              <div class="tool-info">
                <span class="tool-name">{{ tool.title }}</span>
                <span class="tool-type">{{ tool.toolType }}</span>
              </div>
              <div class="tool-actions">
                <button
                  class="toggle-btn"
                  [class.enabled]="tool.isEnabled"
                  (click)="toggleEnabled(tool)"
                  [attr.aria-label]="tool.isEnabled ? 'Disable ' + tool.title : 'Enable ' + tool.title"
                >
                  <div class="toggle-track">
                    <div class="toggle-thumb"></div>
                  </div>
                </button>
                <button class="configure-btn" (click)="configure(tool)">
                  Configure
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
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

      /* Tool list */
      .tool-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .tool-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        transition: background-color 0.12s;
      }
      .tool-row:hover {
        background: var(--app-surface);
      }

      /* Tool icon */
      .tool-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        flex-shrink: 0;
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
        color: var(--theme-primary);
      }

      /* Tool info */
      .tool-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .tool-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--app-text);
      }
      .tool-type {
        font-size: 11px;
        color: var(--app-text-muted);
        opacity: 0.7;
        text-transform: capitalize;
      }

      /* Tool actions */
      .tool-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      /* Toggle switch */
      .toggle-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
      }
      .toggle-track {
        width: 36px;
        height: 20px;
        border-radius: 10px;
        background: var(--app-border);
        position: relative;
        transition: background-color 0.2s;
      }
      .toggle-btn.enabled .toggle-track {
        background: var(--theme-primary);
      }
      .toggle-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      .toggle-btn.enabled .toggle-thumb {
        transform: translateX(16px);
      }

      /* Configure button */
      .configure-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: transparent;
        color: var(--app-text-muted);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .configure-btn:hover {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 92%);
      }
    `,
  ],
})
export class ToolsComponent implements OnInit {
  constructor(
    public toolSettingsService: ToolSettingsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.toolSettingsService.loadTools();
  }

  async toggleEnabled(tool: Tool): Promise<void> {
    const newValue = !tool.isEnabled;
    await this.toolSettingsService.updateTool(tool.id, { isEnabled: newValue });
    tool.isEnabled = newValue;
  }

  configure(tool: Tool): void {
    this.router.navigate(['/tools', tool.id]);
  }
}
