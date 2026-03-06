import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-database',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="db-page">
      <div class="db-sidebar">
        <div class="db-sidebar-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span class="db-sidebar-title">Tables</span>
        </div>
        <div class="table-list">
          @for (table of tables; track table) {
            <button
              class="table-item"
              [class.active]="selectedTable === table"
              (click)="selectTable(table)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>{{ table }}</span>
              @if (selectedTable === table && rowCount >= 0) {
                <span class="row-badge">{{ rowCount }}</span>
              }
            </button>
          }
          @if (tables.length === 0 && !loading) {
            <div class="empty-state">No tables found</div>
          }
        </div>
      </div>

      <div class="db-content">
        @if (!selectedTable) {
          <div class="empty-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <h2>Database Explorer</h2>
            <p>Select a table from the sidebar to view its contents.</p>
          </div>
        } @else {
          <div class="content-header">
            <div class="table-title-row">
              <h2>{{ selectedTable }}</h2>
              <span class="row-count">{{ rowCount }} row{{ rowCount !== 1 ? 's' : '' }}</span>
            </div>
            <button class="refresh-btn" (click)="selectTable(selectedTable!)" [disabled]="loading" title="Refresh">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                [class.spinning]="loading">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          @if (loading) {
            <div class="loading-bar">
              <div class="loading-bar-inner"></div>
            </div>
          }

          <div class="table-wrapper">
            <table class="data-table" *ngIf="columns.length > 0">
              <thead>
                <tr>
                  @for (col of columns; track col) {
                    <th>{{ col }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of rows; track $index) {
                  <tr>
                    @for (col of columns; track col) {
                      <td [title]="cellValue(row[col])">{{ cellValue(row[col]) }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
            @if (columns.length > 0 && rows.length === 0 && !loading) {
              <div class="empty-table">This table is empty.</div>
            }
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .db-page {
      display: flex;
      flex: 1;
      height: 100%;
      color: var(--app-text);
      overflow: hidden;
    }

    /* Sidebar */
    .db-sidebar {
      width: 220px;
      min-width: 180px;
      background: var(--app-surface);
      border-right: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
    }
    .db-sidebar-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 14px 12px;
      font-weight: 700;
      font-size: 13px;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid var(--app-border);
    }
    .db-sidebar-title {
      flex: 1;
    }
    .table-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
    }
    .table-list::-webkit-scrollbar {
      width: 4px;
    }
    .table-list::-webkit-scrollbar-thumb {
      background: var(--app-border);
      border-radius: 2px;
    }
    .table-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      margin-bottom: 2px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--app-text-muted);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }
    .table-item:hover {
      background: var(--app-background);
      color: var(--app-text);
    }
    .table-item.active {
      background: color-mix(in srgb, var(--theme-primary), transparent 85%);
      color: var(--theme-primary);
    }
    .table-item span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .row-badge {
      margin-left: auto;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--theme-primary), transparent 80%);
      color: var(--theme-primary);
      font-weight: 600;
      flex-shrink: 0;
    }
    .empty-state {
      padding: 20px;
      text-align: center;
      color: var(--app-text-muted);
      font-size: 13px;
    }

    /* Content area */
    .db-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .empty-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--app-text-muted);
      text-align: center;
    }
    .empty-content svg {
      opacity: 0.3;
    }
    .empty-content h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--app-text);
    }
    .empty-content p {
      margin: 0;
      font-size: 14px;
    }

    .content-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px 12px;
      flex-shrink: 0;
    }
    .table-title-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .table-title-row h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }
    .row-count {
      font-size: 13px;
      color: var(--app-text-muted);
    }
    .refresh-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: transparent;
      color: var(--app-text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .refresh-btn:hover:not(:disabled) {
      background: var(--app-surface);
      color: var(--app-text);
      border-color: var(--theme-primary);
    }
    .refresh-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .spinning {
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Loading bar */
    .loading-bar {
      height: 2px;
      background: var(--app-border);
      flex-shrink: 0;
      overflow: hidden;
    }
    .loading-bar-inner {
      height: 100%;
      width: 40%;
      background: var(--theme-primary);
      animation: loading-slide 1.2s ease-in-out infinite;
    }
    @keyframes loading-slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }

    /* Table */
    .table-wrapper {
      flex: 1;
      overflow: auto;
      padding: 0 24px 24px;
    }
    .table-wrapper::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .table-wrapper::-webkit-scrollbar-thumb {
      background: var(--app-border);
      border-radius: 3px;
    }
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 12px;
      border: 1px solid var(--app-border);
      border-radius: 10px;
      overflow: hidden;
    }
    .data-table thead th {
      position: sticky;
      top: 0;
      background: var(--app-surface);
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--app-text-muted);
      border-bottom: 1px solid var(--app-border);
      white-space: nowrap;
      z-index: 1;
    }
    .data-table tbody td {
      padding: 8px 14px;
      border-bottom: 1px solid color-mix(in srgb, var(--app-border), transparent 50%);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--app-text);
    }
    .data-table tbody tr:last-child td {
      border-bottom: none;
    }
    .data-table tbody tr:hover td {
      background: color-mix(in srgb, var(--theme-primary), transparent 94%);
    }
    .empty-table {
      padding: 40px;
      text-align: center;
      color: var(--app-text-muted);
      font-size: 14px;
    }
  `]
})
export class DatabaseComponent implements OnInit {
    tables: string[] = [];
    selectedTable: string | null = null;
    columns: string[] = [];
    rows: Record<string, unknown>[] = [];
    rowCount = -1;
    loading = false;

    private get electron() {
        return (window as any).electronAPI;
    }

    async ngOnInit() {
        await this.loadTables();
    }

    async loadTables() {
        if (this.electron?.dbGetTables) {
            this.tables = await this.electron.dbGetTables();
        }
    }

    async selectTable(name: string) {
        this.selectedTable = name;
        this.loading = true;
        this.columns = [];
        this.rows = [];
        this.rowCount = -1;

        try {
            if (this.electron?.dbQueryTable) {
                const result = await this.electron.dbQueryTable(name);
                this.columns = result.columns;
                this.rows = result.rows;
                this.rowCount = result.rows.length;
            }
        } catch (err) {
            console.error('Failed to query table:', err);
        } finally {
            this.loading = false;
        }
    }

    cellValue(value: unknown): string {
        if (value === null || value === undefined) return '(null)';
        if (typeof value === 'string' && value.length > 200) {
            return value.substring(0, 200) + '…';
        }
        return String(value);
    }
}
