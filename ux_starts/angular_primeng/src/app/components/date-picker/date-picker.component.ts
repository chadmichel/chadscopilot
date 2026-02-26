import { Component, computed, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DatePicker } from 'primeng/datepicker';

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA');
}

function dateToString(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, DatePicker],
  template: `
    <div class="date-picker-container">
      <p-datepicker
        class="date-picker-input"
        [ngModel]="dateValue()"
        (ngModelChange)="onDateChange($event)"
        dateFormat="yy-mm-dd"
        [showIcon]="true"
      />
      <button
        *ngIf="showTodayButton() && !isToday()"
        pButton
        type="button"
        label="Today"
        class="p-button-text p-button-sm today-btn"
        pTooltip="Go to today"
        (click)="goToToday()"
      ></button>
    </div>
  `,
  styles: [`
    .date-picker-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .date-picker-input {
      width: 100%;
    }

    .today-btn {
      padding: 0.25rem 0.5rem !important;
      font-size: 0.75rem !important;
    }
  `],
})
export class DatePickerComponent {
  // Inputs
  selectedDate = model<string>(getTodayString());
  showTodayButton = input(true);
  ariaLabel = input('Select date');

  // Outputs
  dateChange = output<string>();

  // Computed - use local date to avoid UTC timezone issues
  private todayDateString = computed(() => getTodayString());

  // Convert string date to Date object for p-datepicker
  dateValue = computed(() => {
    const dateStr = this.selectedDate();
    return dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  });

  onDateChange(date: Date) {
    const dateStr = dateToString(date);
    this.selectedDate.set(dateStr);
    this.dateChange.emit(dateStr);
  }

  isToday(): boolean {
    return this.selectedDate() === this.todayDateString();
  }

  goToToday() {
    const today = this.todayDateString();
    this.selectedDate.set(today);
    this.dateChange.emit(today);
  }

  // Utility methods that can be used by parent components
  static formatDate(dateStr: string): string {
    if (!dateStr) return 'today';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);

    const diffDays = Math.round((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays === -1) return 'yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  static formatDateLong(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
