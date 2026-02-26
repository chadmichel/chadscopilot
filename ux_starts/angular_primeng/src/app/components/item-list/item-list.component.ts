import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NumberCleanup } from '../../pipes/number-cleanup.pipe';
import { IdDisplayPipe } from '../../pipes/id-display.pipe';
import { ShortDatePipe } from '../../pipes/short-date.pipe';
import { MediumDatePipe } from '../../pipes/medium-date.pipe';
import { getValueByDotNotationUtility } from '../../utilities/dot-notation-access.utility';
import { QueryOptions } from '../common-dto/query.dto';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar.component';
import { ItemListConfig, MetricCard } from './item-list.types';

@Component({
  selector: 'pb-item-list', // Changed from pb-item-list
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    PageToolbarComponent,
    ToastModule,
    ConfirmDialogModule,
    IdDisplayPipe,
    InputTextModule,
    FormsModule,
    ShortDatePipe,
    MediumDatePipe,
    ProgressSpinner,
    NumberCleanup,
  ],
  providers: [MessageService, ConfirmationService, ProgressSpinner],
  template: `
    <div class="list-page">
      <!-- Spinner overlay -->
      <div *ngIf="loading" class="spinner-overlay">
        <p-progressSpinner styleClass="global-spinner"></p-progressSpinner>
      </div>

      <pb-page-toolbar
        [header]="header"
        [supportsAdd]="config.supportsAdd || false"
        [supportsEdit]="false"
        [canMockData]="false"
        [actions]="getAllToolbarItems()"
        [metrics]="config.metrics"
        (onAdd)="handleAdd()"
      ></pb-page-toolbar>

      <!-- Metric Cards Section -->
      <div
        *ngIf="config.metricCards && config.metricCards.length > 0"
        class="metric-cards-container"
      >
        <div
          *ngFor="let card of config.metricCards; let i = index"
          class="metric-card"
          [style.background-color]="card.backgroundColor || '#3B82F6'"
          [style.color]="card.color || '#FFFFFF'"
          [class.clickable]="card.onClick"
          (click)="handleMetricCardClick(card)"
        >
          <div class="metric-card-icon" *ngIf="card.icon">
            <i [class]="card.icon"></i>
          </div>
          <div class="metric-card-content">
            <div class="metric-card-value">{{ getMetricCardValue(i) }}</div>
            <div class="metric-card-title">{{ card.title }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="config.enableSearch" class="search-container mb-3 flex gap-2">
        <span class="p-input-icon-right grow">
          <input
            type="text"
            pInputText
            [(ngModel)]="filterValue"
            (ngModelChange)="onFilterChange($event)"
            [placeholder]="'Search...'"
            class="w-full"
          />
        </span>
        <button
          *ngIf="config.onFilterClick"
          pButton
          label="Filter"
          icon="pi pi-filter"
          class="p-button-outlined"
          (click)="config.onFilterClick()"
        ></button>
      </div>

      <p-table
        #dt
        [value]="flatItems"
        [columns]="getVisibleColumns()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="config.rowsPerPageOptions || [10, 25, 50]"
        [loading]="loading"
        [totalRecords]="totalRecords"
        (onLazyLoad)="loadData($event)"
        [lazy]="true"
        dataKey="id"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
      >
        <ng-template pTemplate="header">
          <tr>
            <th *ngFor="let col of getVisibleColumns()">
              {{ col.header }}
            </th>
            <th *ngIf="config.supportsEdit || config.supportsDelete">
              Actions
            </th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-item>
          <tr
            (click)="handleRowClick(item)"
            [class.clickable-row]="config.onRowClick"
          >
            <td *ngFor="let col of getVisibleColumns()">
              <ng-container [ngSwitch]="col.type">
                <span *ngSwitchCase="'date'">
                  <span *ngIf="col.format === 'shortDate'">
                    {{ getValueByDotNotation(item, col.field) | shortDate }}
                  </span>
                  <span *ngIf="col.format === 'mediumDate'">
                    {{ getValueByDotNotation(item, col.field) | mediumDate }}
                  </span>
                  <span *ngIf="col.format === ''">
                    {{ getValueByDotNotation(item, col.field) | shortDate }}
                  </span>
                </span>
                <span *ngSwitchCase="'select'">
                  {{ getOptionLabel(col, item[col.field]) }}
                </span>
                <span *ngSwitchCase="'id'">
                  {{ getValueByDotNotation(item, col.field) | idDisplay }}
                </span>
                <span *ngSwitchCase="'checkbox'">
                  <p-checkbox
                    [(ngModel)]="item[col.field]"
                    binary="true"
                    disabled="true"
                  ></p-checkbox>
                </span>
                <span *ngSwitchCase="'number'">
                  {{ item[col.field] | numbercleanup }}
                </span>
                <span *ngSwitchCase="'base64Svg'">
                  @if (getValueByDotNotation(item, col.field)) {
                    <img
                      [src]="
                        'data:image/svg+xml;base64,' +
                        getValueByDotNotation(item, col.field)
                      "
                      [alt]="col.header"
                      style="width: 50px; height: 50px;"
                    />
                  }
                </span>
                <span *ngSwitchDefault>{{
                  getValueByDotNotation(item, col.field)
                }}</span>
              </ng-container>
            </td>
            <td *ngIf="config.supportsEdit || config.supportsDelete">
              <div class="flex gap-2">
                <button
                  *ngIf="config.supportsEdit"
                  pButton
                  icon="pi pi-pencil"
                  class="p-button-rounded p-button-text"
                  (click)="handleEdit(item)"
                ></button>
                <button
                  *ngIf="config.supportsDelete && config.dataService.deleteItem"
                  pButton
                  icon="pi pi-trash"
                  class="p-button-rounded p-button-text p-button-danger"
                  (click)="confirmDelete(item)"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [
    `
      .list-page {
        padding: 1.5rem 2rem;
        background: #f8fafc;
        min-height: calc(100vh - 100px);
      }

      .page-header {
        margin-bottom: 1.5rem;
      }

      .page-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0;
      }

      :host ::ng-deep .p-datatable .p-datatable-header {
        background: transparent;
        border: none;
        padding: 0;
      }

      :host ::ng-deep .p-datatable {
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }

      :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
        background: #fafafa;
        border-color: #f1f5f9;
      }

      :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        border-color: #f1f5f9;
      }

      :host ::ng-deep .p-paginator {
        background: white;
        border: none;
        border-top: 1px solid #f1f5f9;
      }

      .search-container {
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
      }
      .search-container .grow {
        flex-grow: 1;
      }
      :host ::ng-deep .p-input-icon-right {
        display: block;
      }
      :host ::ng-deep .p-input-icon-right input {
        width: 100%;
        background: white;
      }

      .spinner-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.3);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      :host ::ng-deep .global-spinner {
        width: 100px;
        height: 100px;
      }
      :host ::ng-deep .global-spinner .p-progress-spinner-circle {
        stroke: var(--primary-color);
        stroke-width: 4;
      }

      /* Metric Cards Styles */
      .metric-cards-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .metric-card {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        min-width: 150px;
        flex: 1;
        max-width: 250px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .metric-card.clickable {
        cursor: pointer;
      }

      .metric-card.clickable:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .metric-card-icon {
        font-size: 2rem;
        margin-right: 1rem;
        opacity: 0.9;
      }

      .metric-card-content {
        display: flex;
        flex-direction: column;
      }

      .metric-card-value {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .metric-card-title {
        font-size: 0.875rem;
        opacity: 0.9;
        margin-top: 0.25rem;
      }

      /* Optional visual cue for clickable rows */
      :host ::ng-deep .clickable-row {
        cursor: pointer;
      }

      @media (max-width: 768px) {
        .list-page {
          padding: 1rem;
        }

        .page-header h1 {
          font-size: 1.5rem;
        }

        .metric-card {
          min-width: 120px;
          padding: 0.75rem 1rem;
        }

        .metric-card-icon {
          font-size: 1.5rem;
          margin-right: 0.75rem;
        }

        .metric-card-value {
          font-size: 1.25rem;
        }

        .metric-card-title {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class ItemListComponent implements OnInit, OnDestroy {
  @Input() config!: ItemListConfig;

  header: string = '';

  items: any[] = [];
  flatItems: any[] = [];
  loading: boolean = false;
  totalRecords: number = 0;

  queryParams: QueryOptions = {};
  filterValue: string = '';
  isMobile: boolean = false;
  metricCardValues: (number | string)[] = [];

  // Add a subject for debouncing filter changes
  private filterSubject = new Subject<string>();
  private filterSubscription?: Subscription;
  private queryParamsSubscription?: Subscription;

  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    this.checkScreenSize();
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) { }

  // redeclare the utility function as a component method to use it in the template
  getValueByDotNotation = getValueByDotNotationUtility;

  ngOnInit() {
    this.checkScreenSize();

    // Set up debounced filter handling
    this.filterSubscription = this.filterSubject
      .pipe(
        debounceTime(500), // Wait 500ms after the last event before emitting
        distinctUntilChanged(), // Only emit if value changed
      )
      .subscribe((filterValue) => {
        this.loadData({
          first: 0,
          rows: 10,
          filter: filterValue,
        });
      });

    // Subscribe to query parameter changes to reload data
    this.queryParamsSubscription = this.route.queryParams
      .pipe(
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
      )
      .subscribe((queryParams) => {
        // Update filter value from query params if present
        if (queryParams['filter'] !== undefined) {
          this.filterValue = queryParams['filter'];
        }
        // Reload data with new query parameters
        this.loadData({
          first: 0,
          rows: 10,
        });
      });

    // Load metric card values
    this.loadMetricCards();
  }

  /**
   * Load all metric card values
   */
  private loadMetricCards(): void {
    if (!this.config?.metricCards) return;

    this.metricCardValues = new Array(this.config.metricCards.length);

    this.config.metricCards.forEach((card, index) => {
      card.loadValue().subscribe({
        next: (value) => {
          this.metricCardValues[index] = value;
        },
        error: (err) => {
          console.error(`Error loading metric card "${card.title}":`, err);
          this.metricCardValues[index] = '--';
        },
      });
    });
  }

  /**
   * Handle metric card click
   */
  handleMetricCardClick(card: MetricCard): void {
    if (card.onClick) {
      card.onClick();
    }
  }

  /**
   * Get metric card value by index, returns loading indicator if not yet loaded
   */
  getMetricCardValue(index: number): string | number {
    const value = this.metricCardValues[index];
    return value !== undefined ? value : '...';
  }

  ngOnDestroy() {
    // Clean up subscriptions
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  getAllToolbarItems() {
    return [...(this.config.customToolbarItems || [])];
  }

  loadData(event: any) {
    this.header = this.config.header;
    this.loading = true;
    const params = this.config.dataService.parseParams(
      this.route.snapshot.params,
      this.route.snapshot.queryParams,
    );

    // Add pagination to params
    params.skip = event.first ?? event.skip;
    params.take = event.rows ?? event.take;

    // Add filter to params
    if (this.filterValue) {
      params.filter = this.filterValue;
    }

    this.config.dataService.loadItems(params).subscribe({
      next: (result) => {
        this.items = result.items;

        this.flatItems = result.items.map((item) => ({
          ...item,
          ...item.item,
          // Ensure the id from the QueryResultItem wrapper takes precedence
          id: item.id,
        }));

        this.totalRecords = result.total;
        this.loading = false;

        if (this.config.dataService.updateHeader) {
          this.header = this.config.dataService.updateHeader(
            params,
            this.items,
            result.total,
          );
        }
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load items',
        });
        this.loading = false;
      },
    });
  }

  handleAdd() {
    if (this.config.onAdd) {
      this.config.onAdd(null);
    } else {
      this.router.navigate(['new'], { relativeTo: this.route });
    }
  }

  handleEdit(item: any) {
    if (this.config.onEdit) {
      this.config.onEdit(item);
    } else {
      const itemId = item?.id;
      if (itemId == null) {
        console.error('Cannot edit item: id is null or undefined', item);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Cannot edit item: missing ID',
        });
        return;
      }
      if (this.config.editRouteAppend) {
        this.router.navigate([itemId, this.config.editRouteAppend], {
          relativeTo: this.route,
        });
      } else {
        this.router.navigate([itemId], { relativeTo: this.route });
      }
    }
  }

  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this item?',
      accept: () => {
        if (this.config.dataService.deleteItem) {
          this.config.dataService.deleteItem(this.queryParams, item).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Item deleted successfully',
              });
              this.loadData({
                skip: 0,
                take: 10,
              });
            },
            error: (error) => {
              console.error('Error deleting item:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete item',
              });
            },
          });
        }
      },
    });
  }

  handleRowClick(item: any) {
    if (this.config?.onRowClick) {
      this.config.onRowClick(item);
    }
  }

  getOptionLabel(col: any, value: any): string {
    if (!col.options) return value;
    const option = col.options.find((opt: any) => opt.value === value);
    return option ? option.label : value;
  }

  getVisibleColumns() {
    if (!this.config?.columns) return [];
    const columns = this.isMobile
      ? this.config.columns.filter((col) => !col.mobileHide)
      : this.config.columns;
    return columns;
  }

  // Update onFilterChange to use the subject
  onFilterChange(event: any) {
    this.filterSubject.next(event);
  }

  startSpinner() {
    this.loading = true;
  }

  stopSpinner() {
    this.loading = false;
  }
}
