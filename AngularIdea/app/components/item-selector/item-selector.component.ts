import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Custom imports
import { ItemSelectorConfig } from './item-selector.types';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  Subject,
  Subscription,
} from 'rxjs';
import { QueryOptions, QueryResult } from '../common-dto/query.dto';
import { SelectDialogComponent } from '../select-dialog/select-dialog.component';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar.component';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ShortDatePipe } from '../../pipes/short-date.pipe';
import { IdDisplayPipe } from '../../pipes/id-display.pipe';
import {
  SelectDialogConfig,
  SelectDialogDataService,
} from '../select-dialog/select-dialog.types';
import { UserDto } from '../../dto/user.dto';

@Component({
  selector: 'pb-item-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    ToolbarModule,
    DynamicDialogModule,
    ConfirmDialogModule,
    ToastModule,
    PageToolbarComponent,
    ProgressSpinner,
    ShortDatePipe,
    IdDisplayPipe,
    SelectDialogComponent, // Make sure this is imported correctly
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  template: `
    <!-- Spinner overlay -->
    <div *ngIf="loading" class="spinner-overlay">
      <p-progressSpinner styleClass="global-spinner"></p-progressSpinner>
    </div>
    <pb-page-toolbar
      [header]="header"
      [supportsAdd]="true"
      [supportsEdit]="false"
      [canMockData]="false"
      (onAdd)="openSelectDialog()"
      [actions]="getAllToolbarItems()"
      [metrics]="config.metrics"
    ></pb-page-toolbar>

    <p-table
      #dt
      [value]="flatItems"
      [columns]="getVisibleColumns()"
      [paginator]="false"
      [rows]="10"
      [rowsPerPageOptions]="[100]"
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
          <th *ngIf="config.dataService.removeLink">Actions</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-item>
        <tr>
          <td *ngFor="let col of getVisibleColumns()">
            <ng-container [ngSwitch]="col.type">
              <span *ngSwitchCase="'date'">
                {{ item[col.field] | shortDate }}
              </span>
              <span *ngSwitchCase="'select'">
                {{ getOptionLabel(col, item[col.field]) }}
              </span>
              <span *ngSwitchCase="'id'">
                {{ item[col.field] | idDisplay }}
              </span>
              <span *ngSwitchDefault>{{ item[col.field] }}</span>
            </ng-container>
          </td>
          <td *ngIf="config.dataService.removeLink">
            <div class="flex gap-2">
              <button
                *ngIf="config.dataService.removeLink"
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

    <app-select-dialog
      #selectDialog
      [config]="selectDialogConfig"
    ></app-select-dialog>

    <p-confirmDialog></p-confirmDialog>
    <p-toast></p-toast>
  `,
  styles: [
    `
      :host ::ng-deep .p-datatable .p-datatable-header {
        background: transparent;
        border: none;
        padding: 0;
      }
      .search-container {
        margin-bottom: 1rem;
      }
      :host ::ng-deep .p-input-icon-right {
        display: block;
      }
      :host ::ng-deep .p-input-icon-right input {
        width: 100%;
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
    `,
  ],
})
export class ItemSelectorComponent implements OnInit {
  @Input() config!: ItemSelectorConfig;
  @ViewChild('selectDialog') selectDialog!: SelectDialogComponent;

  header: string = '';
  subHeader: string = '';

  items: any[] = [];
  flatItems: any[] = [];

  loading: boolean = false;
  totalRecords: number = 0;

  queryParams: QueryOptions = {};
  filterValue: string = '';
  isMobile: boolean = false;

  // Add a subject for debouncing filter changes
  private filterSubject = new Subject<string>();
  private filterSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.checkScreenSize();

    // Set up debounced filter handling
    this.filterSubscription = this.filterSubject
      .pipe(
        debounceTime(500), // Wait 500ms after the last event before emitting
        distinctUntilChanged() // Only emit if value changed
      )
      .subscribe((filterValue) => {
        this.loadData({
          first: 0,
          rows: 10,
          filter: filterValue,
        });
      });
  }

  ngOnDestroy() {
    // Clean up subscriptions
    if (this.filterSubscription) {
      this.filterSubscription.unsubscribe();
    }
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  getAllToolbarItems() {
    return [...(this.config.customToolbarItems || [])];
  }

  loadData(event: any) {
    this.header = this.config.title;
    this.subHeader = this.config.subTitle || '';
    this.loading = true;
    const params = this.config.dataService.parseParams(
      this.route.snapshot.params,
      this.route.snapshot.queryParams
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
            result.total
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

  confirmDelete(item: any) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this item?',
      accept: () => {
        if (this.config.dataService.removeLink) {
          this.config.dataService.removeLink(item).subscribe({
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

  getVisibleColumns() {
    if (!this.config?.columns) return [];
    const columns = this.isMobile
      ? this.config.columns.filter((col) => !col.mobileHide)
      : this.config.columns;
    return columns;
  }

  getOptionLabel(col: any, value: any): string {
    if (!col.options) return value;
    const option = col.options.find((opt: any) => opt.value === value);
    return option ? option.label : value;
  }

  openSelectDialog() {
    this.selectDialog.show();
  }

  selectDialogConfig: SelectDialogConfig<any> = {
    header: 'Select Items',
    columns: [
      {
        field: 'displayName',
        header: 'Name',
        type: 'text',
      },
    ],
    dataService: {
      loadItems: (params: QueryOptions) => {
        const newParams = {
          ...params,
          excludeMine: true,
        };
        return this.config.dataService.itemsForSelect(newParams);
      },
      selectItems: async (items: any[]) => {
        const requests = items.map(async (item: any) => {
          if (!this.config.dataService.linkItem) {
            return;
          }
          await firstValueFrom(this.config.dataService.linkItem(item.id));
        });
        Promise.all(requests).then(() => {
          this.loadData(this.queryParams);
        });
      },
    },
  };
}
