import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FileEntry {
    name: string;
    isDirectory: boolean;
    isOpen?: boolean;
    children?: FileEntry[];
    path: string;
}

@Component({
    selector: 'app-file-explorer',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="explorer-container">
      <div class="explorer-header">
        <span>Files</span>
        <button class="refresh-btn" (click)="refresh()" title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
      
      <div class="explorer-body">
        <div class="tree-panel">
          <div class="tree-root">
            @for (entry of rootEntries; track entry.path) {
              <ng-container *ngTemplateOutlet="treeNode; context: { $implicit: entry, level: 0 }"></ng-container>
            }
          </div>
        </div>

        <div class="preview-panel">
          @if (selectedFileContent !== null) {
            <div class="preview-header">
              <span class="preview-filename">{{ selectedFileName }}</span>
            </div>
            <pre class="preview-content"><code>{{ selectedFileContent }}</code></pre>
          } @else {
            <div class="preview-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.2;">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>Select a file to preview</p>
            </div>
          }
        </div>
      </div>
    </div>

    <ng-template #treeNode let-node let-level="level">
      <div class="node-wrapper">
        <div class="node-row" 
             [style.padding-left.px]="level * 16 + 8"
             (click)="onNodeClick(node)"
             [class.active]="selectedPath === node.path">
          <span class="chevron" [class.open]="node.isOpen" *ngIf="node.isDirectory">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </span>
          <span class="chevron-spacer" *ngIf="!node.isDirectory"></span>
          
          <span class="icon">
            @if (node.isDirectory) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
              </svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            }
          </span>
          <span class="name">{{ node.name }}</span>
        </div>
        
        @if (node.isDirectory && node.isOpen && node.children) {
          <div class="children">
            @for (child of node.children; track child.path) {
              <ng-container *ngTemplateOutlet="treeNode; context: { $implicit: child, level: level + 1 }"></ng-container>
            }
          </div>
        }
      </div>
    </ng-template>
  `,
    styles: [`
    .explorer-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--app-background);
      color: var(--app-text);
    }
    .explorer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--app-border);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--app-text-muted);
      background: var(--app-surface);
    }
    .refresh-btn {
      background: transparent;
      border: none;
      color: var(--app-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
    }
    .refresh-btn:hover {
      background: var(--app-background);
      color: var(--theme-primary);
    }
    .explorer-body {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .tree-panel {
      width: 250px;
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      background: var(--app-surface);
    }
    .tree-root {
      flex: 1;
      overflow-y: auto;
      padding-top: 4px;
    }
    .preview-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--app-background);
    }
    .preview-header {
      padding: 8px 16px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-surface);
      font-size: 12px;
      font-weight: 600;
    }
    .preview-content {
      flex: 1;
      margin: 0;
      padding: 16px;
      overflow: auto;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 12px;
      line-height: 1.5;
      color: var(--app-text);
      background: var(--app-background);
    }
    .preview-placeholder {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--app-text-muted);
      gap: 12px;
    }
    .node-row {
      display: flex;
      align-items: center;
      height: 28px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      transition: background-color 0.1s;
    }
    .node-row:hover {
      background: var(--app-background);
    }
    .node-row.active {
      background: color-mix(in srgb, var(--theme-primary), transparent 90%);
      color: var(--theme-primary);
    }
    .chevron {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
      color: var(--app-text-muted);
    }
    .chevron.open {
      transform: rotate(90deg);
    }
    .chevron-spacer {
      width: 16px;
    }
    .icon {
      margin-left: 2px;
      margin-right: 8px;
      display: flex;
      align-items: center;
      color: var(--app-text-muted);
    }
    .node-row:hover .icon,
    .node-row.active .icon {
      color: var(--theme-primary);
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class FileExplorerComponent implements OnInit {
    @Input() folderPath: string = '';
    rootEntries: FileEntry[] = [];
    selectedPath: string | null = null;
    selectedFileContent: string | null = null;
    selectedFileName: string | null = null;

    private get electron() {
        return (window as any).electronAPI;
    }

    ngOnInit() {
        if (this.folderPath) {
            this.refresh();
        }
    }

    async refresh() {
        this.rootEntries = await this.loadDirectory(this.folderPath);
    }

    async loadDirectory(path: string): Promise<FileEntry[]> {
        if (!this.electron?.listDirectory) return [];

        const rawEntries = await this.electron.listDirectory(path);
        return rawEntries
            .map((e: any) => ({
                name: e.name,
                isDirectory: e.isDirectory,
                path: `${path}/${e.name}`,
                isOpen: false,
                children: []
            }))
            .sort((a: any, b: any) => {
                if (a.isDirectory !== b.isDirectory) {
                    return a.isDirectory ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
    }

    async onNodeClick(node: FileEntry) {
        this.selectedPath = node.path;

        if (node.isDirectory) {
            node.isOpen = !node.isOpen;
            if (node.isOpen && (!node.children || node.children.length === 0)) {
                node.children = await this.loadDirectory(node.path);
            }
        } else {
            this.selectedFileName = node.name;
            this.selectedFileContent = await this.electron.readFile(node.path);
        }
    }
}
