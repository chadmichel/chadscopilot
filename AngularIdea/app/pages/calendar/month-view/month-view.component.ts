import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FactService } from '../../../services/fact.service';
import { CardModule } from 'primeng/card';

interface DayEntry {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
  id: string; // YYYYMMDD
  description?: string;
  notes?: string;
}

@Component({
  selector: 'app-month-view',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule],
  template: `
    <div class="calendar-container">
      <div class="month-grid-header">
        <div class="weekday-header" *ngFor="let day of weekDays">
          {{ day }}
        </div>
      </div>
      
      <div class="month-grid-body">
        <div 
          *ngFor="let day of days; let i = index" 
          class="calendar-day" 
          [class.other-month]="!day.isCurrentMonth"
          [class.is-today]="day.isToday"
        >
          <!-- Week jump button at start of each row -->
          <div 
            *ngIf="i % 7 === 0" 
            class="week-jump-btn" 
            (click)="viewWeek(day.date)"
            title="View full week"
          >
            <i class="pi pi-bars"></i>
          </div>

          <div class="day-clickable-area" (click)="viewDay(day.id)">
            <div class="day-header-meta">
              <span class="day-number">{{ day.dayNumber }}</span>
              <div class="day-indicators">
                <i *ngIf="day.notes" class="pi pi-pencil indicator-icon" title="Has notes"></i>
                <div *ngIf="day.description" class="activity-dot"></div>
              </div>
            </div>
            
            <div class="day-body-content">
              <div class="description-snippet" *ngIf="day.description">
                {{ day.description }}
              </div>
              <div class="notes-snippet" *ngIf="day.notes">
                {{ day.notes }}
              </div>
            </div>
          </div>

          <div class="today-glow" *ngIf="day.isToday"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-container {
      background: var(--surface-glass);
      backdrop-filter: blur(12px) saturate(160%);
      -webkit-backdrop-filter: blur(12px) saturate(160%);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    }

    .month-grid-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: var(--surface-muted-glass);
      border-bottom: 1px solid var(--app-border);
    }

    .weekday-header {
      padding: 1rem 0.5rem;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--app-text-muted);
    }

    .month-grid-body {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: var(--app-border);
    }

    .calendar-day {
      background: var(--app-surface);
      min-height: 140px;
      padding: 0.75rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .calendar-day:hover {
      background: var(--surface-muted-glass);
      transform: scale(1.02);
      z-index: 10;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }

    .calendar-day.other-month {
      background: var(--app-surface-muted);
      opacity: 0.5;
    }

    .calendar-day.is-today {
      background: color-mix(in srgb, var(--theme-primary) 5%, var(--app-surface));
      z-index: 5;
    }

    .calendar-day.is-today .day-number {
      color: var(--theme-primary);
      font-weight: 800;
      font-size: 1.1rem;
    }

    .today-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--theme-primary);
      box-shadow: 0 0 10px var(--theme-primary);
    }

    .day-header-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .day-clickable-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .week-jump-btn {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%) translateX(-50%);
      width: 24px;
      height: 24px;
      background: var(--theme-primary);
      color: var(--theme-primary-contrast);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      z-index: 20;
      opacity: 0;
      transition: all 0.2s;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    .calendar-day:hover .week-jump-btn {
      opacity: 1;
      transform: translateY(-50%) translateX(4px);
    }

    .week-jump-btn:hover {
      background: var(--theme-primary-hover);
      transform: translateY(-50%) translateX(6px) scale(1.1) !important;
    }

    .day-number {
      font-size: 1rem;
      font-weight: 600;
      color: var(--app-text);
      font-family: var(--app-heading-font);
    }

    .day-indicators {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .indicator-icon {
      font-size: 0.75rem;
      color: var(--theme-primary);
    }

    .activity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--theme-primary);
    }

    .day-body-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }

    .description-snippet {
      font-size: 0.75rem;
      line-height: 1.4;
      color: var(--app-text);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notes-snippet {
      font-size: 0.7rem;
      line-height: 1.3;
      color: var(--app-text-muted);
      font-style: italic;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    @media (max-width: 1024px) {
      .calendar-day {
        min-height: 100px;
      }
      .description-snippet {
        -webkit-line-clamp: 2;
      }
    }

    @media (max-width: 768px) {
      .weekday-header {
        font-size: 0.6rem;
      }
      .calendar-day {
        min-height: 80px;
        padding: 0.4rem;
      }
      .day-number {
        font-size: 0.8rem;
      }
      .day-body-content {
        display: none;
      }
    }
  `]
})
export class MonthViewComponent implements OnInit {
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days: DayEntry[] = [];
  currentYearMonth = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private factService: FactService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const ym = params['yearMonth'];
      if (ym) {
        this.currentYearMonth = ym;
        this.generateMonth(ym);
      } else {
        const today = new Date();
        const defaultYM = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0');
        this.router.navigate(['month', defaultYM], { relativeTo: this.route.parent });
      }
    });
  }

  generateMonth(ym: string) {
    const year = parseInt(ym.substring(0, 4));
    const month = parseInt(ym.substring(4, 6)) - 1;

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const firstDayOfWeek = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    this.days = [];

    // Padding from previous month
    const prevMonthEnd = new Date(year, month, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthEnd.getDate() - i);
      this.days.push(this.createDayEntry(d, false));
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      this.days.push(this.createDayEntry(d, true));
    }

    // Padding from next month
    const remainingSlots = 42 - this.days.length; // 6 rows
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      this.days.push(this.createDayEntry(d, false));
    }

    // Load facts for these days
    this.days.forEach(day => {
      this.factService.getDayFact(parseInt(day.id)).subscribe(fact => {
        if (fact) {
          day.description = fact.description;
          day.notes = fact.notes;
        }
      });
    });
  }

  createDayEntry(date: Date, isCurrentMonth: boolean): DayEntry {
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    const id = date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    return {
      date,
      isCurrentMonth,
      isToday,
      dayNumber: date.getDate(),
      id
    };
  }

  viewDay(id: string) {
    this.router.navigate(['day', id], { relativeTo: this.route.parent });
  }

  viewWeek(date: Date) {
    const yearWeek = this.getYearWeek(date);
    this.router.navigate(['week', yearWeek], { relativeTo: this.route.parent });
  }

  private getYearWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return d.getUTCFullYear().toString() + weekNo.toString().padStart(2, '0');
  }
}
