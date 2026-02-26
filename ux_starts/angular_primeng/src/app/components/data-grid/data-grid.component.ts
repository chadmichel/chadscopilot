import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  Column,
  GridReadyEvent,
  RowSelectedEvent,
  RowDoubleClickedEvent,
  FilterChangedEvent,
  SortChangedEvent,
  CellClickedEvent,
} from 'ag-grid-community';
import { ButtonModule } from 'primeng/button';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar.component';
import { DataGridConfig } from './data-grid.types';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { QueryOptions } from '../common-dto/query.dto';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { DropdownModule } from 'primeng/dropdown';
import { MenuModule } from 'primeng/menu';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { forkJoin } from 'rxjs';
import { switchMap, finalize, catchError } from 'rxjs/operators';
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'pb-data-grid',
  standalone: true,
  imports: [
    CommonModule,
    AgGridModule,
    ButtonModule,
    PageToolbarComponent,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    FormsModule,
    ProgressSpinnerModule,
    TooltipModule,
    ToolbarModule,
    DropdownModule,
    MenuModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <!-- Spinner overlay -->
    <div *ngIf="loading" class="spinner-overlay">
      <p-progressSpinner styleClass="global-spinner"></p-progressSpinner>
    </div>

    <!-- Page toolbar -->
    <pb-page-toolbar
      #pageToolbarComponent
      [header]="header"
      [supportsAdd]="false"
      [supportsEdit]="config.supportsInlineEdit || false"
      [supportsRowEdit]="config.supportsInlineEdit || false"
      [canMockData]="false"
      [actions]="getAllToolbarItems()"
      [metrics]="config.metrics"
      (onEdit)="startEdit()"
      (onSave)="saveChanges()"
      (onCancel)="cancelEdit()"
      (onAdd)="handleAdd()"
      (onDelete)="handleDelete()"
      [isEditing]="editMode"
    ></pb-page-toolbar>

    <!-- AG Grid component -->
    <ag-grid-angular
      class="ag-theme-alpine"
      [columnDefs]="columnDefs"
      [rowData]="rowData"
      [defaultColDef]="defaultColDef"
      [animateRows]="true"
      [suppressMenuHide]="true"
      [enableCellTextSelection]="true"
      [suppressCellFocus]="false"
      [suppressDragLeaveHidesColumns]="true"
      [suppressNoRowsOverlay]="true"
      rowSelection="single"
      (gridReady)="onGridReady($event)"
      domLayout="autoHeight"
      style="width: 100%; height: calc(100vh - 220px);"
    ></ag-grid-angular>

    <!-- Confirmation dialog -->
    <p-confirmDialog
      header="Confirmation"
      icon="pi pi-exclamation-triangle"
      [style]="{ width: '450px' }"
      acceptButtonStyleClass="p-button-danger"
      rejectButtonStyleClass="p-button-text"
    >
    </p-confirmDialog>

    <!-- Toast -->
    <p-toast></p-toast>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
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

      .search-container {
        margin-bottom: 1rem;
      }

      .full-width {
        width: 100%;
      }

      .grid-toolbar {
        margin-bottom: 1rem;
      }

      :host ::ng-deep .ag-theme-alpine {
        --ag-header-background-color: var(--surface-ground);
        --ag-odd-row-background-color: var(--surface-a);
      }

      .mb-3 {
        margin-bottom: 1rem;
      }

      .mr-2 {
        margin-right: 0.5rem;
      }
    `,
  ],
})
export class DataGridComponent implements OnInit, OnDestroy {
  @Input() config!: DataGridConfig;
  @ViewChild('pageToolbarComponent')
  pageToolbarComponent!: PageToolbarComponent;

  // Grid properties
  header: string = '';
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  rowsToDelete: any[] = [];
  defaultColDef: ColDef = {};

  api: GridApi | undefined;

  // Pagination properties
  pageSize: number = 500;
  pageSizeOptions: any[] = [];

  // State properties
  loading: boolean = false;
  filterValue: string = '';
  queryParams: QueryOptions = {};
  isMobile: boolean = false;
  editMode: boolean = false;

  // Grid API references
  private gridApi: GridApi | undefined;

  // Resize event listener
  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    this.checkScreenSize();
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.initializeComponent();
    this.rowsToDelete = [];
  }

  ngOnDestroy() {}

  private initializeComponent() {
    // Initialize header
    this.header = this.config.header;

    // Initialize pagination options
    this.pageSize = 500; //this.config.defaultPageSize || 500;
    // this.pageSizeOptions = this.config.rowsPerPageOptions?.map((size) => ({
    //   label: size.toString(),
    //   value: size,
    // })) || [{ label: '500', value: 500 }];

    // Set up default column definitions
    this.setupDefaultColDef();

    // Process column definitions
    this.setupColumnDefs();
  }

  private setupDefaultColDef() {
    this.defaultColDef = {
      resizable: true,
      sortable: this.config.enableSorting !== false,
      filter: false,
      floatingFilter: false,
      minWidth: 100,
      flex: 1,
    };
  }

  private setupColumnDefs() {
    // Process column definitions to transform our custom types to ag-grid formats
    this.columnDefs = this.config.columnDefs.map((colDef) => {
      const agColDef: ColDef = {
        field: colDef.field,
        headerName: colDef.headerName,
        editable: this.config.supportsInlineEdit,
      };

      // Set up value formatter based on column type
      if (colDef.type === 'date' && !colDef.valueFormatter) {
        agColDef.valueFormatter = (params) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        };
      } else if (colDef.type === 'currency' && !colDef.valueFormatter) {
        agColDef.valueFormatter = (params) => {
          if (params.value == null) return '';
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(params.value);
        };
      } else if (
        colDef.type === 'select' &&
        colDef.options &&
        !colDef.valueFormatter
      ) {
        agColDef.valueFormatter = (params) => {
          if (params.value == null) return '';
          const option = colDef.options?.find(
            (opt) => opt.value === params.value
          );
          return option ? option.label : params.value;
        };
      } else if (colDef.type === 'boolean' && !colDef.cellRenderer) {
        agColDef.cellRenderer = (params: any) => {
          return params.value
            ? '<div class="ag-cell-boolean-value"><i class="pi pi-check" style="color: green;"></i></div>'
            : '<div class="ag-cell-boolean-value"><i class="pi pi-times" style="color: red;"></i></div>';
        };
      }

      // // Set appropriate filter type
      // if (colDef.type === 'text') {
      //   agColDef.filter = 'agTextColumnFilter';
      // } else if (colDef.type === 'number' || colDef.type === 'currency') {
      //   agColDef.filter = 'agNumberColumnFilter';
      // } else if (colDef.type === 'date') {
      //   agColDef.filter = 'agDateColumnFilter';
      // } else if (colDef.type === 'boolean') {
      //   agColDef.filter = 'agSetColumnFilter';
      // } else if (colDef.type === 'select') {
      //   agColDef.filter = 'agSetColumnFilter';
      // }

      return agColDef;
    });

    // Add an action column if edit or delete is supported
    if (this.config.supportsEdit || this.config.supportsDelete) {
      this.columnDefs.push(this.createActionsColumn());
    }
  }

  private createActionsColumn(): ColDef {
    return {
      headerName: 'Actions',
      field: 'actions',
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right',
      width: 120,
      cellRenderer: (params: any) => {
        const container = document.createElement('div');
        container.className = 'action-buttons-container';

        return container;
      },
    };
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.api = params.api;

    // Initial load of data
    this.loadData({
      skip: 0,
      take: this.pageSize,
    });

    // Apply screen size adjustments
    this.checkScreenSize();

    // Set up grid size
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit();
    }
  }

  loadData(params: any) {
    this.header = this.config.header;
    this.loading = true;

    const queryParams = this.config.dataService.parseParams(
      this.route.snapshot.params,
      this.route.snapshot.queryParams
    );

    // Merge passed params with query params
    this.queryParams = { ...queryParams, ...params };

    this.config.dataService.loadItems(this.queryParams).subscribe({
      next: (result) => {
        // Process data
        const flatItems = result.items.map((item) => ({
          ...item,
          ...item.item,
          id: item.id,
        }));

        this.rowData = flatItems;

        // Update header if needed
        if (this.config.dataService.updateHeader) {
          this.header = this.config.dataService.updateHeader(
            this.queryParams,
            result.items,
            result.total
          );
          if (this.header.length > 12) {
            this.header = this.header.substring(0, 12) + '...';
          }
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load data',
        });
        this.loading = false;
      },
    });
  }

  getAllToolbarItems() {
    return [...(this.config.customToolbarItems || [])];
  }

  handleAdd() {
    if (this.config.dataService && this.config.dataService.newItem) {
      const newItem = this.config.dataService.newItem(this.queryParams);

      const flatItem = {
        ...newItem,
        id: '',
      };

      const selectedRows = this.gridApi?.getSelectedRows();
      if (selectedRows && selectedRows.length > 0) {
        const selectedRow = selectedRows[0];
        const selectedRowIndex = this.rowData.findIndex(
          (row) => row.id === selectedRow.id
        );

        if (selectedRowIndex !== -1) {
          this.rowData.splice(selectedRowIndex, 0, flatItem);
          this.rowData = [...this.rowData];
        }
      } else {
        this.rowData.unshift(flatItem);
        this.rowData = [...this.rowData];
      }
    }
  }

  handleDelete() {
    // remove the currently selected item
    const selectedRows = this.gridApi?.getSelectedRows();
    if (selectedRows && selectedRows.length > 0) {
      const selectedRow = selectedRows[0];
      this.rowData = this.rowData.filter((row) => row.id !== selectedRow.id);
      this.rowData = [...this.rowData];
      this.rowsToDelete.push(selectedRow);
    }
  }

  startEdit() {
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.loadData(this.queryParams);
  }

  saveChanges() {
    this.editMode = false;
    if (
      this.config.dataService &&
      this.config.dataService &&
      this.config.dataService.saveChanges &&
      this.config.dataService.deleteItem
    ) {
      // Create an array of observables to execute
      const operations = [];

      // Add delete operation if there are rows to delete
      if (this.rowsToDelete.length > 0) {
        operations.push(
          this.config.dataService.deleteItem(
            this.queryParams,
            this.rowsToDelete
          )
        );
      }

      // Add save operation
      operations.push(
        this.config.dataService.saveChanges(this.queryParams, this.rowData)
      );

      // Execute all operations in parallel and wait for all to complete
      forkJoin(operations).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Changes saved successfully',
          });
          this.rowsToDelete = [];
        },
        error: (error) => {
          console.error('Error saving changes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save changes',
          });
        },
      });
    }
  }

  onCellClicked(event: CellClickedEvent) {
    // Handle cell click events if needed
  }
}
