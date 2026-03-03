import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-backup',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page">
      <div class="header">
        <h1>Backup & Restore</h1>
        <p class="subtitle">Securely manage your application data locally.</p>
      </div>

      <div class="content-grid">
        <div class="card">
          <div class="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <h3>Backup Database</h3>
          <p>Export your current workspaces, tasks, and time logs to a standalone SQLite database file.</p>
          <button (click)="backup()" class="primary-btn" [disabled]="busy">
            {{ busy ? 'Backing up...' : 'Save Backup' }}
          </button>
        </div>

        <div class="card danger">
          <div class="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3>Restore Database</h3>
          <p>Overwrite your current data with a previously saved backup file. <strong>Warning: This will restart the application and replace all existing data.</strong></p>
          <button (click)="restore()" class="danger-btn" [disabled]="busy">
            {{ busy ? 'Restoring...' : 'Restore from File' }}
          </button>
        </div>
      </div>

      <div class="info-footer" *ngIf="message">
        <div class="message-banner" [class.error]="isError">
          {{ message }}
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page {
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
      color: var(--app-text);
    }
    .header {
      margin-bottom: 40px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 800;
    }
    .subtitle {
      color: var(--app-text-muted);
      font-size: 16px;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .card {
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      border-color: var(--theme-primary);
      transform: translateY(-2px);
    }
    .card.danger:hover {
      border-color: #ff4d4f;
    }
    .card-icon {
      width: 64px;
      height: 64px;
      background: color-mix(in srgb, var(--theme-primary), transparent 90%);
      color: var(--theme-primary);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .danger .card-icon {
      background: color-mix(in srgb, #ff4d4f, transparent 90%);
      color: #ff4d4f;
    }
    h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 700;
    }
    p {
      color: var(--app-text-muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
      flex: 1;
    }
    .primary-btn, .danger-btn {
      width: 100%;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .primary-btn {
      background: var(--theme-primary);
      color: white;
    }
    .primary-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }
    .danger-btn {
      background: transparent;
      border: 1px solid #ff4d4f;
      color: #ff4d4f;
    }
    .danger-btn:hover:not(:disabled) {
      background: #ff4d4f;
      color: white;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .info-footer {
      margin-top: 32px;
    }
    .message-banner {
      padding: 16px;
      border-radius: 12px;
      background: rgba(0, 255, 0, 0.1);
      color: #4caf50;
      text-align: center;
      font-weight: 500;
    }
    .message-banner.error {
      background: rgba(255, 0, 0, 0.1);
      color: #ff4d4f;
    }
  `]
})
export class BackupComponent {
    busy = false;
    message = '';
    isError = false;

    async backup() {
        this.busy = true;
        this.message = '';
        const electron = (window as any).electronAPI;

        try {
            const result = await electron.dbBackup();
            if (result.success) {
                this.message = 'Backup saved successfully!';
                this.isError = false;
            } else {
                if (result.error) {
                    this.message = `Backup failed: ${result.error}`;
                    this.isError = true;
                }
            }
        } catch (err) {
            this.message = 'An unexpected error occurred during backup.';
            this.isError = true;
        } finally {
            this.busy = false;
        }
    }

    async restore() {
        if (!confirm('Are you absolutely sure? This will replace all current data and restart the application.')) {
            return;
        }

        this.busy = true;
        this.message = '';
        const electron = (window as any).electronAPI;

        try {
            const result = await electron.dbRestore();
            if (!result.success && result.error) {
                this.message = `Restore failed: ${result.error}`;
                this.isError = true;
            }
            // If success, the app exits, so no need for feedback here
        } catch (err) {
            this.message = 'An unexpected error occurred during restore.';
            this.isError = true;
        } finally {
            this.busy = false;
        }
    }
}
