import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageToolbarComponent } from '../page-toolbar/page-toolbar.component';
import {
  DashboardConfig,
  DashboardItem,
  DashboardCardData,
  DashboardChartData,
  DashboardTableData,
  DashboardHierarchyData,
} from './dashboard.types';
import { interval, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardHierarchyComponent } from './dashboard-hierarchy.component';
import { DashboardTableComponent } from './dashboard-table.component';

@Component({
  selector: 'pb-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    ChartModule,
    ProgressSpinnerModule,
    ToastModule,
    PageToolbarComponent,
    DashboardHierarchyComponent,
    DashboardTableComponent,
  ],
  providers: [MessageService],
  template: `
    <pb-page-toolbar
      [header]="config.header"
      [supportsAdd]="false"
      [supportsEdit]="false"
      [isEditing]="false"
      [actions]="config.customToolbarItems || []"
    ></pb-page-toolbar>

    <div *ngIf="config.subheader" class="subheader mb-3">
      {{ config.subheader }}
    </div>

    <div class="dashboard-container">
      <div class="grid">
        <ng-container *ngFor="let item of config.items">
          <!-- Card -->
          <div [ngClass]="getItemColClass(item)" *ngIf="item.type === 'card'">
            <div
              class="dashboard-card"
              [style.background-color]="
                getCardData(item).backgroundColor || 'var(--surface-card)'
              "
              [style.color]="getCardData(item).color || 'inherit'"
              (click)="cardClick(getCardData(item))"
              [class.loading]="itemLoading.get(item) === true"
            >
              <div class="card-content">
                <div class="card-value-container">
                  <h2 class="card-value">{{ getCardData(item).value }}</h2>
                  <div *ngIf="getCardData(item).icon" class="card-icon">
                    <i [class]="'pi ' + getCardData(item).icon"></i>
                  </div>
                </div>
                <h3 class="card-title">{{ getCardData(item).title }}</h3>
                <p *ngIf="getCardData(item).subtitle" class="card-subtitle">
                  {{ getCardData(item).subtitle }}
                </p>
              </div>
              <div
                *ngIf="itemLoading.get(item) === true"
                class="card-loading-overlay"
              >
                <p-progressSpinner
                  [style]="{ width: '30px', height: '30px' }"
                ></p-progressSpinner>
              </div>
            </div>
          </div>

          <!-- Chart -->
          <div [ngClass]="getItemColClass(item)" *ngIf="item.type === 'chart'">
            <p-card [title]="getItemTitle(item)" styleClass="h-full">
              <h2>{{ getItemTitle(item) }}</h2>
              <div
                [class.loading-container]="itemLoading.get(item) === true"
                class="chart-wrapper"
              >
                <p-chart
                  [type]="getChartData(item).type"
                  [data]="getChartData(item).data"
                  [options]="getChartData(item).options || defaultChartOptions"
                  [height]="getChartData(item).height || '300px'"
                ></p-chart>
                <div
                  *ngIf="itemLoading.get(item) === true"
                  class="chart-loading-overlay"
                >
                  <p-progressSpinner></p-progressSpinner>
                </div>
              </div>
            </p-card>
          </div>

          <!-- Table -->
          <div
            [ngClass]="getItemColClass(item)"
            *ngIf="item.type === 'table'"
            class="overflow-x-auto"
          >
            <pb-dashboard-table
              [tableData]="getTableData(item)"
              [itemConfig]="item"
              [loading]="itemLoading.get(item) === true"
            ></pb-dashboard-table>
          </div>

          <!-- Hierarchy -->
          <div
            [ngClass]="getItemColClass(item)"
            *ngIf="item.type === 'hierarchy'"
          >
            <pb-dashboard-hierarchy
              [hierarchyData]="getHierarchyData(item)"
              [itemConfig]="item"
              [loading]="itemLoading.get(item) === true"
            ></pb-dashboard-hierarchy>
          </div>
        </ng-container>
      </div>
    </div>

    <p-toast></p-toast>
  `,
  styles: [
    `
      .dashboard-container {
        width: 100%;
      }

      .grid {
        display: flex;
        flex-wrap: wrap;
        min-width: 100%;
      }

      .overflow-x-auto {
        overflow-x: auto;
      }

      .chart-wrapper {
        min-width: 300px;
        overflow-x: auto;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 2rem 0;
        position: relative;
      }

      .subheader {
        font-size: 1.25rem;
        color: var(--text-color-secondary);
        margin-bottom: 1.5rem;
      }

      .dashboard-card {
        position: relative;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
        height: 100%;
        cursor: pointer;
        min-width: 200px;

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        &.loading {
          opacity: 0.7;
        }

        .card-content {
          display: flex;
          flex-direction: column;
        }

        .card-value-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .card-value {
          font-size: 2.5rem;
          font-weight: bold;
          margin: 0;
        }

        .card-icon {
          font-size: 2rem;
          opacity: 0.8;
        }

        .card-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .card-subtitle {
          margin: 0.5rem 0 0;
          font-size: 0.875rem;
          opacity: 0.8;
        }
      }

      .card-loading-overlay,
      .chart-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: 8px;
      }

      .h-full {
        height: 100%;
        min-width: 100%;
      }

      ::ng-deep .p-card {
        height: 100%;
        overflow: hidden;

        .p-card-body,
        .p-card-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .p-card-content {
          overflow: auto;
          flex: 1;
        }
      }

      @media screen and (max-width: 768px) {
        .dashboard-card {
          .card-value {
            font-size: 2rem;
          }

          .card-icon {
            font-size: 1.5rem;
          }
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  @Input() config!: DashboardConfig;

  // Map to track loading state for each item
  itemLoading = new Map<DashboardItem, boolean>();

  private refreshSubscription?: Subscription;

  defaultChartOptions = {
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-color)',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-color-secondary)',
        },
        grid: {
          color: 'var(--surface-border)',
        },
      },
      y: {
        ticks: {
          color: 'var(--text-color-secondary)',
        },
        grid: {
          color: 'var(--surface-border)',
        },
      },
    },
  };

  constructor(
    private router: Router,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load data for each item individually
    this.loadAllDashboardData();

    // Set up refresh interval if specified
    if (this.config.refreshInterval) {
      this.refreshSubscription = interval(
        this.config.refreshInterval
      ).subscribe(() => this.loadAllDashboardData());
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadAllDashboardData(): void {
    // Load data for all items
    if (this.config.items) {
      setTimeout(() => {
        this.config.items.forEach((item) => {
          if (
            item.loadItems &&
            item.type !== 'table' &&
            item.type !== 'hierarchy'
          ) {
            this.itemLoading.set(item, true);
            item
              .loadItems()
              .pipe(
                catchError((error) => {
                  console.error(`Error loading data for ${item.type}:`, error);
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `Failed to load data for ${this.getItemTitle(
                      item
                    )}`,
                  });
                  return of(null); // Return null on error
                })
              )
              .subscribe((data) => {
                if (data) {
                  // Update item with the loaded data
                  this.updateItemData(item, data);
                }
                this.itemLoading.set(item, false);
              });
          }
        });
      }, 500); // need to wait for some bindings to update
    }
  }

  // Helper methods to get typed data from the generic DashboardItem
  getCardData(item: DashboardItem): DashboardCardData {
    return item.data as DashboardCardData;
  }

  getChartData(item: DashboardItem): DashboardChartData {
    return item.data as DashboardChartData;
  }

  getTableData(item: DashboardItem): DashboardTableData {
    return item.data as DashboardTableData;
  }

  getHierarchyData(item: DashboardItem): DashboardHierarchyData {
    return item.data as DashboardHierarchyData;
  }

  // Helper method to get item title for messages
  getItemTitle(item: DashboardItem): string {
    switch (item.type) {
      case 'card':
        return this.getCardData(item).title;
      case 'chart':
        return this.getChartData(item).title;
      case 'table':
        return this.getTableData(item).title;
      case 'hierarchy':
        return this.getHierarchyData(item).title;
      default:
        return 'item';
    }
  }

  // Helper method to update item data based on type
  private updateItemData(item: DashboardItem, data: any): void {
    if (item.formatData) {
      data = item.formatData(item.data, data);
    }
    switch (item.type) {
      case 'card':
        this.updateCardData(item, data);
        break;
      case 'chart':
        this.updateChartData(item, data);
        break;
      case 'table':
        this.updateTableData(item, data);
        break;
      case 'hierarchy':
        this.updateHierarchyData(item, data);
        break;
    }
  }

  // Helper method to update card data
  private updateCardData(item: DashboardItem, data: any): void {
    const cardData = this.getCardData(item);
    if (typeof data === 'number' || typeof data === 'string') {
      cardData.value = data;
    } else if (data !== null && typeof data === 'object') {
      // If data is an object, you can extract properties as needed
      Object.assign(cardData, data);
    }
  }

  // Helper method to update chart data
  private updateChartData(item: DashboardItem, data: any): void {
    const chartData = this.getChartData(item);
    if (data && (data.labels || data.datasets)) {
      chartData.data = data;
    } else if (data) {
      // Handle custom data formats
      chartData.data = {
        labels: data.labels || [],
        datasets: data.datasets || [
          {
            data: Array.isArray(data) ? data : [],
            backgroundColor:
              chartData.data?.datasets?.[0]?.backgroundColor || [],
          },
        ],
      };
    }
  }

  // Helper method to update table data
  private updateTableData(item: DashboardItem, data: any): void {
    const tableData = this.getTableData(item);
    if (Array.isArray(data)) {
      tableData.data = data;
      this.cdr.detectChanges(); // Forces change detection
    }
  }

  // Helper method to update hierarchy data
  private updateHierarchyData(item: DashboardItem, data: any): void {
    const hierarchyData = this.getHierarchyData(item);
    if (data && Array.isArray(data)) {
      hierarchyData.data = data;
    } else if (data) {
      // Handle other data formats as needed
      hierarchyData.data = data;
    }
    this.cdr.detectChanges();
  }

  // Refresh all dashboard data
  refreshDashboard(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Refreshing',
      detail: 'Dashboard data is being updated',
    });
    this.loadAllDashboardData();
  }

  cardClick(cardData: DashboardCardData): void {
    if (cardData.onClick) {
      cardData.onClick();
    } else if (cardData.link) {
      this.router.navigate([cardData.link]);
    }
  }

  onRowSelect(event: any, tableData: DashboardTableData): void {
    if (tableData.onRowSelect) {
      tableData.onRowSelect(event.data);
    }
  }

  getItemColClass(item: DashboardItem): string {
    // Default responsive grid classes based on item type and custom colSpan
    const colSpan = item.colSpan || (item.type === 'table' ? 12 : 6);
    return `col-12 md:col-${colSpan}`;
  }
}
