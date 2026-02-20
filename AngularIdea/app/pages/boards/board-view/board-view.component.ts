import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DragDropModule } from 'primeng/dragdrop';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TaskService } from '../../../services/task.service';
import { TaskDto, TaskStatus } from '../../../dto/task.dto';
import { BoardService } from '../../../services/board.service';
import { SelectOption } from '../../../components/common-dto/query.dto';
import { Subject, takeUntil } from 'rxjs';

import { PageToolbarComponent } from '../../../components/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
    DragDropModule,
    SelectModule,
    DialogModule,
    InputTextModule,
    PageToolbarComponent,
  ],
  template: `
    <div class="page-container">
      <pb-page-toolbar [header]="boardTitle">
        <div class="header-right">
          <div class="board-switch">
            <p-select
              [options]="boardOptions"
              [(ngModel)]="selectedBoardId"
              optionLabel="label"
              optionValue="value"
              placeholder="Select board"
              styleClass="board-dropdown"
              (onChange)="onBoardChange($event)"
            ></p-select>
            <p-button
              label="Boards"
              icon="pi pi-th-large"
              severity="secondary"
              [outlined]="true"
              (onClick)="router.navigate(['/boards'])"
            ></p-button>
          </div>
        </div>
      </pb-page-toolbar>
      
      <p class="page-subtitle mb-4">
        Boards organize tasks by status (Backlog → OnDeck → InProcess → Complete).
      </p>

      <div *ngIf="loading" class="loading">
        <p-progressSpinner
          strokeWidth="4"
          [style]="{ width: '40px', height: '40px' }"
        ></p-progressSpinner>
        <span>Loading tasks…</span>
      </div>

      <div *ngIf="!loading && !isMobile" class="board-grid">
        <div class="lane" pDroppable="task" (onDrop)="handleDrop('backlog', $event)">
          <div class="lane-header">
            <div class="lane-title">
              <span>Backlog</span>
              <p-tag [value]="backlog.length + ''" severity="secondary"></p-tag>
            </div>
            <div class="lane-actions">
              <p-button
                label="Task"
                icon="pi pi-plus"
                size="small"
                [text]="true"
                (onClick)="createTask('backlog')"
              ></p-button>
            </div>
            <div class="lane-subtitle">Not ready yet</div>
          </div>
          <div class="lane-body" [class.is-dragging]="isDragging">
            <div
              *ngFor="let t of backlog"
              class="task"
              pDraggable="task"
              (onDragStart)="onDragStart(t)"
              (onDragEnd)="onDragEnd()"
              (click)="openTask(t.id!)"
            >
              <div class="task-title">{{ t.title }}</div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag
                  *ngIf="t.priority"
                  [value]="t.priority.toUpperCase()"
                  severity="info"
                ></p-tag>
                <p-tag
                  *ngIf="t.tags && t.tags.length"
                  [value]="t.tags[0]"
                  severity="secondary"
                ></p-tag>
              </div>
            </div>
            <div *ngIf="backlog.length === 0" class="lane-empty">Drop tasks here</div>

            <div class="quick-add" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.backlog"
                placeholder="Quick add to Backlog…"
                (keydown.enter)="quickAdd('backlog')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('backlog')"
                [disabled]="!quickAddTitle.backlog.trim()"
              ></button>
            </div>
          </div>
        </div>

        <div class="lane" pDroppable="task" (onDrop)="handleDrop('ondeck', $event)">
          <div class="lane-header">
            <div class="lane-title">
              <span>OnDeck</span>
              <p-tag [value]="ondeck.length + ''" severity="info"></p-tag>
            </div>
            <div class="lane-actions">
              <p-button
                label="Task"
                icon="pi pi-plus"
                size="small"
                [text]="true"
                (onClick)="createTask('ondeck')"
              ></p-button>
            </div>
            <div class="lane-subtitle">Up next</div>
          </div>
          <div class="lane-body" [class.is-dragging]="isDragging">
            <div
              *ngFor="let t of ondeck"
              class="task"
              pDraggable="task"
              (onDragStart)="onDragStart(t)"
              (onDragEnd)="onDragEnd()"
              (click)="openTask(t.id!)"
            >
              <div class="task-title">{{ t.title }}</div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag
                  *ngIf="t.priority"
                  [value]="t.priority.toUpperCase()"
                  severity="info"
                ></p-tag>
                <p-tag
                  *ngIf="t.tags && t.tags.length"
                  [value]="t.tags[0]"
                  severity="secondary"
                ></p-tag>
              </div>
            </div>
            <div *ngIf="ondeck.length === 0" class="lane-empty">Drop tasks here</div>

            <div class="quick-add" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.ondeck"
                placeholder="Quick add to OnDeck…"
                (keydown.enter)="quickAdd('ondeck')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('ondeck')"
                [disabled]="!quickAddTitle.ondeck.trim()"
              ></button>
            </div>
          </div>
        </div>

        <div class="lane" pDroppable="task" (onDrop)="handleDrop('inprocess', $event)">
          <div class="lane-header">
            <div class="lane-title">
              <span>InProcess</span>
              <p-tag [value]="inprocess.length + ''" severity="warn"></p-tag>
            </div>
            <div class="lane-actions">
              <p-button
                label="Task"
                icon="pi pi-plus"
                size="small"
                [text]="true"
                (onClick)="createTask('inprocess')"
              ></p-button>
            </div>
            <div class="lane-subtitle">Doing</div>
          </div>
          <div class="lane-body" [class.is-dragging]="isDragging">
            <div
              *ngFor="let t of inprocess"
              class="task"
              pDraggable="task"
              (onDragStart)="onDragStart(t)"
              (onDragEnd)="onDragEnd()"
              (click)="openTask(t.id!)"
            >
              <div class="task-title">{{ t.title }}</div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag
                  *ngIf="t.priority"
                  [value]="t.priority.toUpperCase()"
                  severity="warn"
                ></p-tag>
                <p-tag
                  *ngIf="t.tags && t.tags.length"
                  [value]="t.tags[0]"
                  severity="secondary"
                ></p-tag>
              </div>
            </div>
            <div *ngIf="inprocess.length === 0" class="lane-empty">Drop tasks here</div>

            <div class="quick-add" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.inprocess"
                placeholder="Quick add to InProcess…"
                (keydown.enter)="quickAdd('inprocess')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('inprocess')"
                [disabled]="!quickAddTitle.inprocess.trim()"
              ></button>
            </div>
          </div>
        </div>

        <div class="lane" pDroppable="task" (onDrop)="handleDrop('complete', $event)">
          <div class="lane-header">
            <div class="lane-title">
              <span>Complete</span>
              <p-tag [value]="complete.length + ''" severity="success"></p-tag>
            </div>
            <div class="lane-actions">
              <p-button
                label="Task"
                icon="pi pi-plus"
                size="small"
                [text]="true"
                (onClick)="createTask('complete')"
              ></p-button>
            </div>
            <div class="lane-subtitle">Done</div>
          </div>
          <div class="lane-body" [class.is-dragging]="isDragging">
            <div
              *ngFor="let t of complete"
              class="task"
              pDraggable="task"
              (onDragStart)="onDragStart(t)"
              (onDragEnd)="onDragEnd()"
              (click)="openTask(t.id!)"
            >
              <div class="task-title">{{ t.title }}</div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag
                  *ngIf="t.priority"
                  [value]="t.priority.toUpperCase()"
                  severity="success"
                ></p-tag>
                <p-tag
                  *ngIf="t.tags && t.tags.length"
                  [value]="t.tags[0]"
                  severity="secondary"
                ></p-tag>
              </div>
            </div>
            <div *ngIf="complete.length === 0" class="lane-empty">Drop tasks here</div>

            <div class="quick-add" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.complete"
                placeholder="Quick add to Complete…"
                (keydown.enter)="quickAdd('complete')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('complete')"
                [disabled]="!quickAddTitle.complete.trim()"
              ></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile: stacked sections -->
      <div *ngIf="!loading && isMobile" class="mobile-board">
        <div class="mobile-section">
          <div class="mobile-section-header">
            <div class="mobile-section-title">
              <span>Backlog</span>
              <p-tag [value]="backlog.length + ''" severity="secondary"></p-tag>
            </div>
            <p-button
              label="Task"
              icon="pi pi-plus"
              size="small"
              [text]="true"
              (onClick)="createTask('backlog')"
            ></p-button>
          </div>
          <div class="mobile-section-body">
            <div *ngFor="let t of backlog" class="task mobile-task" (click)="openTask(t.id!)">
              <div class="task-row">
                <div class="task-title">{{ t.title }}</div>
                <button
                  pButton
                  type="button"
                  icon="pi pi-arrow-right"
                  class="p-button-text p-button-rounded"
                  (click)="openMoveDialog(t); $event.stopPropagation()"
                ></button>
              </div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag *ngIf="t.priority" [value]="t.priority.toUpperCase()" severity="info"></p-tag>
                <p-tag *ngIf="t.tags && t.tags.length" [value]="t.tags[0]" severity="secondary"></p-tag>
              </div>
            </div>
            <div *ngIf="backlog.length === 0" class="mobile-empty">No tasks.</div>

            <div class="quick-add mobile" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.backlog"
                placeholder="Quick add…"
                (keydown.enter)="quickAdd('backlog')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('backlog')"
                [disabled]="!quickAddTitle.backlog.trim()"
              ></button>
            </div>
          </div>
        </div>

        <div class="mobile-section">
          <div class="mobile-section-header">
            <div class="mobile-section-title">
              <span>OnDeck</span>
              <p-tag [value]="ondeck.length + ''" severity="info"></p-tag>
            </div>
            <p-button
              label="Task"
              icon="pi pi-plus"
              size="small"
              [text]="true"
              (onClick)="createTask('ondeck')"
            ></p-button>
          </div>
          <div class="mobile-section-body">
            <div *ngFor="let t of ondeck" class="task mobile-task" (click)="openTask(t.id!)">
              <div class="task-row">
                <div class="task-title">{{ t.title }}</div>
                <button
                  pButton
                  type="button"
                  icon="pi pi-arrow-right"
                  class="p-button-text p-button-rounded"
                  (click)="openMoveDialog(t); $event.stopPropagation()"
                ></button>
              </div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag *ngIf="t.priority" [value]="t.priority.toUpperCase()" severity="info"></p-tag>
                <p-tag *ngIf="t.tags && t.tags.length" [value]="t.tags[0]" severity="secondary"></p-tag>
              </div>
            </div>
            <div *ngIf="ondeck.length === 0" class="mobile-empty">No tasks.</div>

            <div class="quick-add mobile" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.ondeck"
                placeholder="Quick add…"
                (keydown.enter)="quickAdd('ondeck')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('ondeck')"
                [disabled]="!quickAddTitle.ondeck.trim()"
              ></button>
            </div>
          </div>
        </div>

        <div class="mobile-section">
          <div class="mobile-section-header">
            <div class="mobile-section-title">
              <span>InProcess</span>
              <p-tag [value]="inprocess.length + ''" severity="warn"></p-tag>
            </div>
            <p-button
              label="Task"
              icon="pi pi-plus"
              size="small"
              [text]="true"
              (onClick)="createTask('inprocess')"
            ></p-button>
          </div>
          <div class="mobile-section-body">
            <div *ngFor="let t of inprocess" class="task mobile-task" (click)="openTask(t.id!)">
              <div class="task-row">
                <div class="task-title">{{ t.title }}</div>
                <button
                  pButton
                  type="button"
                  icon="pi pi-arrow-right"
                  class="p-button-text p-button-rounded"
                  (click)="openMoveDialog(t); $event.stopPropagation()"
                ></button>
              </div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag *ngIf="t.priority" [value]="t.priority.toUpperCase()" severity="warn"></p-tag>
                <p-tag *ngIf="t.tags && t.tags.length" [value]="t.tags[0]" severity="secondary"></p-tag>
              </div>
            </div>
            <div *ngIf="inprocess.length === 0" class="mobile-empty">No tasks.</div>

            <div class="quick-add mobile" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.inprocess"
                placeholder="Quick add…"
                (keydown.enter)="quickAdd('inprocess')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('inprocess')"
                [disabled]="!quickAddTitle.inprocess.trim()"
              ></button>
            </div>
          </div>
        </div>

        <div class="mobile-section">
          <div class="mobile-section-header">
            <div class="mobile-section-title">
              <span>Complete</span>
              <p-tag [value]="complete.length + ''" severity="success"></p-tag>
            </div>
            <p-button
              label="Task"
              icon="pi pi-plus"
              size="small"
              [text]="true"
              (onClick)="createTask('complete')"
            ></p-button>
          </div>
          <div class="mobile-section-body">
            <div *ngFor="let t of complete" class="task mobile-task" (click)="openTask(t.id!)">
              <div class="task-row">
                <div class="task-title">{{ t.title }}</div>
                <button
                  pButton
                  type="button"
                  icon="pi pi-arrow-right"
                  class="p-button-text p-button-rounded"
                  (click)="openMoveDialog(t); $event.stopPropagation()"
                ></button>
              </div>
              <div class="task-meta">
                <p-tag
                  *ngIf="getDueIndicator(t) === 'overdue'"
                  value="Overdue"
                  severity="danger"
                  icon="pi pi-exclamation-triangle"
                ></p-tag>
                <p-tag
                  *ngIf="getDueIndicator(t) === 'today'"
                  value="Due today"
                  severity="warn"
                  icon="pi pi-clock"
                ></p-tag>
                <p-tag *ngIf="t.priority" [value]="t.priority.toUpperCase()" severity="success"></p-tag>
                <p-tag *ngIf="t.tags && t.tags.length" [value]="t.tags[0]" severity="secondary"></p-tag>
              </div>
            </div>
            <div *ngIf="complete.length === 0" class="mobile-empty">No tasks.</div>

            <div class="quick-add mobile" (click)="$event.stopPropagation()">
              <input
                pInputText
                type="text"
                [(ngModel)]="quickAddTitle.complete"
                placeholder="Quick add…"
                (keydown.enter)="quickAdd('complete')"
              />
              <button
                pButton
                icon="pi pi-plus"
                class="p-button-success"
                (click)="quickAdd('complete')"
                [disabled]="!quickAddTitle.complete.trim()"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p-dialog
      header="Move task"
      [(visible)]="moveDialogVisible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '92vw', maxWidth: '420px' }"
    >
      <div *ngIf="movingTask" class="move-dialog">
        <div class="move-title">{{ movingTask.title }}</div>
        <div class="move-field">
          <label>Status</label>
          <p-select
            [options]="statusOptions"
            [(ngModel)]="moveToStatus"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
          ></p-select>
        </div>
        <div class="move-actions">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="closeMoveDialog()"
          ></p-button>
          <p-button label="Move" icon="pi pi-check" (onClick)="confirmMove()"></p-button>
        </div>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      /* Tighten this page a bit so 4 lanes fit comfortably on laptop widths */
      .page-container {
        /* Use the shared app shell (.page-content) padding */
        padding: 0;
        /* Let the theme wallpaper show through on the board page */
        background: transparent;
      }

      .header-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.75rem;
      }

      /* Make the board subtitle match the theme font */
      .page-subtitle {
        font-family: var(--app-heading-font);
      }

      .board-switch {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      :host ::ng-deep .board-dropdown {
        min-width: 220px;
      }

      .loading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        color: var(--app-text-muted);
      }

      .board-grid {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
        align-items: stretch;
      }

      .lane {
        /* Allow lanes to shrink/grow so all 4 can fit on a single page on laptops */
        flex: 1 1 0;
        min-width: 250px;
        background: var(--surface-glass);
        border: 1px solid var(--app-border);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
        min-height: 520px;
      }

      .lane-header {
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 0.9rem 1rem 0.75rem 1rem;
        background: var(--surface-muted-glass);
        backdrop-filter: blur(6px);
        border-bottom: 1px solid var(--app-border);
      }

      .lane-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        font-weight: 700;
        color: var(--app-text);
        letter-spacing: -0.01em;
        margin-bottom: 0.2rem;
      }

      .lane-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.25rem;
      }

      :host ::ng-deep .lane-actions .p-button.p-button-text {
        padding: 0.25rem 0.4rem;
      }

      .lane-subtitle {
        color: var(--app-text-muted);
        font-size: 0.85rem;
      }

      .lane-body {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        min-height: 420px;
      }

      .quick-add {
        margin-top: auto;
        padding-top: 0.5rem;
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .quick-add input {
        flex: 1;
        min-width: 0;
      }

      .quick-add :host ::ng-deep .p-button {
        margin: 0;
      }

      .lane-body.is-dragging {
        outline: 2px dashed
          color-mix(in srgb, var(--theme-primary) 55%, transparent 45%);
        outline-offset: -6px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--theme-primary) 10%, transparent 90%);
      }

      .lane-empty {
        color: var(--app-text-muted);
        font-size: 0.9rem;
        padding: 0.75rem;
        border: 1px dashed var(--app-border);
        border-radius: 12px;
        text-align: center;
      }

      .task {
        background: color-mix(in srgb, var(--app-surface) 92%, transparent 8%);
        border: 1px solid var(--app-border);
        border-radius: 10px;
        padding: 0.75rem 0.75rem;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease,
          border-color 0.15s ease;
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .task:hover {
        transform: translateY(-1px);
        border-color: var(--theme-primary);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      }

      .task-title {
        font-weight: 600;
        color: var(--app-text);
        line-height: 1.35;
        margin-bottom: 0.5rem;
      }

      .task-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .task-meta {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      /* Mobile stacked view */
      .mobile-board {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .mobile-section {
        background: var(--surface-glass);
        border: 1px solid var(--app-border);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .mobile-section-header {
        padding: 0.85rem 0.9rem;
        border-bottom: 1px solid var(--app-border);
        background: var(--surface-muted-glass);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .mobile-section-title {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 700;
        color: var(--app-text);
      }

      .mobile-section-body {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .quick-add.mobile {
        padding-top: 0.5rem;
      }

      .mobile-task {
        width: 100%;
      }

      .mobile-empty {
        color: var(--app-text-muted);
        font-size: 0.9rem;
        padding: 0.25rem 0.25rem;
      }

      .move-dialog {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .move-title {
        font-weight: 700;
        color: var(--app-text);
        line-height: 1.35;
      }

      .move-field label {
        display: block;
        font-size: 0.85rem;
        color: var(--app-text-muted);
        margin-bottom: 0.35rem;
      }

      .move-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      /* Prevent unnecessary horizontal scroll on typical desktop widths */
      @media (min-width: 1200px) {
        .board-grid {
          overflow-x: hidden;
        }
      }

      @media (max-width: 768px) {
        .header-right {
          align-items: stretch;
          width: 100%;
        }
        .board-switch {
          justify-content: space-between;
        }
        :host ::ng-deep .board-dropdown {
          min-width: 0;
          width: 100%;
        }
      }
    `,
  ],
})
export class BoardViewComponent implements OnInit {
  boardId = 'all';
  boardTitle = 'Board: All';
  loading = true;
  isDragging = false;
  draggingTaskId: string | null = null;
  draggingTask: (TaskDto & { id?: string }) | null = null;

