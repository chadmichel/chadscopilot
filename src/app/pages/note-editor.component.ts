import { Component, OnInit, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="note-editor-container">
      <header class="note-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
            <path d="M10 9H8"/>
          </svg>
        </div>
        <div class="note-title-display">
          <span class="editor-type">Note Editor</span>
          <span class="separator">|</span>
          <span class="actual-name">{{ noteName }}</span>
        </div>
        <div class="header-right" style="-webkit-app-region: no-drag;">
          <div class="save-status" [class.dirty]="isDirty">
            {{ isDirty ? 'Unsaved changes' : 'All changes saved' }}
          </div>
          <button class="save-btn" (click)="saveNote()" [disabled]="!isDirty">Save</button>
          <button class="dialog-close" (click)="closeWindow()" style="margin-left: 12px; background: transparent; border: none; color: var(--app-text-muted); cursor: pointer;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </header>

      <div class="editor-body">
        <div class="agent-side" [style.width.px]="agentWidth">
          <app-chat
            [workspaceId]="'note-' + workspaceId"
            [folderPath]="workspaceFolderPath"
            [contextProvider]="getNoteContext"
            [hideJson]="true">
          </app-chat>
        </div>

        <div class="resizer" (mousedown)="startResizing($event)"></div>

        <div class="note-side">
          <div class="side-tabs">
            <button [class.active]="activeTab === 'markdown'" (click)="activeTab = 'markdown'">Markdown</button>
            <button [class.active]="activeTab === 'preview'" (click)="onPreviewTab()">Preview</button>
          </div>

          <div class="tab-content">
            @if (activeTab === 'markdown') {
              <textarea 
                class="markdown-input" 
                [(ngModel)]="noteContent" 
                (ngModelChange)="onContentChange()"
                placeholder="Start writing your note in Markdown...">
              </textarea>
            } @else {
              <div class="markdown-preview" [innerHTML]="renderedContent"></div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .note-editor-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--app-background);
      color: var(--app-text);
      overflow: hidden;
    }

    .note-header {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      -webkit-app-region: drag;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      color: var(--theme-primary);
      flex: 1;
    }

    .note-title-display {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 3;
      justify-content: center;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
    }

    .editor-type {
      font-weight: 700;
      color: var(--theme-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 12px;
    }

    .separator {
      color: var(--app-border);
      font-weight: 300;
    }

    .actual-name {
      font-weight: 600;
      color: var(--app-text);
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      justify-content: flex-end;
    }

    .save-status {
      font-size: 11px;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .save-status.dirty {
      color: var(--theme-primary);
      font-weight: 700;
    }

    .save-btn {
      background: var(--theme-primary);
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .editor-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .agent-side {
      flex-shrink: 0;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .resizer {
      width: 4px;
      background: transparent;
      cursor: col-resize;
      flex-shrink: 0;
      transition: background 0.2s;
      z-index: 10;
      margin: 0 -2px;
    }

    .resizer:hover, .resizer:active {
      background: var(--theme-primary);
    }

    .note-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--app-background);
    }

    .side-tabs {
      display: flex;
      padding: 0 16px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      gap: 8px;
      flex-shrink: 0;
    }

    .side-tabs button {
      padding: 12px 16px;
      background: transparent;
      border: none;
      color: var(--app-text-muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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

    .markdown-input {
      flex: 1;
      width: 100%;
      background: var(--app-background);
      color: var(--app-text);
      border: none;
      padding: 32px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 14px;
      line-height: 1.7;
      resize: none;
      outline: none;
    }

    .markdown-preview {
      flex: 1;
      padding: 40px 60px;
      overflow-y: auto;
      line-height: 1.7;
      color: var(--app-text);
      max-width: 900px;
      margin: 0 auto;
      width: 100%;
    }

    .markdown-preview h1 { border-bottom: 1px solid var(--app-border); padding-bottom: 0.3em; margin-bottom: 24px; font-size: 2em; }
    .markdown-preview h2 { border-bottom: 1px solid var(--app-border); padding-bottom: 0.3em; margin-top: 32px; margin-bottom: 16px; font-size: 1.5em; }
    .markdown-preview h3 { margin-top: 24px; margin-bottom: 16px; font-size: 1.25em; }
    .markdown-preview p { margin-bottom: 16px; }
    .markdown-preview code {
      background: var(--app-surface);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .markdown-preview pre {
      background: var(--app-surface);
      padding: 20px;
      border-radius: 8px;
      overflow: auto;
      margin-bottom: 20px;
      border: 1px solid var(--app-border);
    }
    .markdown-preview pre code {
      background: transparent;
      padding: 0;
    }
    .markdown-preview ul, .markdown-preview ol {
      margin-bottom: 16px;
      padding-left: 2em;
    }
    .markdown-preview blockquote {
      border-left: 4px solid var(--theme-primary);
      padding-left: 20px;
      color: var(--app-text-muted);
      margin: 0 0 20px 0;
      background: color-mix(in srgb, var(--theme-primary), transparent 95%);
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .markdown-preview hr {
      border: 0;
      border-top: 1px solid var(--app-border);
      margin: 32px 0;
    }
  `]
})
export class NoteEditorComponent implements OnInit, OnDestroy {
  workspaceId: string = '';
  filePath: string = '';
  noteName: string = '';
  workspaceFolderPath: string = '';
  workspace: Workspace | undefined;
  noteContent: string = '';
  renderedContent: SafeHtml = '';
  activeTab: 'markdown' | 'preview' = 'markdown';
  isDirty: boolean = false;

  agentWidth: number = 400;
  private isResizing = false;

  constructor(
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService,
    private sanitizer: DomSanitizer
  ) { }

  async ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      this.workspaceId = params['workspaceId'];
      this.filePath = params['filePath'];
      this.noteName = this.filePath.split('/').pop()?.replace('.md', '') || 'Untitled Note';
      await this.loadWorkspace();
      await this.loadNoteContent();
    });
  }

  ngOnDestroy() { }

  async loadWorkspace() {
    await this.workspaceService.getWorkspaces();
    this.workspace = this.workspaceService.getWorkspace(this.workspaceId);
    if (this.workspace) {
      this.workspaceFolderPath = this.workspace.folderPath;
    }
  }

  async loadNoteContent() {
    const electron = (window as any).electronAPI;
    const content = await electron.readFile(this.filePath);
    if (content !== null) {
      this.noteContent = content;
      this.updatePreview();
    }
  }

  onContentChange() {
    this.isDirty = true;
  }

  onPreviewTab() {
    this.activeTab = 'preview';
    this.updatePreview();
  }

  updatePreview() {
    try {
      const rawHtml = marked(this.noteContent) as string;
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    } catch (e) {
      console.error('Failed to render markdown', e);
      this.renderedContent = 'Error rendering preview';
    }
  }

  async saveNote() {
    if (!this.isDirty) return;
    const electron = (window as any).electronAPI;
    const success = await electron.writeFile(this.filePath, this.noteContent);
    if (success) {
      this.isDirty = false;
    }
  }

  closeWindow() {
    window.close();
  }

  startResizing(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isResizing) {
      const newWidth = event.clientX;
      if (newWidth >= 250 && newWidth <= 800) {
        this.agentWidth = newWidth;
      }
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isResizing = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.saveNote();
    }
  }

  getNoteContext = () => {
    return `You are helping the user edit a markdown note named "${this.noteName}".
The current content of the note is:
\`\`\`markdown
${this.noteContent}
\`\`\`

User instructions should be applied to this note. If the user asks for changes, provide the full updated content. Surround the updated content with a markdown block.`;
  }
}
