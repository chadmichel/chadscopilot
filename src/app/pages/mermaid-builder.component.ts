import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../chat/chat.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import mermaid from 'mermaid';

@Component({
    selector: 'app-mermaid-builder',
    standalone: true,
    imports: [CommonModule, FormsModule, ChatComponent],
    template: `
    <div class="builder-container">
      <header class="builder-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          <h1>Mermaid Builder</h1>
        </div>
        <div class="path-input-group">
          <label for="path">File Path:</label>
          <input 
            id="path" 
            type="text" 
            [(ngModel)]="filePath" 
            (ngModelChange)="onPathChange()"
            placeholder="designs/diagram.md" 
          />
        </div>
        <div class="header-actions">
           <button class="save-btn" (click)="saveFile()" [disabled]="!isDirty">
             Save
           </button>
        </div>
      </header>

      <div class="builder-body">
        <div class="agent-side">
          <app-chat
            [workspaceId]="'mermaid-' + workspaceId"
            [folderPath]="workspace?.folderPath || ''"
            [contextProvider]="getMermaidContext">
          </app-chat>
        </div>

        <div class="editor-side">
          <div class="side-tabs">
            <button [class.active]="activeTab === 'markdown'" (click)="activeTab = 'markdown'">Markdown</button>
            <button [class.active]="activeTab === 'visual'" (click)="activeTab = 'visual'">Visual</button>
          </div>
          
          <div class="tab-content">
            @if (activeTab === 'markdown') {
              <textarea 
                class="markdown-editor" 
                [(ngModel)]="content" 
                (ngModelChange)="onContentChange()"
                spellcheck="false"
              ></textarea>
            } @else {
              <div class="visual-container">
                 <button class="refresh-btn" (click)="renderMermaid()" title="Refresh diagram">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <polyline points="23 4 23 10 17 10"/>
                     <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                   </svg>
                   Refresh
                 </button>
                 <div #mermaidContainer class="mermaid-output"></div>
                 @if (error) {
                   <div class="error-overlay">{{ error }}</div>
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
      padding: 0 20px;
      gap: 30px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      -webkit-app-region: drag;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--theme-primary);
    }

    .header-left h1 {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
    }

    .path-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 600px;
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
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
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

    .markdown-editor {
      flex: 1;
      background: var(--app-background);
      color: var(--app-text);
      border: none;
      padding: 24px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      outline: none;
    }

    .visual-container {
      flex: 1;
      padding: 40px;
      overflow: auto;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .refresh-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--app-surface);
      color: var(--app-text-muted);
      border: 1px solid var(--app-border);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      z-index: 5;
    }
    .refresh-btn:hover {
      color: var(--theme-primary);
      border-color: var(--theme-primary);
    }

    .mermaid-output {
      width: 100%;
    }

    .error-overlay {
      position: absolute;
      top: 20px;
      right: 20px;
      background: #fee2e2;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid #f87171;
      font-size: 12px;
      max-width: 300px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  `]
})
export class MermaidBuilderComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('mermaidContainer') mermaidContainer!: ElementRef;

    workspaceId: string = '';
    filePath: string = 'designs/mermaid.md';
    workspace: Workspace | null = null;
    content: string = `graph TD
  A[Start] --> B(Process)
  B --> C{Decision}
  C --> D[Result 1]
  C --> E[Result 2]`;
    isDirty = false;
    activeTab: 'markdown' | 'visual' = 'visual';
    error: string | null = null;
    private chatSub?: Subscription;

    getMermaidContext = (): string => {
        if (!this.content.trim()) return '';
        return `You are a Mermaid diagram assistant. Here is the current diagram:\n\`\`\`mermaid\n${this.content}\n\`\`\`\n\nIMPORTANT: Do NOT include explanatory text in your response. Output ONLY the full updated mermaid diagram inside a single \`\`\`mermaid code block with no other text.`;
    };

    private get electron() { return (window as any).electronAPI; }

    constructor(
        private route: ActivatedRoute,
        private workspaceService: WorkspaceService,
        private chatService: ChatService
    ) { }

    async ngOnInit() {
        this.route.queryParams.subscribe(async params => {
            this.workspaceId = params['workspaceId'] || '';
            this.filePath = params['filePath'] || 'designs/mermaid.md';

            await this.workspaceService.loadWorkspaces();
            this.workspace = this.workspaceService.getWorkspace(this.workspaceId) || null;

            if (this.workspace) {
                await this.loadFile();
            }
        });

        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
        });

        // Watch for agent updates
        this.chatSub = this.chatService.messages$.subscribe(allMessages => {
            const myMessages = allMessages['mermaid-' + this.workspaceId] || [];
            if (myMessages.length === 0) return;

            const lastMessage = myMessages[myMessages.length - 1];
            if (lastMessage.role === 'assistant') {
                const match = lastMessage.content.match(/```mermaid\s*([\s\S]*?)```/);
                if (match) {
                    const extracted = match[1].trim();
                    if (extracted !== this.content) {
                        this.content = extracted;
                        this.isDirty = true;
                        this.renderMermaid();
                    }
                }
            }
        });
    }

    ngAfterViewInit() {
        this.renderMermaid();
    }

    ngOnDestroy() {
        this.chatSub?.unsubscribe();
    }

    async loadFile() {
        if (!this.workspace) return;
        const fullPath = this.getFullPath();
        const result = await this.electron.readFile(fullPath);
        if (result !== null) {
            this.content = result;
            this.isDirty = false;
            this.renderMermaid();
        }
    }

    async saveFile() {
        if (!this.workspace) return;
        const fullPath = this.getFullPath();
        const success = await this.electron.writeFile(fullPath, this.content);
        if (success) {
            this.isDirty = false;
        }
    }

    onContentChange() {
        this.isDirty = true;
        if (this.activeTab === 'visual') {
            this.renderMermaid();
        }
    }

    onPathChange() {
        // Maybe reload? Or just wait for save.
    }

    private getFullPath() {
        if (!this.workspace) return '';
        const sep = this.workspace.folderPath.includes('\\') ? '\\' : '/';
        return `${this.workspace.folderPath}${sep}${this.filePath}`;
    }

    async renderMermaid() {
        if (!this.mermaidContainer) return;
        const container = this.mermaidContainer.nativeElement;
        container.innerHTML = '';
        this.error = null;

        if (!this.content.trim()) return;

        try {
            let mermaidCode = this.content;
            const match = this.content.match(/```mermaid([\s\S]*?)```/);
            if (match) {
                mermaidCode = match[1].trim();
            }

            const id = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
            const rendered = await mermaid.render(id, mermaidCode);
            container.innerHTML = rendered.svg;
        } catch (err: any) {
            console.error('Mermaid render error:', err);
            this.error = err.message || 'Failed to render diagram';
        }
    }
}
