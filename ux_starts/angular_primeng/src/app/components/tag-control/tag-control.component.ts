import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagControlConfig, TagItem } from './tag-control.types';

@Component({
  selector: 'pb-tag-control',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectModule,
    ChipModule,
    ButtonModule,
    TooltipModule,
    ProgressSpinnerModule,
  ],
  template: `
    <div class="tag-control">
      <label class="tag-label">{{ config.label }}</label>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading-container">
        <p-progressSpinner
          [style]="{ width: '24px', height: '24px' }"
        ></p-progressSpinner>
        <span class="loading-text">Loading...</span>
      </div>

      <!-- View mode - display tags as chips -->
      <div *ngIf="!loading && !isEditing" class="tags-view">
        <p-chip
          *ngFor="let tag of selectedTags"
          [label]="tag.label"
          styleClass="tag-chip"
        ></p-chip>
        <span *ngIf="selectedTags.length === 0" class="no-tags">
          No {{ config.label.toLowerCase() || 'tags' }} assigned
        </span>
      </div>

      <!-- Edit mode - multiselect dropdown -->
      <div *ngIf="!loading && isEditing" class="tags-edit">
        <p-multiSelect
          [options]="availableTags"
          [(ngModel)]="selectedTagIds"
          [placeholder]="config.placeholder || 'Select ' + config.label"
          optionLabel="label"
          optionValue="id"
          [showClear]="true"
          [filter]="true"
          filterPlaceholder="Search..."
          display="chip"
          [style]="{ width: '100%' }"
          (onChange)="onSelectionChange($event)"
        ></p-multiSelect>
      </div>

      <!-- Dirty indicator -->
      <div *ngIf="isDirty && !config.autoSave" class="dirty-indicator">
        <i class="pi pi-info-circle"></i>
        <span>Changes pending - save to apply</span>
      </div>
    </div>
  `,
  styles: [
    `
      .tag-control {
        margin-bottom: 1rem;
      }

      .tag-label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }

      .loading-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0;
      }

      .loading-text {
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .tags-view {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        min-height: 2rem;
        align-items: center;
      }

      .no-tags {
        color: var(--text-color-secondary);
        font-style: italic;
        font-size: 0.875rem;
      }

      .tags-edit {
        width: 100%;
      }

      :host ::ng-deep .tag-chip {
        background-color: var(--primary-100);
        color: var(--primary-700);
      }

      .dirty-indicator {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-top: 0.5rem;
        color: var(--orange-500);
        font-size: 0.75rem;
      }

      .dirty-indicator i {
        font-size: 0.75rem;
      }
    `,
  ],
})
export class TagControlComponent implements OnInit, OnChanges {
  @Input() config!: TagControlConfig;
  @Input() entityId: string = '';
  @Input() isEditing: boolean = false;

  @Output() tagsChanged = new EventEmitter<string[]>();
  @Output() tagsSaved = new EventEmitter<void>();

  loading: boolean = false;
  availableTags: TagItem[] = [];
  selectedTags: TagItem[] = [];
  selectedTagIds: string[] = [];
  originalTagIds: string[] = [];
  isDirty: boolean = false;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityId'] && !changes['entityId'].firstChange) {
      this.loadData();
    }
  }

  private loadData(): void {
    if (!this.entityId || this.entityId === 'new') {
      this.selectedTags = [];
      this.selectedTagIds = [];
      this.originalTagIds = [];
      return;
    }

    this.loading = true;

    // Load available tags
    this.config.loadAvailableTags().subscribe({
      next: (tags) => {
        this.availableTags = tags;
        this.loadCurrentTags();
      },
      error: (err) => {
        console.error('Error loading available tags:', err);
        this.loading = false;
      },
    });
  }

  private loadCurrentTags(): void {
    if (!this.entityId || this.entityId === 'new') {
      this.loading = false;
      return;
    }

    this.config.loadTags(this.entityId).subscribe({
      next: (tags) => {
        this.selectedTags = tags;
        this.selectedTagIds = tags.map((t) => t.id);
        this.originalTagIds = [...this.selectedTagIds];
        this.isDirty = false;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading current tags:', err);
        this.loading = false;
      },
    });
  }

  onSelectionChange(event: any): void {
    // Update selectedTags based on selectedTagIds
    this.selectedTags = this.availableTags.filter((tag) =>
      this.selectedTagIds.includes(tag.id)
    );

    // Check if dirty
    this.isDirty = !this.arraysEqual(this.selectedTagIds, this.originalTagIds);

    // Emit change event
    this.tagsChanged.emit(this.selectedTagIds);

    // Auto-save if configured
    if (this.config.autoSave && this.isDirty) {
      this.save();
    }
  }

  /**
   * Save the current tag selection
   * Call this method from the parent component when saving
   */
  save(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.entityId || this.entityId === 'new') {
        resolve();
        return;
      }

      if (!this.isDirty) {
        resolve();
        return;
      }

      this.config.saveTags(this.entityId, this.selectedTagIds).subscribe({
        next: () => {
          this.originalTagIds = [...this.selectedTagIds];
          this.isDirty = false;
          this.tagsSaved.emit();
          resolve();
        },
        error: (err) => {
          console.error('Error saving tags:', err);
          reject(err);
        },
      });
    });
  }

  /**
   * Reset to original state
   */
  reset(): void {
    this.selectedTagIds = [...this.originalTagIds];
    this.selectedTags = this.availableTags.filter((tag) =>
      this.selectedTagIds.includes(tag.id)
    );
    this.isDirty = false;
  }

  /**
   * Refresh data from server
   */
  refresh(): void {
    this.loadData();
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }
}

