import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FactService } from '../../../services/fact.service';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag'; // Added TagModule

interface WeekDayEntry {
  date: Date;
  dayName: string;
  dayNumber: number;
  id: string;
  isToday: boolean; // Added
  description?: string;
  notes?: string; // Added
  meetingsCount?: number;
  tasksCount?: number;
}

@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, TagModule],
  template: `
    <div class="week-list">
      <div 
        *ngFor="let day of days" 
        class="week-day-card"
        [class.is-today]="day.isToday"
        (click)="viewDay(day.id)"
      >
        <div class="day-indicator-bar" *ngIf="day.isToday"></div>
        
        <div class="day-time-box">
          <div class="day-name">{{ day.dayName }}</div>
          <div class="day-number">{{ day.dayNumber }}</div>
          <div *ngIf="day.isToday" class="today-badge">TODAY</div>
        </div>
        
        <div class="day-main-content">
          <div class="summary-text" *ngIf="day.description">
            {{ day.description }}
          </div>
          <div class="notes-text" *ngIf="day.notes">
            <i class="pi pi-pencil mr-2 text-xs"></i>{{ day.notes }}
          </div>
          <div class="placeholder-text" *ngIf="!day.description && !day.notes">
            No activity or notes recorded for this day.
          </div>
        </div>

        <div class="day-meta-stats">
          <div class="stat-badge meetings" *ngIf="day.meetingsCount">
             <i class="pi pi-calendar mr-2"></i>
             <span>{{ day.meetingsCount }} {{ day.meetingsCount === 1 ? 'Meeting' : 'Meetings' }}</span>
          </div>
          <div class="stat-badge tasks" *ngIf="day.tasksCount">
             <i class="pi pi-check-circle mr-2"></i>
             <span>{{ day.tasksCount }} {{ day.tasksCount === 1 ? 'Task' : 'Tasks' }}</span>
          </div>
          <div class="view-more-hint">
             View Details <i class="pi pi-arrow-right ml-1"></i>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .week-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .week-day-card {
      display: flex;
      background: var(--surface-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--app-border);
      border-radius: 20px;
      padding: 1.5rem;
      cursor: pointer;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      gap: 2rem;
      align-items: center;
      overflow: hidden;
    }

    .week-day-card:hover {
      background: var(--surface-muted-glass);
      transform: translateX(8px);
      box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.15);
      border-color: var(--theme-primary);
    }

    .week-day-card.is-today {
      background: color-mix(in srgb, var(--theme-primary) 4%, var(--app-surface));
      border-color: color-mix(in srgb, var(--theme-primary) 30%, var(--app-border));
      box-shadow: 0 8px 24px -10px rgba(var(--theme-primary-rgb), 0.2);
    }

    .day-indicator-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: var(--theme-primary);
      box-shadow: 2px 0 10px var(--theme-primary);
    }

    .day-time-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 90px;
      padding-right: 2rem;
      border-right: 1px solid var(--app-border);
    }

    .day-name {
      text-transform: uppercase;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: var(--app-text-muted);
      margin-bottom: 0.25rem;
    }

    .day-number {
      font-size: 2.5rem;
      font-weight: 900;
      color: var(--app-text);
      line-height: 1;
      font-family: var(--app-heading-font);
    }

    .today-badge {
      margin-top: 0.5rem;
      font-size: 0.65rem;
      font-weight: 900;
      background: var(--theme-primary);
      color: var(--theme-primary-contrast);
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .day-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.5rem;
    }

    .summary-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--app-text);
      line-height: 1.4;
    }

    .notes-text {
      font-size: 0.9rem;
      color: var(--app-text-muted);
      font-style: italic;
      line-height: 1.4;
    }

    .placeholder-text {
      color: var(--app-text-muted);
      font-size: 0.95rem;
      font-style: italic;
      opacity: 0.6;
    }

    .day-meta-stats {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 160px;
    }

    .stat-badge {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: background 0.2s;
    }

    .stat-badge.meetings {
      background: color-mix(in srgb, var(--theme-primary) 10%, transparent);
      color: var(--theme-primary);
    }

    .stat-badge.tasks {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
    }

    .view-more-hint {
       font-size: 0.75rem;
       font-weight: 700;
       color: var(--theme-primary);
       text-transform: uppercase;
       letter-spacing: 0.05em;
       opacity: 0;
       transition: opacity 0.3s;
       text-align: right;
       margin-top: 0.25rem;
    }

    .week-day-card:hover .view-more-hint {
       opacity: 1;
    }

    @media (max-width: 768px) {
      .week-day-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.25rem;
      }
      .day-time-box {
        flex-direction: row;
        gap: 1rem;
        border-right: none;
        padding-right: 0;
        border-bottom: 1px solid var(--app-border);
        width: 100%;
        justify-content: flex-start;
        padding-bottom: 0.75rem;
      }
      .day-number {
        font-size: 1.75rem;
      }
      .day-meta-stats {
        width: 100%;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .stat-badge {
        flex: 1;
        justify-content: center;
      }
      .week-day-card:hover {
        transform: translateY(-4px);
      }
    }
  `]
})
export class WeekViewComponent implements OnInit {
  weekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  days: WeekDayEntry[] = [];
  currentYearWeek = ''; // Added

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private factService: FactService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const yw = params['yearWeek'];
      if (yw) {
        this.currentYearWeek = yw; // Set currentYearWeek
        this.generateWeek(yw);
      } else {
        const today = new Date();
        const defaultYW = this.getYearWeek(today);
        this.router.navigate(['week', defaultYW], { relativeTo: this.route.parent });
      }
    });
  }

  generateWeek(yw: string) {
    const year = parseInt(yw.substring(0, 4));
    const week = parseInt(yw.substring(4, 6));

    // Get the date for the start of that week
    const startOfWeek = this.getDateOfISOWeek(week, year);

    this.days = [];
    const today = new Date(); // Added

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const id = this.formatId(d);

      const isToday = d.getFullYear() === today.getFullYear() && // Added
        d.getMonth() === today.getMonth() && // Added
        d.getDate() === today.getDate(); // Added

      const entry: WeekDayEntry = {
        date: d,
        dayName: this.weekNames[d.getDay()],
        dayNumber: d.getDate(),
        id,
        isToday // Added
      };
      this.days.push(entry);

      this.factService.getDayFact(parseInt(id)).subscribe(fact => {
        if (fact) {
          entry.description = fact.description;
          entry.notes = fact.notes; // Added
          entry.meetingsCount = fact.meetings?.length || 0;
          entry.tasksCount = (fact.tasksActive?.length || 0) + (fact.tasksCompleted?.length || 0);
        }
      });
    }
  }

  private getDateOfISOWeek(w: number, y: number) {
    const simple = new Date(y, 0, 1 + (w - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay());
    else
      ISOweekStart.setDate(simple.getDate() + 7 - simple.getDay());
    return ISOweekStart;
  }

  private getYearWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return d.getUTCFullYear().toString() + weekNo.toString().padStart(2, '0');
  }

  private formatId(date: Date): string {
    return date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
  }

  viewDay(id: string) {
    this.router.navigate(['day', id], { relativeTo: this.route.parent });
  }
}
