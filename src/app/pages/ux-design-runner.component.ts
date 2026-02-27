import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-ux-design-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  template: `
    <div class="runner-container">
      <div class="runner-header">
        <div class="title-area">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <h1>UX Design: {{ designName }}</h1>
        </div>
        
        <div class="header-actions">
           <div class="status-badge" [class.active]="isServerRunning">
            {{ isServerRunning ? 'Dev Server Running' : 'Idle' }}
          </div>

          <div class="button-group">
            @if (!isServerRunning) {
              <button class="action-btn start-btn" (click)="startServer()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Start
              </button>
            } @else {
               <button class="action-btn restart-btn" (click)="restartServer()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Restart
              </button>
              <button class="action-btn stop-btn" (click)="stopServer()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="6" y="6" width="12" height="12"/>
                </svg>
                Stop
              </button>
            }
          </div>
        </div>
      </div>

      <div class="runner-content">
        <div class="left-panel">
          <app-chat 
            [workspaceId]="sessionId" 
            [folderPath]="designPath"
            [contextProvider]="contextProvider"
          ></app-chat>
        </div>

        <div class="right-panel">
          @if (isServerRunning) {
            <iframe [src]="safeUrl" class="preview-iframe"></iframe>
          } @else {
            <div class="preview-placeholder">
              <div class="placeholder-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <h3>App Preview</h3>
                <p>Start the dev server to see your design in action.</p>
                <button class="start-btn-large" (click)="startServer()">Start Dev Server</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .runner-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--app-background);
      color: var(--app-text);
    }
    .runner-header {
      height: 56px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      -webkit-app-region: drag;
      position: relative;
    }
    .title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .title-area h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .header-actions {
      position: absolute;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      -webkit-app-region: no-drag;
    }
    .status-badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 20px;
      background: var(--app-background);
      border: 1px solid var(--app-border);
      color: var(--app-text-muted);
    }
    .status-badge.active {
      border-color: #22c55e;
      color: #22c55e;
    }
    .button-group {
      display: flex;
      gap: 8px;
    }
    .action-btn {
      padding: 6px 12px;
      border: 1px solid var(--app-border);
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      background: var(--app-surface);
      color: var(--app-text);
      transition: all 0.2s;
    }
    .action-btn:hover {
      background: var(--app-background);
    }
    .start-btn {
      border-color: #22c55e;
      color: #22c55e;
    }
    .start-btn:hover {
      background: #22c55e;
      color: white;
    }
    .stop-btn {
      border-color: #ef4444;
      color: #ef4444;
    }
    .stop-btn:hover {
      background: #ef4444;
      color: white;
    }
    .runner-content {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .left-panel {
      flex: 1;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
    }
    .right-panel {
      flex: 1.5;
      background: #000;
      display: flex;
      flex-direction: column;
    }
    .preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
    .preview-placeholder {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--app-text-muted);
      text-align: center;
    }
    .placeholder-content h3 {
      margin: 16px 0 8px;
      font-size: 18px;
    }
    .placeholder-content p {
      margin-bottom: 24px;
      opacity: 0.7;
    }
    .start-btn-large {
      padding: 12px 24px;
      background: #22c55e;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .start-btn-large:hover {
      transform: scale(1.05);
    }
  `]
})
export class UXDesignRunnerComponent implements OnInit, OnDestroy {
  workspaceId: string = '';
  designName: string = '';
  designPath: string = '';
  sessionId: string = '';
  isServerRunning: boolean = false;
  safeUrl: SafeResourceUrl | null = null;
  serverPort: number = 4200;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) { }

  async ngOnInit() {
    this.workspaceId = this.route.snapshot.queryParamMap.get('workspaceId') || '';
    this.designName = this.route.snapshot.queryParamMap.get('designName') || '';
    this.designPath = this.route.snapshot.queryParamMap.get('designPath') || '';
    this.sessionId = `ux-design-${this.designName}-${Date.now()}`;

    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`http://localhost:${this.serverPort}`);
  }

  async startServer() {
    const electron = (window as any).electronAPI;
    const result = await electron.uxStartDevServer(this.designPath);
    if (result.success) {
      this.isServerRunning = true;
      this.serverPort = result.port;
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`http://localhost:${this.serverPort}`);
    }
  }

  async stopServer() {
    const electron = (window as any).electronAPI;
    await electron.uxStopDevServer(this.designPath);
    this.isServerRunning = false;
  }

  async restartServer() {
    await this.stopServer();
    setTimeout(() => this.startServer(), 1000);
  }

  contextProvider = () => {
    return `You are an expert UX Designer and Frontend Developer working on a design called "${this.designName}".
The project files are located in: ${this.designPath}
You have full access to these files. You should update the UI components, styles, and logic to build out the features requested.
The app is currently running at http://localhost:${this.serverPort} and will auto-reload when you save changes.
Focus on creating a beautiful, modern, and functional design using Angular and PrimeNG.`;
  }

  ngOnDestroy() {
    this.stopServer();
  }
}