  boardOptions: SelectOption[] = [];
  selectedBoardId: string = 'all';
  isMobile = window.innerWidth <= 768;

  // Mobile move dialog
  moveDialogVisible = false;
  movingTask: (TaskDto & { id?: string }) | null = null;
  moveToStatus: TaskStatus = 'backlog';
  statusOptions: SelectOption[] = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'OnDeck', value: 'ondeck' },
    { label: 'InProcess', value: 'inprocess' },
    { label: 'Complete', value: 'complete' },
  ];

  // Quick add inputs (one per lane)
  quickAddTitle: Record<TaskStatus, string> = {
    backlog: '',
    ondeck: '',
    inprocess: '',
    complete: '',
  };

  backlog: (TaskDto & { id?: string })[] = [];
  ondeck: (TaskDto & { id?: string })[] = [];
  inprocess: (TaskDto & { id?: string })[] = [];
  complete: (TaskDto & { id?: string })[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private taskService: TaskService,
    private boardService: BoardService
  ) { }

  ngOnInit(): void {
    this.loadBoardsForDropdown();

    // IMPORTANT: component is reused when navigating between /boards/:boardId
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const nextBoardId = params['boardId'] || 'all';
      this.loadBoard(nextBoardId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  private loadBoard(boardId: string): void {
    this.boardId = boardId || 'all';
    this.selectedBoardId = this.boardId;
    this.updateBoardTitle();

    try {
      localStorage.setItem('whenisdone_last_board_id', this.boardId);
    } catch {
      // ignore
    }

    this.loading = true;
    this.taskService.getBoardTasks(this.boardId).subscribe({
      next: (result) => {
        const tasks = (result.items || []).map((qi: any) => ({
          id: qi.id,
          ...(qi.item || {}),
        })) as (TaskDto & { id?: string })[];

        this.backlog = tasks.filter((t) => t.status === 'backlog');
        this.ondeck = tasks.filter((t) => t.status === 'ondeck');
        this.inprocess = tasks.filter((t) => t.status === 'inprocess');
        this.complete = tasks.filter((t) => t.status === 'complete');
        this.loading = false;
      },
      error: () => {
        this.backlog = [];
        this.ondeck = [];
        this.inprocess = [];
        this.complete = [];
        this.loading = false;
      },
    });
  }

  private loadBoardsForDropdown(): void {
    this.boardService.getBoards({ take: 100, skip: 0 }).subscribe({
      next: (result) => {
        const items = (result.items || []).map((qi: any) => ({
          id: qi.id,
          ...(qi.item || {}),
        }));
        this.boardOptions = items
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((b: any) => ({
            label: b.name,
            // Keep "All" as a stable route/view value
            value: b.key === 'all' || b.kind === 'system' ? 'all' : b.id,
          }));
        this.updateBoardTitle();
      },
      error: () => {
        this.boardOptions = [
          { label: 'All', value: 'all' },
          { label: 'Work', value: 'work' },
          { label: 'Home', value: 'home' },
        ];
        this.updateBoardTitle();
      },
    });
  }

  private updateBoardTitle(): void {
    if (this.boardId === 'all') {
      this.boardTitle = 'Board: All';
      return;
    }
    const match = this.boardOptions.find((o) => o.value === this.boardId);
    this.boardTitle = match ? `Board: ${match.label}` : `Board: ${this.boardId}`;
  }

  onBoardChange(event: any): void {
    const value = event?.value || this.selectedBoardId;
    if (!value) return;
    this.router.navigate(['/boards', value]);
  }

  openTask(taskId: string): void {
    this.router.navigate(['/tasks', taskId], {
      queryParams: {
        edit: true,
        boardId: this.boardId && this.boardId !== 'all' ? this.boardId : undefined,
      },
      state: {
        returnUrl: this.router.url,
      },
    });
  }

  createTask(status: TaskStatus): void {
    const queryParams: Record<string, any> = { status };
    if (this.boardId && this.boardId !== 'all') {
      queryParams['boardId'] = this.boardId;
    }
    // Preselect last-used project in task detail
    const lastProjectId = this.safeGetLastProjectId() || undefined;
    if (lastProjectId) {
      queryParams['projectId'] = lastProjectId;
    }
    this.router.navigate(['/tasks', 'new'], {
      queryParams,
      state: {
        returnUrl: this.router.url,
      },
    });
  }

  quickAdd(status: TaskStatus): void {
    const title = (this.quickAddTitle[status] || '').trim();
    if (!title) return;

    const boardId = this.boardId && this.boardId !== 'all' ? this.boardId : undefined;
    const projectId = this.safeGetLastProjectId() || undefined;
    const sortOrder = this.getNextSortOrder(status);

    this.taskService
      .createTask({
        title,
        status,
        boardId,
        projectId,
        sortOrder,
      })
      .subscribe({
        next: (res) => {
          if (!res?.success) return;

          // Optimistically append to lane so UI updates immediately
          const dto: TaskDto & { id?: string } = {
            id: res.id,
            title,
            status,
            boardId,
            projectId,
            sortOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.addTaskToLane(dto);
          this.quickAddTitle[status] = '';
        },
        error: () => { },
      });
  }

  private addTaskToLane(task: TaskDto & { id?: string }): void {
    const lane = this.getLaneByStatus(task.status);
    lane.push(task);
    this.recomputeSortOrders(lane);
  }

  private getNextSortOrder(status: TaskStatus): number {
    const lane = this.getLaneByStatus(status);
    const max = lane.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), 0);
    return max + 10;
  }

  private safeGetLastProjectId(): string | null {
    try {
      return localStorage.getItem('whenisdone_last_project_id');
    } catch {
      return null;
    }
  }

  openMoveDialog(task: TaskDto & { id?: string }): void {
    this.movingTask = task;
    this.moveToStatus = task.status;
    this.moveDialogVisible = true;
  }

  closeMoveDialog(): void {
    this.moveDialogVisible = false;
    this.movingTask = null;
  }

  confirmMove(): void {
    if (!this.movingTask?.id) {
      this.closeMoveDialog();
      return;
    }

    const id = this.movingTask.id;
    const targetStatus = this.moveToStatus;
    this.moveTaskToStatus(id, targetStatus);
    this.closeMoveDialog();
  }

  private moveTaskToStatus(id: string, targetStatus: TaskStatus): void {
    const removed =
      this.removeTaskFromLane(this.backlog, id) ||
      this.removeTaskFromLane(this.ondeck, id) ||
      this.removeTaskFromLane(this.inprocess, id) ||
      this.removeTaskFromLane(this.complete, id);
    if (!removed) return;

    removed.status = targetStatus;
    const lane = this.getLaneByStatus(targetStatus);
    lane.push(removed);
    this.recomputeSortOrders(lane);

    this.taskService
      .updateTask(id, {
        status: removed.status,
        boardId: removed.boardId,
        sortOrder: removed.sortOrder,
      })
      .subscribe({
        next: () => { },
        error: () => { },
      });
  }

  onDragStart(task: TaskDto): void {
    this.isDragging = true;
    this.draggingTaskId = task.id || null;
    this.draggingTask = task as any;
  }

  onDragEnd(): void {
    this.isDragging = false;
    this.draggingTaskId = null;
    this.draggingTask = null;
  }

  handleDrop(targetStatus: TaskStatus, event: any): void {
    const task = this.draggingTask;
    if (!task?.id) return;

    // Remove from all lanes
    const removed =
      this.removeTaskFromLane(this.backlog, task.id) ||
      this.removeTaskFromLane(this.ondeck, task.id) ||
      this.removeTaskFromLane(this.inprocess, task.id) ||
      this.removeTaskFromLane(this.complete, task.id);

    const moved = removed || task;
    moved.status = targetStatus;

    // Append to target lane (simple first-pass; later we'll support precise ordering)
    const lane = this.getLaneByStatus(targetStatus);
    lane.push(moved);
    this.recomputeSortOrders(lane);

    // Persist (mock-mode) via MSW endpoint; no-op in real backend until implemented
    const id = moved.id;
    if (id) {
      this.taskService
        .updateTask(id, {
          status: moved.status,
          boardId: moved.boardId,
          sortOrder: moved.sortOrder,
        })
        .subscribe({
          next: () => { },
          error: () => { },
        });
    }
  }

  private getLaneByStatus(status: TaskStatus): (TaskDto & { id?: string })[] {
    switch (status) {
      case 'backlog':
        return this.backlog;
      case 'ondeck':
        return this.ondeck;
      case 'inprocess':
        return this.inprocess;
      case 'complete':
        return this.complete;
    }
  }

  private removeTaskFromLane(
    lane: (TaskDto & { id?: string })[],
    id: string
  ): (TaskDto & { id?: string }) | null {
    const idx = lane.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    const [removed] = lane.splice(idx, 1);
    return removed || null;
  }

  private recomputeSortOrders(lane: (TaskDto & { id?: string })[]): void {
    // Keep sortOrder stable and spaced for future insertions
    lane.forEach((t, i) => (t.sortOrder = (i + 1) * 10));
  }

  getDueIndicator(task: any): 'overdue' | 'today' | null {
    const dueAt = task?.dueAt;
    if (!dueAt) return null;

    const d = new Date(dueAt);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (startOfDue.getTime() < startOfToday.getTime()) return 'overdue';
    if (startOfDue.getTime() === startOfToday.getTime()) return 'today';
    return null;
  }
}

