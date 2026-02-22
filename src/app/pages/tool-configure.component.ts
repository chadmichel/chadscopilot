import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolSettingsService, Tool } from '../services/tool-settings.service';

@Component({
  selector: 'app-tool-configure',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (tool) {
      <div class="page">
        <div class="page-header">
          <button class="back-btn" (click)="goBack()" aria-label="Back to tools">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2>{{ tool.title }}</h2>
          <span class="type-badge">{{ tool.toolType }}</span>
          @if (isGitHubTool()) {
            <button class="sync-all-btn" (click)="syncAll()" [disabled]="syncAllRunning || syncedProjectIds.size === 0">
              @if (syncAllRunning) {
                <span class="spinner"></span>
                Syncing...
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"/>
                  <path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                  <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
                </svg>
                Sync
              }
            </button>
            <button class="log-btn" (click)="toggleLogPanel()" [class.active]="showLogPanel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
              Log
            </button>
          }
        </div>

        <!-- Log Panel -->
        @if (showLogPanel) {
          <div class="log-panel">
            <div class="log-panel-header">
              <span class="log-panel-title">Sync Log</span>
              <div class="log-panel-actions">
                <button class="log-action-btn" (click)="loadSyncLogs()">Refresh</button>
                <button class="log-action-btn danger" (click)="clearSyncLogs()">Clear</button>
                <button class="log-close-btn" (click)="showLogPanel = false">&times;</button>
              </div>
            </div>
            <div class="log-panel-body">
              @if (syncLogs.length === 0) {
                <div class="log-empty">No sync logs yet. Try syncing a project.</div>
              } @else {
                @for (entry of syncLogs; track entry.id) {
                  <div class="log-entry" [class]="'log-' + entry.level">
                    <span class="log-time">{{ entry.createdAt | date:'short' }}</span>
                    <span class="log-level">{{ entry.level }}</span>
                    <span class="log-project">{{ entry.projectTitle }}</span>
                    <span class="log-message">{{ entry.message }}</span>
                    @if (entry.detail) {
                      <div class="log-detail">{{ entry.detail }}</div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }

        <div class="form-content">
          <!-- Enabled toggle -->
          <div class="form-row">
            <div class="form-row-label">
              <span class="label">Enabled</span>
              <span class="hint">Allow this tool to be used in workspaces</span>
            </div>
            <button
              class="toggle-btn"
              [class.enabled]="tool.isEnabled"
              (click)="toggleEnabled()"
            >
              <div class="toggle-track">
                <div class="toggle-thumb"></div>
              </div>
            </button>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label>Description</label>
            <textarea
              [(ngModel)]="tool.description"
              (ngModelChange)="markDirty()"
              placeholder="What does this tool do?"
              rows="2"
            ></textarea>
          </div>

          <!-- Editor-specific: installation detection -->
          @if (tool.toolType === 'editor') {
            <div class="form-group">
              <label>Installation Status</label>
              <div class="detection-row">
                @if (editorDetected === null) {
                  <span class="detection-status checking">Checking...</span>
                } @else if (editorDetected) {
                  <span class="detection-status found">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Installed
                  </span>
                  @if (editorCliPath) {
                    <span class="cli-path">{{ editorCliPath }}</span>
                  }
                } @else {
                  <span class="detection-status not-found">Not found</span>
                }
                <button class="detect-btn" (click)="detectEditor()">Re-detect</button>
              </div>
            </div>
          }

          <!-- Local path -->
          @if (showField('localPath')) {
            <div class="form-group">
              <label>Local Path</label>
              <div class="input-with-button">
                <input
                  type="text"
                  [(ngModel)]="tool.localPath"
                  (ngModelChange)="markDirty()"
                  placeholder="/path/to/tool"
                />
                <button class="browse-btn" (click)="pickPath()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  Browse
                </button>
              </div>
            </div>
          }

          <!-- Copilot GitHub Connection (auto-detected) -->
          @if (isGitHubTool() && copilotAuthChecked && copilotAuthenticated) {
            <div class="section-divider">
              <span class="section-label">GitHub Connection (via Copilot)</span>
            </div>

            <div class="connectivity-row">
              <span class="connectivity-result ok">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Connected as {{ copilotLogin }}
              </span>
            </div>
          }

          <!-- Token -->
          @if (showField('token')) {
            <div class="form-group">
              <div class="label-with-help">
                <label>Token</label>
                @if (isGitHubTool()) {
                  <button class="help-btn" (click)="showTokenHelp = !showTokenHelp"
                          [class.active]="showTokenHelp"
                          title="How to create a GitHub PAT">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <path d="M12 17h.01"/>
                    </svg>
                  </button>
                }
              </div>
              @if (showTokenHelp) {
                <div class="token-help-card">
                  <div class="token-help-title">Creating a GitHub Personal Access Token</div>
                  <ol class="token-help-steps">
                    <li>Go to <strong>GitHub.com &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens &rarr; Fine-grained tokens</strong></li>
                    <li>Click <strong>Generate new token</strong></li>
                    <li>Set a name and expiration</li>
                    <li>Under <strong>Repository access</strong>, choose which repos to grant access to</li>
                    <li>Under <strong>Permissions</strong>, enable:
                      <ul>
                        <li><strong>Organization permissions &rarr; Members</strong>: Read-only</li>
                        <li><strong>Repository permissions &rarr; Contents</strong>: Read-only</li>
                        <li><strong>Repository permissions &rarr; Issues</strong>: Read &amp; Write (if using Issues)</li>
                        <li><strong>Repository permissions &rarr; Projects</strong>: Read &amp; Write (if using Projects)</li>
                      </ul>
                    </li>
                    <li>Click <strong>Generate token</strong> and paste it here</li>
                  </ol>
                  <div class="token-help-note">
                    Classic tokens also work &mdash; select scopes: <code>repo</code>, <code>read:org</code>, <code>project</code>
                  </div>
                </div>
              }
              <div class="input-with-reveal">
                <input
                  [type]="showToken ? 'text' : 'password'"
                  [(ngModel)]="tool.token"
                  (ngModelChange)="markDirty()"
                  [placeholder]="isGitHubTool() ? 'GitHub Personal Access Token' : 'Enter API token or key'"
                  autocomplete="off"
                />
                <button class="reveal-btn" (click)="showToken = !showToken">
                  @if (showToken) {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <path d="M1 1l22 22"/>
                    </svg>
                  } @else {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  }
                </button>
              </div>
            </div>
          }

          <!-- Organization -->
          @if (isGitHubTool()) {
            <div class="form-group">
              <label>Organization</label>
              <input
                type="text"
                [(ngModel)]="tool.organization"
                (ngModelChange)="markDirty(); loadProjects()"
                placeholder="GitHub organization name (e.g. my-org)"
              />
            </div>
          }

          <!-- GitHub Connectivity (PAT) -->
          @if (isGitHubTool() && tool.token) {
            <div class="section-divider">
              <span class="section-label">PAT Connection</span>
            </div>

            <div class="connectivity-row">
              <button
                class="connectivity-btn"
                [disabled]="connectivityChecking"
                (click)="checkConnectivity()"
              >
                @if (connectivityChecking) {
                  <span class="spinner"></span>
                  Checking...
                } @else {
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <path d="M22 4L12 14.01l-3-3"/>
                  </svg>
                  Check Connectivity
                }
              </button>

              @if (connectivityStatus === 'ok') {
                <span class="connectivity-result ok">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Connected as {{ connectivityUser }}
                </span>
              } @else if (connectivityStatus === 'error') {
                <span class="connectivity-result error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2.5">
                    <path d="M18 6L6 18"/>
                    <path d="M6 6l12 12"/>
                  </svg>
                  {{ connectivityError }}
                </span>
              }
            </div>
          }

          <!-- Projects for this organization -->
          @if (isGitHubTool() && tool.organization && toolProjects.length > 0) {
            <div class="orgs-section">
              <label>Projects in {{ tool.organization }}</label>
              <div class="orgs-list">
                @for (project of toolProjects; track project.id) {
                  <div class="project-row flat" [class.synced]="isSynced(project)">
                    <span class="project-number">#{{ project.number }}</span>
                    <span class="project-name">{{ project.title }}</span>
                    @if (isSyncing(project)) {
                      <span class="sync-status syncing">
                        <span class="spinner"></span>
                        Syncing...
                      </span>
                    } @else if (isSynced(project)) {
                      <span class="sync-status synced-label">Synced</span>
                    }
                    <button
                      class="toggle-btn"
                      [class.enabled]="isSynced(project)"
                      [disabled]="isSyncing(project)"
                      (click)="toggleSync(project)"
                    >
                      <div class="toggle-track">
                        <div class="toggle-thumb"></div>
                      </div>
                    </button>
                  </div>
                }
              </div>
              @if (syncError) {
                <div class="sync-error">{{ syncError }}</div>
              }
              @if (syncResultMessage) {
                <div class="sync-success">{{ syncResultMessage }}</div>
              }
            </div>
          }

          <!-- Prompt -->
          @if (showField('prompt')) {
            <div class="form-group">
              <label>System Prompt</label>
              <textarea
                [(ngModel)]="tool.prompt"
                (ngModelChange)="markDirty()"
                placeholder="Custom system prompt for this tool..."
                rows="4"
              ></textarea>
            </div>
          }

          <!-- Extra (JSON) -->
          @if (showField('extra')) {
            <div class="form-group">
              <label>Extra Configuration (JSON)</label>
              <textarea
                [(ngModel)]="tool.extra"
                (ngModelChange)="markDirty()"
                placeholder="{}"
                rows="3"
                class="mono"
              ></textarea>
            </div>
          }

          <!-- Save -->
          <div class="form-actions">
            <div></div>
            <button
              class="save-btn"
              [disabled]="!dirty"
              (click)="save()"
            >Save Changes</button>
          </div>
        </div>
      </div>
    } @else {
      <div class="not-found">
        <h2>Tool not found</h2>
        <button class="back-link" (click)="goBack()">Back to Tools</button>
      </div>
    }
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
        align-items: center;
        gap: 12px;
        margin-bottom: 28px;
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
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
      .type-badge {
        font-size: 11px;
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
        padding: 3px 10px;
        border-radius: 4px;
        font-weight: 600;
        text-transform: capitalize;
      }

      /* Form content */
      .form-content {
        max-width: 560px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* Form group (label + input stacked) */
      .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text-muted);
        margin-bottom: 6px;
      }
      .form-group input,
      .form-group textarea {
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
        resize: vertical;
      }
      .form-group input::placeholder,
      .form-group textarea::placeholder {
        color: var(--app-text-muted);
        opacity: 0.4;
      }
      .form-group input:focus,
      .form-group textarea:focus {
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary), transparent 85%);
      }
      .form-group textarea.mono {
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
        font-size: 12px;
      }

      /* Form row (label + control side by side) */
      .form-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
      }
      .form-row-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .form-row-label .label {
        font-size: 13px;
        font-weight: 600;
        color: var(--app-text);
      }
      .form-row-label .hint {
        font-size: 11px;
        color: var(--app-text-muted);
      }

      /* Toggle */
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

      /* Input with button */
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

      /* Label with help button */
      .label-with-help {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .label-with-help label {
        margin-bottom: 0;
      }
      .help-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--app-text-muted);
        cursor: pointer;
        transition: all 0.15s;
        padding: 0;
        margin-bottom: 6px;
      }
      .help-btn:hover,
      .help-btn.active {
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
      }

      /* Token help card */
      .token-help-card {
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 8px;
        padding: 14px 16px;
        margin-bottom: 8px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--app-text);
      }
      .token-help-title {
        font-weight: 700;
        font-size: 12px;
        margin-bottom: 8px;
        color: var(--app-text);
      }
      .token-help-steps {
        margin: 0;
        padding-left: 18px;
      }
      .token-help-steps li {
        margin-bottom: 4px;
      }
      .token-help-steps ul {
        margin: 4px 0 4px 0;
        padding-left: 16px;
        list-style: disc;
      }
      .token-help-steps ul li {
        margin-bottom: 2px;
      }
      .token-help-steps strong {
        color: var(--app-text);
      }
      .token-help-note {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid var(--app-border);
        color: var(--app-text-muted);
        font-size: 11px;
      }
      .token-help-note code {
        background: var(--app-background);
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 11px;
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
        border: 1px solid var(--app-border);
      }

      /* Input with reveal (token) */
      .input-with-reveal {
        display: flex;
        position: relative;
      }
      .input-with-reveal input {
        width: 100%;
        padding-right: 40px;
        padding: 10px 40px 10px 12px;
        background: var(--app-background);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: all 0.15s;
      }
      .input-with-reveal input::placeholder {
        color: var(--app-text-muted);
        opacity: 0.4;
      }
      .input-with-reveal input:focus {
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary), transparent 85%);
      }
      .reveal-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--app-text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: color 0.15s;
      }
      .reveal-btn:hover {
        color: var(--app-text);
      }

      /* Editor detection */
      .detection-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .detection-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }
      .detection-status.found {
        color: #22c55e;
      }
      .detection-status.not-found {
        color: var(--app-text-muted);
      }
      .detection-status.checking {
        color: var(--app-text-muted);
        opacity: 0.6;
      }
      .cli-path {
        font-size: 11px;
        color: var(--app-text-muted);
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
        background: var(--app-background);
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid var(--app-border);
      }
      .detect-btn {
        padding: 4px 10px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: 4px;
        color: var(--app-text-muted);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .detect-btn:hover {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
      }

      /* Section divider */
      .section-divider {
        padding-top: 8px;
        border-top: 1px solid var(--app-border);
      }
      .section-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--app-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Connectivity */
      .connectivity-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .connectivity-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
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
      .connectivity-btn:hover:not(:disabled) {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        border-color: var(--theme-primary);
      }
      .connectivity-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid var(--app-border);
        border-top-color: var(--theme-primary);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .connectivity-result {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }
      .connectivity-result.ok {
        color: #22c55e;
      }
      .connectivity-result.error {
        color: #ef4444;
        font-weight: 500;
        font-size: 12px;
      }

      /* Organizations */
      .orgs-section label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text-muted);
        margin-bottom: 8px;
      }
      .orgs-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        border: 1px solid var(--app-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .org-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--app-surface);
        transition: background-color 0.12s;
      }
      .org-row:not(:last-child) {
        border-bottom: 1px solid var(--app-border);
      }
      .org-avatar {
        border-radius: 4px;
        flex-shrink: 0;
      }
      .org-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--app-text);
        flex: 1;
      }
      .org-count {
        font-size: 11px;
        color: var(--app-text-muted);
        background: var(--app-background);
        padding: 2px 8px;
        border-radius: 10px;
        border: 1px solid var(--app-border);
        white-space: nowrap;
      }
      .project-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px 8px 48px;
        background: var(--app-background);
        border-bottom: 1px solid var(--app-border);
      }
      .project-row.flat {
        padding-left: 14px;
      }
      .project-row:last-child {
        border-bottom: none;
      }
      .project-row.synced {
        background: color-mix(in srgb, var(--theme-primary), transparent 95%);
      }
      .project-row .toggle-btn {
        margin-left: auto;
        flex-shrink: 0;
      }
      .project-row .toggle-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .sync-status {
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      .sync-status.syncing {
        color: var(--theme-primary);
      }
      .sync-status.synced-label {
        color: #22c55e;
      }
      .project-number {
        font-size: 12px;
        font-weight: 600;
        color: var(--app-text-muted);
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
        white-space: nowrap;
      }
      .project-type-badge {
        font-size: 10px;
        font-weight: 600;
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
        padding: 2px 7px;
        border-radius: 3px;
        white-space: nowrap;
        text-transform: capitalize;
      }
      .project-name {
        font-size: 12px;
        color: var(--app-text);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .project-sync {
        font-size: 10px;
        color: var(--app-text-muted);
        white-space: nowrap;
      }
      .sync-error {
        margin-top: 8px;
        padding: 10px 14px;
        background: color-mix(in srgb, #ef4444, transparent 90%);
        border: 1px solid color-mix(in srgb, #ef4444, transparent 70%);
        border-radius: 6px;
        color: #ef4444;
        font-size: 12px;
        line-height: 1.5;
      }
      .sync-success {
        margin-top: 8px;
        padding: 10px 14px;
        background: color-mix(in srgb, #22c55e, transparent 90%);
        border: 1px solid color-mix(in srgb, #22c55e, transparent 70%);
        border-radius: 6px;
        color: #22c55e;
        font-size: 12px;
        font-weight: 600;
      }

      /* Actions */
      .form-actions {
        display: flex;
        justify-content: space-between;
        padding-top: 12px;
        border-top: 1px solid var(--app-border);
      }
      .save-btn {
        padding: 8px 20px;
        background: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .save-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .save-btn:hover:not(:disabled) {
        background: var(--theme-primary-hover);
      }

      /* Sync all button */
      .sync-all-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-left: auto;
        padding: 5px 12px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--theme-primary);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .sync-all-btn:hover:not(:disabled) {
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        border-color: var(--theme-primary);
      }
      .sync-all-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Log button */
      .log-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: 6px;
        color: var(--app-text-muted);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .log-btn:hover, .log-btn.active {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
      }

      /* Log panel */
      .log-panel {
        border: 1px solid var(--app-border);
        border-radius: 10px;
        background: var(--app-background);
        margin-bottom: 20px;
        overflow: hidden;
        max-height: 400px;
        display: flex;
        flex-direction: column;
      }
      .log-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--app-surface);
        border-bottom: 1px solid var(--app-border);
        flex-shrink: 0;
      }
      .log-panel-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--app-text);
      }
      .log-panel-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .log-action-btn {
        padding: 3px 10px;
        background: transparent;
        border: 1px solid var(--app-border);
        border-radius: 4px;
        color: var(--app-text-muted);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .log-action-btn:hover {
        color: var(--theme-primary);
        border-color: var(--theme-primary);
      }
      .log-action-btn.danger:hover {
        color: #ef4444;
        border-color: #ef4444;
      }
      .log-close-btn {
        background: none;
        border: none;
        color: var(--app-text-muted);
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .log-close-btn:hover {
        color: var(--app-text);
      }
      .log-panel-body {
        overflow-y: auto;
        flex: 1;
        padding: 4px 0;
      }
      .log-empty {
        padding: 24px 14px;
        text-align: center;
        color: var(--app-text-muted);
        font-size: 12px;
      }
      .log-entry {
        padding: 6px 14px;
        font-size: 12px;
        line-height: 1.4;
        border-bottom: 1px solid color-mix(in srgb, var(--app-border), transparent 50%);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: baseline;
      }
      .log-entry:last-child {
        border-bottom: none;
      }
      .log-time {
        font-size: 10px;
        color: var(--app-text-muted);
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
        white-space: nowrap;
      }
      .log-level {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 0 5px;
        border-radius: 3px;
        white-space: nowrap;
      }
      .log-info .log-level {
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 88%);
      }
      .log-warn .log-level {
        color: #eab308;
        background: color-mix(in srgb, #eab308, transparent 88%);
      }
      .log-error .log-level {
        color: #ef4444;
        background: color-mix(in srgb, #ef4444, transparent 88%);
      }
      .log-debug .log-level {
        color: var(--app-text-muted);
        background: var(--app-surface);
      }
      .log-project {
        font-size: 10px;
        font-weight: 600;
        color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 90%);
        padding: 0 6px;
        border-radius: 3px;
        white-space: nowrap;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .log-message {
        color: var(--app-text);
        flex: 1;
        min-width: 0;
      }
      .log-detail {
        width: 100%;
        font-size: 11px;
        color: var(--app-text-muted);
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
        background: var(--app-surface);
        padding: 4px 8px;
        border-radius: 4px;
        white-space: pre-wrap;
        word-break: break-all;
      }

      /* Not found */
      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--app-text-muted);
        gap: 12px;
      }
      .not-found h2 {
        font-size: 18px;
        color: var(--app-text);
      }
      .back-link {
        padding: 8px 16px;
        background: var(--theme-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .back-link:hover {
        background: var(--theme-primary-hover);
      }
    `,
  ],
})
export class ToolConfigureComponent implements OnInit {
  tool: Tool | null = null;
  dirty = false;
  showToken = false;
  showTokenHelp = false;

  // Editor detection
  editorDetected: boolean | null = null;
  editorCliPath = '';

  // GitHub connectivity (PAT)
  connectivityStatus: 'idle' | 'ok' | 'error' = 'idle';
  connectivityChecking = false;
  connectivityUser = '';
  connectivityError = '';
  toolProjects: any[] = [];

  // Project sync
  syncedProjectIds = new Set<string>();
  syncingProjectId: string | null = null;
  syncError: string | null = null;
  syncResultMessage: string | null = null;

  // Sync all
  syncAllRunning = false;

  // Sync log panel
  showLogPanel = false;
  syncLogs: any[] = [];

  // Copilot / gh CLI connectivity
  copilotAuthChecked = false;
  copilotAuthenticated = false;
  copilotLogin = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toolSettingsService: ToolSettingsService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Ensure tools are loaded
      if (this.toolSettingsService.tools.length === 0) {
        await this.toolSettingsService.loadTools();
      }
      const found = this.toolSettingsService.tools.find((t) => t.id === id);
      if (found) {
        // Work on a copy to avoid mutating the list before save
        this.tool = { ...found };
      }

      if (this.tool?.toolType === 'editor') {
        this.detectEditor();
      }

      if (this.tool && this.isGitHubTool()) {
        this.checkCopilotAuth();
        this.loadProjects();
        this.loadSyncedProjects();
      }
    }
  }

  showField(field: string): boolean {
    if (!this.tool) return false;
    const type = this.tool.toolType;

    switch (field) {
      case 'description':
        return true;
      case 'localPath':
        return ['editor', 'mcp', 'rag'].includes(type);
      case 'token':
        return ['mcp', 'rag', 'repository', 'project management'].includes(type);
      case 'prompt':
        return ['mcp', 'rag', 'background agent', 'project design', 'system design', 'ux design'].includes(type);
      case 'extra':
        return ['mcp', 'rag', 'repository', 'project management', 'background agent'].includes(type);
      default:
        return false;
    }
  }

  async toggleEnabled(): Promise<void> {
    if (!this.tool) return;
    this.tool.isEnabled = !this.tool.isEnabled;
    await this.toolSettingsService.updateTool(this.tool.id, {
      isEnabled: this.tool.isEnabled,
    });
  }

  isGitHubTool(): boolean {
    if (!this.tool) return false;
    return ['repository', 'project management'].includes(this.tool.toolType);
  }

  markDirty(): void {
    this.dirty = true;
  }

  async save(): Promise<void> {
    if (!this.tool || !this.dirty) return;
    const { id, ...fields } = this.tool;
    await this.toolSettingsService.updateTool(id, fields);
    this.dirty = false;
    // Update the local list copy
    const idx = this.toolSettingsService.tools.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.toolSettingsService.tools[idx] = { ...this.tool };
    }
  }

  async detectEditor(): Promise<void> {
    if (!this.tool) return;
    this.editorDetected = null;
    const electron = (window as any).electronAPI;
    let result: { found: boolean; path: string; cli: string } | null = null;

    const title = this.tool.title.toLowerCase();
    if (title.includes('vs code') || title.includes('vscode') || title.includes('visual studio code')) {
      result = await electron?.vscodeFindInstallation?.();
    } else if (title.includes('cursor')) {
      result = await electron?.cursorFindInstallation?.();
    } else if (title.includes('antigravity')) {
      result = await electron?.antigravityFindInstallation?.();
    }

    if (result) {
      this.editorDetected = result.found;
      this.editorCliPath = result.cli;
      // Auto-set localPath from detected path if not already set
      if (result.found && !this.tool.localPath) {
        const detectedPath = result.cli || result.path;
        if (detectedPath) {
          this.tool.localPath = detectedPath;
          this.markDirty();
        }
      }
    } else {
      this.editorDetected = false;
    }
  }

  async pickPath(): Promise<void> {
    const electron = (window as any).electronAPI;
    if (electron?.selectDirectory) {
      const path = await electron.selectDirectory();
      if (path && this.tool) {
        this.tool.localPath = path;
        this.markDirty();
      }
    }
  }

  async checkConnectivity(): Promise<void> {
    if (!this.tool) return;
    const electron = (window as any).electronAPI;
    if (!electron?.githubCheckConnectivity) return;

    this.connectivityChecking = true;
    this.connectivityStatus = 'idle';

    try {
      const result = await electron.githubCheckConnectivity(this.tool.token);
      if (result.ok) {
        this.connectivityStatus = 'ok';
        this.connectivityUser = result.login;
      } else {
        this.connectivityStatus = 'error';
        this.connectivityError = result.error || 'Connection failed';
      }
    } catch {
      this.connectivityStatus = 'error';
      this.connectivityError = 'Connection failed';
    } finally {
      this.connectivityChecking = false;
    }
  }

  async checkCopilotAuth(): Promise<void> {
    const electron = (window as any).electronAPI;
    if (!electron?.copilotGetAuthStatus) return;

    try {
      const status = await electron.copilotGetAuthStatus();
      this.copilotAuthChecked = true;

      if (status?.isAuthenticated) {
        this.copilotAuthenticated = true;
        this.copilotLogin = status.login || '';
      }
    } catch {
      this.copilotAuthChecked = true;
    }
  }

  async loadProjects(): Promise<void> {
    if (!this.tool?.organization || !this.tool?.token) {
      this.toolProjects = [];
      return;
    }
    const electron = (window as any).electronAPI;
    if (!electron?.githubGetOrgProjects) return;
    const projects = await electron.githubGetOrgProjects(this.tool.token, this.tool.organization);
    this.toolProjects = (projects || []).filter((p: any) => !p.closed);
  }

  async loadSyncedProjects(): Promise<void> {
    if (!this.tool) return;
    const electron = (window as any).electronAPI;
    if (!electron?.getProjectsByTool) return;
    const synced = await electron.getProjectsByTool(this.tool.id);
    this.syncedProjectIds = new Set((synced || []).map((p: any) => p.externalId));
  }

  async toggleSync(project: any): Promise<void> {
    if (!this.tool) return;
    const electron = (window as any).electronAPI;
    if (!electron) return;

    const projectNodeId = project.id;

    if (this.syncedProjectIds.has(projectNodeId)) {
      await electron.githubUnsyncProject(projectNodeId, this.tool.id);
      this.syncedProjectIds = new Set(this.syncedProjectIds);
      this.syncedProjectIds.delete(projectNodeId);
    } else {
      this.syncingProjectId = projectNodeId;
      this.syncError = null;
      this.syncResultMessage = null;
      try {
        const result = await electron.githubSyncProject(
          this.tool.token,
          projectNodeId,
          project.title,
          project.number,
          this.tool.id,
          this.tool.organization,
        );
        if (result?.error) {
          this.syncError = result.error;
        }
        if (result?.total > 0) {
          this.syncedProjectIds = new Set(this.syncedProjectIds);
          this.syncedProjectIds.add(projectNodeId);
          this.syncResultMessage = `Synced ${result?.total || 0} items (${result?.created || 0} new, ${result?.updated || 0} updated)`;
        }
      } catch (err: any) {
        this.syncError = err?.message || 'Sync failed';
      } finally {
        this.syncingProjectId = null;
        if (this.showLogPanel) {
          await this.loadSyncLogs();
        }
      }
    }
  }

  isSynced(project: any): boolean {
    return this.syncedProjectIds.has(project.id);
  }

  isSyncing(project: any): boolean {
    return this.syncingProjectId === project.id;
  }

  async toggleLogPanel(): Promise<void> {
    this.showLogPanel = !this.showLogPanel;
    if (this.showLogPanel) {
      await this.loadSyncLogs();
    }
  }

  async loadSyncLogs(): Promise<void> {
    if (!this.tool) return;
    const electron = (window as any).electronAPI;
    if (!electron?.getSyncLogs) return;
    this.syncLogs = await electron.getSyncLogs(this.tool.id);
  }

  async clearSyncLogs(): Promise<void> {
    if (!this.tool) return;
    const electron = (window as any).electronAPI;
    if (!electron?.clearSyncLogs) return;
    await electron.clearSyncLogs(this.tool.id);
    this.syncLogs = [];
  }

  async syncAll(): Promise<void> {
    if (!this.tool || this.syncAllRunning) return;
    const electron = (window as any).electronAPI;
    if (!electron?.githubSyncProject) return;

    this.syncAllRunning = true;
    this.syncError = null;
    this.syncResultMessage = null;

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalItems = 0;
    let errors: string[] = [];

    // Sync each project that has a matching entry in toolProjects
    const projectsToSync = this.toolProjects.filter((p: any) => this.syncedProjectIds.has(p.id));

    for (const project of projectsToSync) {
      try {
        const result = await electron.githubSyncProject(
          this.tool.token,
          project.id,
          project.title,
          project.number,
          this.tool.id,
          this.tool.organization,
        );
        if (result?.error) {
          errors.push(`${project.title}: ${result.error}`);
        }
        totalCreated += result?.created || 0;
        totalUpdated += result?.updated || 0;
        totalItems += result?.total || 0;
      } catch (err: any) {
        errors.push(`${project.title}: ${err?.message || 'Sync failed'}`);
      }
    }

    if (errors.length > 0) {
      this.syncError = errors.join('\n');
    }
    this.syncResultMessage = `Synced ${totalItems} items across ${projectsToSync.length} projects (${totalCreated} new, ${totalUpdated} updated)`;
    this.syncAllRunning = false;

    if (this.showLogPanel) {
      await this.loadSyncLogs();
    }
  }

  goBack(): void {
    this.router.navigate(['/tools']);
  }
}
