import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';
import { FactService } from '../../services/fact.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    SelectButtonModule,
    FormsModule,
    PageToolbarComponent,
  ],
  template: `
    <div class="calendar-shell">
      <pb-page-toolbar
        [header]="header"
        [isEditing]="false"
        class="calendar-toolbar"
      >
        <div class="calendar-controls">
          <p-selectButton
            [options]="viewOptions"
            [(ngModel)]="selectedView"
            (onChange)="onViewChange()"
            styleClass="custom-select-button"
          ></p-selectButton>
          
          <div class="nav-group">
            <p-button
              icon="pi pi-chevron-left"
              [outlined]="true"
              severity="secondary"
              (onClick)="navigate(-1)"
              styleClass="nav-btn"
            ></p-button>
            <p-button
              label="Today"
              [outlined]="true"
              severity="secondary"
              (onClick)="goToToday()"
              styleClass="today-btn"
            ></p-button>
            <p-button
              icon="pi pi-chevron-right"
              [outlined]="true"
              severity="secondary"
              (onClick)="navigate(1)"
              styleClass="nav-btn"
            ></p-button>
          </div>
        </div>
      </pb-page-toolbar>

      <div class="calendar-view-viewport">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .calendar-shell {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 2rem;
    }

    .calendar-controls {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .nav-group {
      display: flex;
      align-items: center;
      background: var(--surface-glass);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--app-border);
      gap: 4px;
    }

    :host ::ng-deep .nav-btn .p-button,
    :host ::ng-deep .today-btn .p-button {
      border: none;
      background: transparent;
      color: var(--app-text);
      transition: all 0.2s;
    }

    :host ::ng-deep .nav-btn .p-button:hover,
    :host ::ng-deep .today-btn .p-button:hover {
      background: var(--surface-muted-glass);
      color: var(--theme-primary);
    }

    :host ::ng-deep .custom-select-button .p-selectbutton {
      background: var(--surface-glass);
      border: 1px solid var(--app-border);
      border-radius: 12px;
      padding: 4px;
      gap: 4px;
    }

    :host ::ng-deep .custom-select-button .p-button {
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--app-text-muted);
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.5rem 1.25rem;
      transition: all 0.2s;
    }

    :host ::ng-deep .custom-select-button .p-button.p-highlight {
      background: var(--theme-primary);
      color: var(--theme-primary-contrast);
      box-shadow: 0 4px 12px rgba(var(--theme-primary-rgb), 0.3);
    }

    .calendar-view-viewport {
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .calendar-controls {
        gap: 0.75rem;
        justify-content: space-between;
        width: 100%;
      }
      .nav-group {
        width: 100%;
        justify-content: space-between;
      }
      .nav-group .p-button {
        flex: 1;
      }
    }
  `]
})
export class CalendarComponent implements OnInit {
  header = 'Calendar';
  selectedView = 'month';
  viewOptions = [
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private factService: FactService
  ) { }

  ngOnInit() {
    // Sync today's tasks in the background
    this.factService.syncTodayTasks().subscribe();

    // Sync selectedView with route
    this.route.firstChild?.url.subscribe(url => {
      if (url.length > 0) {
        const path = url[0].path;
        this.selectedView = path;
      }
    });
  }

  onViewChange() {
    const today = new Date();
    if (this.selectedView === 'month') {
      const yearMonth = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0');
      this.router.navigate(['month', yearMonth], { relativeTo: this.route });
    } else if (this.selectedView === 'week') {
      const yearWeek = this.getYearWeek(today);
      this.router.navigate(['week', yearWeek], { relativeTo: this.route });
    } else {
      const yearMonthDay = today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');
      this.router.navigate(['day', yearMonthDay], { relativeTo: this.route });
    }
  }

  navigate(delta: number) {
    const currentUrl = this.router.url;
    const today = new Date();

    if (currentUrl.includes('/month')) {
      const ym = this.route.firstChild?.snapshot.params['yearMonth'] ||
        (today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0'));
      const year = parseInt(ym.substring(0, 4));
      const month = parseInt(ym.substring(4, 6)) - 1;
      const date = new Date(year, month + delta, 1);
      const nextYM = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0');
      this.router.navigate(['month', nextYM], { relativeTo: this.route });
    } else if (currentUrl.includes('/week')) {
      const yw = this.route.firstChild?.snapshot.params['yearWeek'] || this.getYearWeek(today);
      const year = parseInt(yw.substring(0, 4));
      const week = parseInt(yw.substring(4, 6));

      const date = this.getDateOfISOWeek(week, year);
      date.setDate(date.getDate() + (delta * 7));

      const nextYW = this.getYearWeek(date);
      this.router.navigate(['week', nextYW], { relativeTo: this.route });
    } else if (currentUrl.includes('/day')) {
      const ymd = this.route.firstChild?.snapshot.params['yearMonthDay'] ||
        (today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0'));
      const year = parseInt(ymd.substring(0, 4));
      const month = parseInt(ymd.substring(4, 6)) - 1;
      const day = parseInt(ymd.substring(6, 8));
      const date = new Date(year, month, day + delta);
      const nextYMD = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
      this.router.navigate(['day', nextYMD], { relativeTo: this.route });
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

  goToToday() {
    this.onViewChange();
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
