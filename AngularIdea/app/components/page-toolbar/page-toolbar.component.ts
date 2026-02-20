import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarAction, Metric } from './page-toolbar.types';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { MenuItem } from 'primeng/api';
import { FluidModule } from 'primeng/fluid';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'pb-page-toolbar', // Changed from app-page-toolbar
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToolbarModule,
    TooltipModule,
    FluidModule,
  ],
  template: `
    <div class="page-toolbar">
      <div class="breadcrumb-container" *ngIf="breadcrumbs.length > 0">
        <div class="breadcrumb-track">
          <ng-container *ngFor="let item of breadcrumbs; let last = last">
            <a [routerLink]="item.routerLink" class="breadcrumb-item" [class.active]="last">
              <i *ngIf="item.icon" [class]="'pi ' + item.icon + ' mr-1'"></i>
              {{ item.label }}
            </a>
            <span class="breadcrumb-separator" *ngIf="!last">/</span>
          </ng-container>
        </div>
      </div>

      <p-toolbar class="header-row">
        <div class="p-toolbar-group-start">
          <h1 class="page-title">{{ header }}</h1>
        </div>

        <div class="p-toolbar-group-end">
          <!-- Add button - hide in edit mode -->
          <p-button
            *ngIf="supportsAdd && !isEditing"
            icon="pi pi-plus"
            (onClick)="onAddClick()"
            [label]="isDesktop ? 'Add' : undefined"
            styleClass="p-button-primary mr-2"
          ></p-button>

          <!-- Delete button - only show if supported and not in edit mode -->
          <p-button
            *ngIf="supportsDelete && !isEditing"
            icon="pi pi-trash"
            (onClick)="onDeleteClick()"
            [label]="isDesktop ? 'Delete' : undefined"
            styleClass="p-button-danger mr-2"
          ></p-button>

          <!-- Custom actions - hide in edit mode -->
          <ng-container *ngIf="!isEditing">
            <p-button
              *ngFor="let action of nonEditingActions()"
              [icon]="action.icon"
              [label]="isDesktop ? action.label : undefined"
              (onClick)="action.onClick()"
              [styleClass]="
                (action.styleClass || 'p-button-secondary') + ' mr-2'
              "
            ></p-button>
          </ng-container>

          <!-- Edit mode actions -->
          <ng-container *ngIf="supportsEdit">
            <ng-container *ngIf="isEditing">
              <p-button
                *ngFor="let action of editingActions()"
                [icon]="action.icon"
                [label]="isDesktop ? action.label : undefined"
                (onClick)="action.onClick()"
                [styleClass]="
                  (action.styleClass || 'p-button-secondary') + ' mr-2'
                "
              ></p-button>
            </ng-container>
            <p-button
              *ngIf="allowMocking && isEditing"
              icon="pi pi-cog"
              [label]="isDesktop ? 'Mock Data' : undefined"
              (onClick)="onMockDataClick()"
              styleClass="p-button-secondary"
            ></p-button>
            <p-button
              *ngIf="!isEditing"
              icon="pi pi-pencil"
              [label]="isDesktop ? 'Edit' : undefined"
              (onClick)="onEditClick()"
              styleClass="p-button-secondary"
            ></p-button>
            <ng-container *ngIf="isEditing">
              <p-button
                *ngIf="supportsRowEdit === true"
                icon="pi pi-plus"
                [label]="isDesktop ? 'Add Row' : undefined"
                (onClick)="onAddRowclick()"
                styleClass="p-button-secondary mr-2"
              ></p-button>
              <p-button
                *ngIf="supportsRowEdit === true"
                icon="pi pi-minus"
                [label]="isDesktop ? 'Delete Row' : undefined"
                (onClick)="onDeleteRowclick()"
                styleClass="p-button-secondary mr-2"
              ></p-button>
              <p-button
                icon="pi pi-save"
                [label]="isDesktop ? 'Save' : undefined"
                (onClick)="onSaveClick()"
                styleClass="p-button-success mr-2"
              ></p-button>
              <p-button
                icon="pi pi-times"
                [label]="isDesktop ? 'Cancel' : undefined"
                (onClick)="onCancelClick()"
                styleClass="p-button-danger"
              ></p-button>
            </ng-container>
          </ng-container>
          <ng-content></ng-content>
        </div>
      </p-toolbar>

      <!-- Metrics row -->
      <div
        *ngIf="metrics?.length"
        class="metrics-row flex align-items-center mt-2"
      >
        <div
          *ngFor="let metric of metrics; let last = last"
          class="metric flex align-items-center"
        >
          <i [class]="'pi ' + metric.icon"></i>&nbsp;
          <span class="value ml-2">{{ metric.value }}</span>
          <span class="label ml-2">{{ metric.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .p-toolbar {
        border: none;
        background: transparent;
        padding: 0;
        min-height: unset;

        .p-toolbar-group-start,
        .p-toolbar-group-end {
          gap: 0.5rem;
        }

        .p-button {
          height: 2.5rem;
        }
      }

      .breadcrumb-container {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        animation: fadeInDown 0.4s ease-out;
      }

      .breadcrumb-track {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--app-text-muted);
      }

      .breadcrumb-item {
        text-decoration: none;
        color: inherit;
        transition: color 0.2s;
        font-weight: 500;
      }

      .breadcrumb-item:hover:not(.active) {
        color: var(--theme-primary);
      }

      .breadcrumb-item.active {
        color: var(--app-text);
        font-weight: 600;
        pointer-events: none;
      }

      .breadcrumb-separator {
        opacity: 0.4;
        font-size: 0.75rem;
      }

      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .header-row {
        min-height: 2.5rem;
      }

      /* Uses global .page-title from styles.scss */

      .metrics-row {
        white-space: nowrap;
        overflow-x: auto;
        margin-top: 0.25rem;
        margin-bottom: 0.75rem;
      }

      .metric {
        display: inline-flex;
        align-items: center;
        margin-right: 0.5rem;

        i {
          color: var(--theme-primary);
          font-size: 1rem;
        }
      }

      .separator {
        width: 8px;
        height: 4px;
        border-radius: 50%;
        background-color: var(--surface-500);
      }

      @media screen and (max-width: 768px) {
        .p-toolbar-group-end {
          .p-button {
            padding: 0.5rem;
            height: 2rem;

            .p-button-label {
              display: none;
            }

            &.mr-2 {
              margin-right: 0.5rem !important;
            }
          }
        }

        /* page-title responsive handled by global styles.scss */

        .metrics-row {
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class PageToolbarComponent {
  @Input() header: string = '';
  @Input() actions: ToolbarAction[] = [];
  @Input() metrics?: Metric[];
  @Input() supportsEdit: boolean = false;
  @Input() supportsRowEdit: boolean = false;
  @Input() supportsAdd: boolean = false;
  @Input() supportsDelete: boolean = false;
  @Input() isEditing: boolean = false;
  @Input() canMockData: boolean = false;
  @Output() onEdit: EventEmitter<void> = new EventEmitter<void>();
  @Output() onSave: EventEmitter<void> = new EventEmitter<void>();
  @Output() onCancel: EventEmitter<void> = new EventEmitter<void>();
  @Output() onAdd: EventEmitter<void> = new EventEmitter<void>();
  @Output() onDelete: EventEmitter<void> = new EventEmitter<void>();
  @Output() onMockData: EventEmitter<void> = new EventEmitter<void>();
  isDesktop: boolean = window.innerWidth > 768;

  breadcrumbs: MenuItem[] = [];
  allowMocking: boolean = false;

  nonEditingActions = (): ToolbarAction[] => this.actions.filter((a) => !a.showWhileEditing);
  editingActions = (): ToolbarAction[] => this.actions.filter((a) => a.showWhileEditing);

  constructor(
    private breadcrumbService: BreadcrumbService,
    private router: Router
  ) {
    window.addEventListener('resize', () => {
      this.isDesktop = window.innerWidth > 768;
    });

    this.allowMocking = false;
  }

  ngOnInit() {
    this.breadcrumbService.breadcrumbsSubject.subscribe(items => {
      this.breadcrumbs = items;
    });
  }

  goBack() {
    if (this.breadcrumbs.length > 1) {
      const prev = this.breadcrumbs[this.breadcrumbs.length - 2];
      if (prev.routerLink) {
        this.router.navigate(Array.isArray(prev.routerLink) ? prev.routerLink : [prev.routerLink]);
      }
    }
  }

  onAddClick() {
    this.onAdd.emit();
  }

  onEditClick() {
    this.onEdit.emit();
  }

  onSaveClick() {
    this.onSave.emit();
  }

  onAddRowclick() {
    this.onAdd.emit();
  }

  onDeleteRowclick() {
    this.onDelete.emit();
  }

  onCancelClick() {
    this.onCancel.emit();
  }

  onMockDataClick() {
    console.log('Mock data toolbar');
    this.onMockData.emit();
  }

  onDeleteClick() {
    this.onDelete.emit();
  }
}
