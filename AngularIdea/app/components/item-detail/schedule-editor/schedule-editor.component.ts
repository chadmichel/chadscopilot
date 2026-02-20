import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';

export interface ScheduleItem {
  id: string;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  enabled: boolean;
}

@Component({
  selector: 'app-schedule-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    CheckboxModule,
    ChipModule,
    InputTextModule,
  ],
  template: `
    <div class="schedule-editor">
      <div class="schedule-display">
        <div class="schedule-chips">
          <p-chip
            *ngFor="let schedule of displaySchedules; let i = index"
            [label]="schedule"
            [removable]="true"
            (onRemove)="removeSchedule(i)"
            class="schedule-chip"
          ></p-chip>
          <p-chip
            *ngIf="displaySchedules.length === 0"
            label="No schedules configured"
            class="no-schedules-chip"
          ></p-chip>
        </div>
        <p-button
          *ngIf="editMode"
          icon="pi pi-pencil"
          (onClick)="openDialog()"
          [text]="false"
          size="small"
          class="edit-button"
        ></p-button>
      </div>

      <p-dialog
        header="Schedule Editor"
        [(visible)]="dialogVisible"
        [modal]="true"
        [style]="{ width: '800px', height: '800px' }"
        [closable]="true"
        [appendTo]="'body'"
        [baseZIndex]="10000"
        [resizable]="true"
        [draggable]="true"
        (onHide)="onDialogHide()"
      >
        <div class="dialog-content">
          <div class="schedule-list">
            <div
              *ngFor="let item of scheduleItems; let i = index"
              class="schedule-item"
            >
              <div class="schedule-controls">
                <p-checkbox
                  [(ngModel)]="item.enabled"
                  [binary]="true"
                  class="enabled-checkbox"
                ></p-checkbox>

                <p-select
                  [(ngModel)]="item.hour"
                  [options]="hourOptions"
                  placeholder="Hour"
                  class="hour-dropdown"
                  [disabled]="!item.enabled"
                ></p-select>

                <span class="time-separator">:</span>

                <p-select
                  [(ngModel)]="item.minute"
                  [options]="minuteOptions"
                  placeholder="Min"
                  class="minute-dropdown"
                  [disabled]="!item.enabled"
                ></p-select>

                <p-select
                  [(ngModel)]="item.dayOfWeek"
                  [options]="dayOfWeekOptions"
                  placeholder="Day"
                  class="day-dropdown"
                  [disabled]="!item.enabled"
                  [showClear]="false"
                  [filter]="false"
                  [virtualScroll]="false"
                ></p-select>

                <p-button
                  icon="pi pi-trash"
                  (onClick)="removeScheduleItem(i)"
                  [text]="true"
                  [rounded]="true"
                  severity="danger"
                  size="small"
                  class="remove-button"
                ></p-button>
              </div>
            </div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button
            label="Add Schedule"
            icon="pi pi-plus"
            (onClick)="addScheduleItem()"
            [text]="true"
            severity="secondary"
          ></p-button>
          <p-button
            label="Cancel"
            icon="pi pi-times"
            (onClick)="cancelDialog()"
            [text]="true"
            severity="secondary"
          ></p-button>
          <p-button
            label="Done"
            icon="pi pi-check"
            (onClick)="saveSchedules()"
            severity="primary"
          ></p-button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [
    `
      .schedule-editor {
        width: 100%;
      }

      .schedule-display {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        background: white;
        border: 1px solid var(--surface-border);
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .schedule-label {
        font-weight: 600;
        color: black;
        margin: 0;
        font-size: 1.1rem;
      }

      .schedule-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        flex: 1;
      }

      .schedule-chip {
        border: 1px solid var(--primary-color);
      }

      .no-schedules-chip {
        background: #f5f5f5;
        color: #666666;
        border: 1px solid #cccccc;
      }

      .edit-button {
        flex-shrink: 0;
      }

      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 400px;
      }

      .schedule-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-right: 0.5rem;
        height: 100%;
      }

      .schedule-item {
        border: 1px solid var(--surface-border);
        border-radius: 8px;
        padding: 1rem;
        background: var(--surface-card);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .schedule-controls {
        display: grid;
        grid-template-columns: auto 1fr auto 1fr auto 1fr auto;
        gap: 1rem;
        align-items: center;
      }

      .enabled-checkbox {
        grid-column: 1;
        justify-self: center;
      }

      .hour-dropdown {
        grid-column: 2;
        min-width: 100px;
      }

      .time-separator {
        grid-column: 3;
        font-weight: bold;
        color: var(--text-color);
        justify-self: center;
        font-size: 1.2rem;
      }

      .minute-dropdown {
        grid-column: 4;
        min-width: 100px;
      }

      .day-dropdown {
        grid-column: 5;
        min-width: 120px;
      }

      .remove-button {
        grid-column: 6;
        justify-self: end;
      }

      .add-schedule {
        display: flex;
        justify-content: center;
        padding-top: 0.5rem;
        border-top: 1px solid var(--surface-border);
      }

      .add-button {
        width: 100%;
      }

      @media (max-width: 768px) {
        .schedule-display {
          flex-direction: column;
          align-items: stretch;
          gap: 0.75rem;
        }

        .schedule-chips {
          justify-content: center;
        }

        .edit-button {
          align-self: center;
        }

        .schedule-controls {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .enabled-checkbox {
          align-self: flex-start;
        }

        .hour-dropdown,
        .minute-dropdown,
        .day-dropdown {
          min-width: unset;
          width: 100%;
        }

        .time-separator {
          align-self: center;
          font-size: 1rem;
        }

        .remove-button {
          align-self: flex-end;
        }
      }
    `,
  ],
})
export class ScheduleEditorComponent implements OnInit, OnChanges {
  @Input() label = 'Schedule';
  @Input() schedules: string[] = [];
  @Input() editMode = true;
  @Input() showDialog = false;

  @Output() schedulesChange = new EventEmitter<string[]>();

  dialogVisible = false;
  scheduleItems: ScheduleItem[] = [];
  displaySchedules: string[] = [];

  constructor(private cdr: ChangeDetectorRef) { }

  hourOptions = Array.from({ length: 24 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i,
  }));

  minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i,
  }));

  dayOfWeekOptions = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
  ];

  ngOnInit() {
    // Initialize schedules as empty array if undefined
    if (!this.schedules) {
      this.schedules = [];
    }

    console.log('schedules', this.schedules);

    // Use setTimeout to defer initialization to avoid change detection issues
    setTimeout(() => {
      this.parseSchedules();
      this.updateDisplaySchedules();
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schedules']) {
      // Initialize schedules as empty array if undefined
      if (!this.schedules) {
        this.schedules = [];
      }
      // Use setTimeout to defer changes to avoid change detection issues
      setTimeout(() => {
        this.parseSchedules();
        this.updateDisplaySchedules();
        this.cdr.markForCheck();
      });
    }
  }

  parseSchedules() {
    this.scheduleItems = [];

    if (this.schedules && this.schedules.length > 0) {
      this.schedules.forEach((schedule, index) => {
        const parts = schedule.split(' ');
        if (parts.length >= 5) {
          this.scheduleItems.push({
            id: `schedule-${index}`,
            minute: parseInt(parts[0]) || 0,
            hour: parseInt(parts[1]) || 0,
            dayOfWeek: parseInt(parts[4]) || 0,
            enabled: true,
          });
        }
      });
    }
  }

  updateDisplaySchedules() {
    this.displaySchedules = this.scheduleItems
      .filter((item) => item.enabled)
      .map((item) => this.formatScheduleDisplay(item));
  }

  formatScheduleDisplay(item: ScheduleItem): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const time = `${item.hour.toString().padStart(2, '0')}:${item.minute
      .toString()
      .padStart(2, '0')}`;
    const day = dayNames[item.dayOfWeek];
    return `${day} ${time}`;
  }

  generateCronExpression(item: ScheduleItem): string {
    // CRON format: minute hour day_of_month month day_of_week
    // For weekly schedules, we use * for day_of_month and month
    return `${item.minute} ${item.hour} * * ${item.dayOfWeek}`;
  }

  addScheduleItem() {
    const newItem: ScheduleItem = {
      id: `schedule-${Date.now()}`,
      hour: 9,
      minute: 0,
      dayOfWeek: 1, // Monday
      enabled: true,
    };
    this.scheduleItems.push(newItem);
    // Mark for check to update the UI
    this.cdr.markForCheck();
  }

  removeScheduleItem(index: number) {
    this.scheduleItems.splice(index, 1);
    // Mark for check to update the UI
    this.cdr.markForCheck();
  }

  removeSchedule(index: number) {
    this.displaySchedules.splice(index, 1);
    // Find and remove the corresponding schedule item
    const enabledItems = this.scheduleItems.filter((item) => item.enabled);
    if (enabledItems[index]) {
      const itemIndex = this.scheduleItems.indexOf(enabledItems[index]);
      if (itemIndex > -1) {
        this.scheduleItems.splice(itemIndex, 1);
      }
    }
    this.updateDisplaySchedules();
    this.emitSchedules();
    this.cdr.markForCheck();
  }

  openDialog() {
    this.dialogVisible = true;
  }

  cancelDialog() {
    this.dialogVisible = false;
    // Reset to original state
    this.parseSchedules();
    this.updateDisplaySchedules();
    this.cdr.markForCheck();
  }

  saveSchedules() {
    this.updateDisplaySchedules();
    this.emitSchedules();
    this.dialogVisible = false;
    this.cdr.markForCheck();
  }

  onDialogHide() {
    this.cancelDialog();
  }

  emitSchedules() {
    const cronSchedules = this.scheduleItems
      .filter((item) => item.enabled)
      .map((item) => this.generateCronExpression(item));

    // Update the schedules property and emit the change for two-way binding
    this.schedules = [...cronSchedules];
    this.schedulesChange.emit(cronSchedules);
  }
}
