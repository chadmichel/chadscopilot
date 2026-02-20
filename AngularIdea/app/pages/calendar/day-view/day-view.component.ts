import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FactService } from '../../../services/fact.service';
import { DayFact } from '../../../dto/fact.dto';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-day-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TextareaModule,
    FormsModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="day-view-container" *ngIf="fact">
      <h2 class="mb-4">{{ displayDate }}</h2>

      <div class="grid">
        <div class="col-12 md:col-7">
          <p-card header="Summary" subheader="What happened on this day" styleClass="mb-4">
            <div class="description-text">
              {{ fact.description || 'No summary generated for this day.' }}
            </div>
          </p-card>

          <p-card header="Notes" subheader="Personal notes for this day" styleClass="mb-4">
            <textarea
              pTextarea
              [(ngModel)]="fact.notes"
              [rows]="10"
              [autoResize]="true"
              class="w-full mb-3"
              placeholder="Add your thoughts or notes..."
            ></textarea>
            <div class="flex justify-content-end">
              <p-button
                label="Save Notes"
                icon="pi pi-save"
                (onClick)="saveNotes()"
                [loading]="saving"
              ></p-button>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-5">
          <p-card header="Meetings" styleClass="mb-4">
            <div *ngIf="!fact.meetings?.length" class="empty-list">No meetings found.</div>
            <ul class="activity-list" *ngIf="fact.meetings?.length">
              <li *ngFor="let meeting of fact.meetings">
                <i class="pi pi-calendar mr-2"></i>
                <span>{{ meeting.summary || meeting.title }}</span>
                <span class="time-badge" *ngIf="meeting.start">
                  {{ formatTime(meeting.start) }}
                </span>
              </li>
            </ul>
          </p-card>

          <p-card header="Tasks" styleClass="mb-4">
            <div class="task-section mb-3">
              <div class="section-title">Active</div>
              <div *ngIf="!fact.tasksActive?.length" class="empty-list">No active tasks.</div>
              <ul class="activity-list" *ngIf="fact.tasksActive?.length">
                <li *ngFor="let task of fact.tasksActive">
                  <i class="pi pi-circle mr-2"></i>
                  <span>{{ task }}</span>
                </li>
              </ul>
            </div>

            <div class="task-section">
              <div class="section-title">Completed</div>
              <div *ngIf="!fact.tasksCompleted?.length" class="empty-list">No tasks completed.</div>
              <ul class="activity-list" *ngIf="fact.tasksCompleted?.length">
                <li *ngFor="let task of fact.tasksCompleted">
                  <i class="pi pi-check-circle text-green-500 mr-2"></i>
                  <span class="line-through">{{ task }}</span>
                </li>
              </ul>
            </div>
          </p-card>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!fact">
      <i class="pi pi-spin pi-spinner text-4xl"></i>
    </div>

    <p-toast></p-toast>
  `,
  styles: [`
    .day-view-container { max-width: 1200px; margin: 0 auto; }
    .description-text { font-size: 1.1rem; line-height: 1.6; white-space: pre-wrap; }
    .section-title { font-weight: 700; color: var(--text-color-secondary); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; margin-bottom: 0.5rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 0.25rem; }
    .activity-list { list-style: none; padding: 0; margin: 0; }
    .activity-list li { padding: 0.75rem 0; border-bottom: 1px solid var(--surface-border); display: flex; align-items: flex-start; font-size: 0.95rem; }
    .activity-list li:last-child { border-bottom: none; }
    .time-badge { font-size: 0.75rem; background: var(--surface-ground); padding: 2px 6px; border-radius: 4px; margin-left: auto; color: var(--text-color-secondary); }
    .empty-list { color: var(--text-color-secondary); font-style: italic; padding: 1rem 0; text-align: center; }
    .loading-state { display: flex; justify-content: center; padding: 5rem; }
  `]
})
export class DayViewComponent implements OnInit {
  fact: DayFact | null = null;
  displayDate = '';
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private factService: FactService,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['yearMonthDay'];
      if (id) {
        this.loadFact(id);
        this.formatDisplayDate(id);
      }
    });
  }

  loadFact(id: string) {
    const today = new Date();
    const todayId = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    if (id === todayId) {
      this.factService.syncTodayTasks().subscribe(fact => {
        if (fact) this.fact = { ...fact };
      });
    } else {
      this.factService.getDayFact(parseInt(id)).subscribe(fact => {
        if (fact) {
          this.fact = { ...fact };
        } else {
          const year = parseInt(id.substring(0, 4));
          const month = parseInt(id.substring(4, 6)) - 1;
          const day = parseInt(id.substring(6, 8));
          const date = new Date(year, month, day);
          this.fact = {
            friendlyName: date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            dayDimension: parseInt(id),
            meetings: [],
            tasksActive: [],
            tasksCompleted: [],
            notes: ''
          };
        }
      });
    }
  }

  formatDisplayDate(id: string) {
    const year = parseInt(id.substring(0, 4));
    const month = parseInt(id.substring(4, 6)) - 1;
    const day = parseInt(id.substring(6, 8));
    const date = new Date(year, month, day);
    this.displayDate = date.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  saveNotes() {
    if (!this.fact || !this.fact.dayDimension) return;
    this.saving = true;
    this.factService.saveDayFact(this.fact.dayDimension, this.fact).subscribe(() => {
      this.saving = false;
      this.messageService.add({
        severity: 'success', summary: 'Saved', detail: 'Notes have been saved successfully.'
      });
    });
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  goBack() {
    this.router.navigate(['../../month'], { relativeTo: this.route });
  }
}
