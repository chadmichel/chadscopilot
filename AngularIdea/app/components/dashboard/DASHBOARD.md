# Dashboard Component

`<pb-dashboard>` is used for creating dashboards with various widgets including charts, cards, and tables.

## Usage

```typescript
@Component({
  selector: 'app-your-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  template: `<pb-dashboard [config]="dashboardConfig"></pb-dashboard>`,
})
export class YourDashboardComponent implements OnInit {
  dashboardConfig: DashboardConfig = {
    header: 'Your Dashboard',
    refreshInterval: 300000, // 5 minutes
    items: [
      {
        type: 'card',
        colSpan: 4,
        data: {
          title: 'Active Users',
          value: '0',
          icon: 'pi pi-users',
          backgroundColor: '#42A5F5',
          color: '#FFFFFF',
        },
        loadItems: () => this.analyticsService.getActiveUsersCount(),
        formatData: (item, data) => data.count || 0,
      },
      {
        type: 'chart',
        colSpan: 8,
        data: {
          title: 'Monthly Revenue',
          type: 'bar',
          height: '300px',
        },
        loadItems: () => this.analyticsService.getMonthlyRevenue(),
      },
      {
        type: 'chart',
        colSpan: 8,
        data: {
          title: 'Revenue vs. Expenses by Client',
          type: 'bubble',
          height: '300px',
        },
        loadItems: () => this.analyticsService.getRevenueExpensesByClient(this.clientId),
      },
      {
        type: 'table',
        colSpan: 12,
        data: {
          title: 'Recent Activities',
          columns: [
            { field: 'user', header: 'User' },
            { field: 'action', header: 'Action' },
            { field: 'timestamp', header: 'Time', format: 'date' },
          ],
          pageSize: 5,
          emptyMessage: 'No recent activities',
        },
        loadItems: (params) => this.activityService.getRecentActivities(params),
      },
    ],
    customToolbarItems: [
      {
        label: 'Refresh',
        icon: 'pi pi-refresh',
        onClick: () => this.refresh(),
      },
    ],
  };

  constructor(
    private analyticsService: AnalyticsService,
    private activityService: ActivityService
  ) {}

  refresh() {
    // Custom refresh implementation
  }
}
```

#### Widget Types

| Type       | Description                  | Properties                                           |
| ---------- | ---------------------------- | ---------------------------------------------------- |
| `card`     | Simple numeric KPI with icon | `title`, `value`, `icon`, `backgroundColor`, `color` |
| `chart`    | Data visualization           | `title`, `type`, `height`, `options`                 |
| `table`    | Tabular data display         | `title`, `columns`, `pagination`, `pageSize`         |
| `hierarchy` | Scrollable list of items     | `title`, `template`, `maxHeight`                     |

## Utility Components

### Breadcrumb Component

`<pb-breadcrumb>` displays hierarchical navigation paths.

```typescript
<pb-breadcrumb [items]="breadcrumbItems"></pb-breadcrumb>
```

### Card Component

`<pb-card>` is a versatile container for displaying content with a header and footer.

```typescript
<pb-card [title]="'Card Title'" [icon]="'pi pi-user'">
  <div>Card content goes here</div>
  <div footer>Footer content here</div>
</pb-card>
```

### DataTable Component

`<pb-data-table>` is a lightweight alternative to ItemList for simple data display without the full CRUD capabilities.

```typescript
<pb-data-table
  [data]="yourData"
  [columns]="columns"
  [paginator]="true"
  [rows]="10">
</pb-data-table>
```

### Chart Component

`<pb-chart>` is a wrapper around PrimeNG Chart component with additional features.

```typescript
<pb-chart
  [type]="'bar'"
  [data]="chartData"
  [options]="chartOptions"
  [height]="'300px'">
</pb-chart>
```

## Example - Client Dashboard

```typescript
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../../../components/dashboard/dashboard.component';
import { HoursService } from '../../../services/hours.service';
import { ClientService } from '../../../services/client.service';
import { ProjectService } from '../../../services/project.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardConfig } from '../../../components/dashboard/dashboard.types';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
import { ClientDashboardBubbleData } from './client-dashboard.interfaces';
import { MenuItem } from 'primeng/api';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  template: `<pb-dashboard
    #dashboard
    [config]="dashboardConfig"
  ></pb-dashboard>`,
})
export class ClientDashboardComponent implements OnInit {
  @Input() clientId: string = '';
  @ViewChild('dashboard') dashboard!: DashboardComponent;

  clientName: string = 'Client';

  dashboardConfig: DashboardConfig = {
    header: 'Client Dashboard',
    subheader: 'Hours Overview',
    refreshInterval: 3600000, // Refresh every hour
    items: [
      // Last Week Hours Card
      {
        type: 'card',
        colSpan: 6,
        data: {
          title: 'Last Week Hours',
          value: '0',
          icon: 'pi pi-clock',
          backgroundColor: '#42A5F5',
          color: '#FFFFFF',
          subtitle: 'Total hours logged',
        },
        loadItems: () => {
          return this.hoursService.getClientWeekHours(this.clientId, 'last');
        },
        formatData: (item, data) => {
          item.subtitle = 'Total hours logged last week';
          return Math.trunc(data.hours) || 0;
        },
      },

      // This Week Hours Card
      {
        type: 'card',
        colSpan: 6,
        data: {
          title: 'This Week Hours',
          value: '0',
          icon: 'pi pi-clock',
          backgroundColor: '#4CAF50',
          color: '#FFFFFF',
          subtitle: 'Hours logged so far',
        },
        loadItems: () => {
          return this.hoursService.getClientWeekHours(this.clientId, 'this');
        },
        formatData: (item, data) => {
          item.subtitle = 'Hours logged this week so far';
          return Math.trunc(data.hours) || 0;
        },
      },

      // Hours by Developer (Donut Chart)
      {
        type: 'chart',
        colSpan: 12,
        data: {
          title: 'Hours by Developer (Last 12 Weeks)',
          type: 'doughnut',
          height: '400px',
          data: {
            labels: [],
            datasets: [],
          },
          options: {
            plugins: {
              legend: {
                position: 'right',
              },
              tooltip: {
                callbacks: {
                  label: (context: any) => {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce(
                      (a: number, b: number) => a + b,
                      0
                    );
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} hours (${percentage}%)`;
                  },
                },
              },
            },
            cutout: '50%',
          },
        },
        loadItems: () => {
          return this.hoursService.getClientHoursByDeveloper(this.clientId);
        },
      },

      // Hours by Week (Bar Chart)
      {
        type: 'chart',
        colSpan: 12,
        data: {
          title: 'Hours by Week (Last 12 Weeks)',
          type: 'bar',
          height: '400px',
          data: {
            labels: [],
            datasets: [],
          },
          options: {
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Hours',
                },
              },
              x: {
                title: {
                  display: true,
                  text: 'Week',
                },
              },
            },
          },
        },
        loadItems: () => {
          return this.hoursService.getClientHoursByWeek(this.clientId);
        },
      },

      // Projects Table
      {
        type: 'table',
        colSpan: 12,
        data: {
          title: 'Client Projects',
          columns: [
            { field: 'name', header: 'Name' },
            { field: 'billableHours', header: 'Billable Hours' },
            { field: 'totalHours', header: 'Total Hours' },
          ],
          showPaginator: true,
          pageSize: 5, // Set default page size to 5
          pageSizeOptions: [5, 10, 25], // Allow user to choose different page sizes
          emptyMessage: 'No projects found for this client', // Custom empty message
          onRowSelect: (row) => {
            this.router.navigate(['/projects', row.id]);
          },
        },
        loadItems: () => {
          return this.projectService.getProjects({
            clientId: this.clientId,
          });
        },
      },

      // Client Forecasted Billable Hours by Month Table
      {
        type: 'chart',
        colSpan: 12,
        data: {
          title: 'Client Forecasted Billable Hours by Month',
          type: 'bar', // Floating bar graph with bubble point example
          height: '300px',
        },
        loadItems: () => {
          const forecast = this.analyticsService.getMonthlyBillableHoursByClientForecast(this.clientId);
          return {
            labels: forecast.map((month) => month.displayName),
            datasets: [
              {
                label: 'Projected Hours',
                type: 'bar',
                backgroundColor: 'rgba(75, 192, 92, 0.5)',
                barThickness: 10,
                borderRadius: 5,
                borderSkipped: false, // Draw all sides of the bar (including bottom)
                order: 2, // controls the order that the datasets are drawn, stacked, and listed in the tooltip and legend
                data: forecast.map((month) => {
                  return [
                    // The lower and upper bounds for the floating bar.
                    // These bounds will use only the first two numbers provided in the array;
                    // additional numbers are not used.
                    // If only one number is provided, the y-axis origin will be used as the lower bound.
                    month.estimatedBillableHoursMinimum,
                    month.estimatedBillableHoursMaximum,
                  ];
                }),
              },
              {
                label: 'Likely Hours',
                type: 'bubble',
                backgroundColor: 'rgba(75, 192, 192, 1.0)',
                borderWidth: 1,
                order: 1,
                data: forecast.map<ClientDashboardBubbleData>((month) => {
                  // Example of mapping to a custom data structure.
                  return {
                    id: month.id,
                    x: month.displayName,
                    y: month.estimatedBillableHoursLikely,
                    r: 5,
                  };
                }),
                parsing: {
                  // When a custom data structure is used,
                  // you must include instructions for how to parse the x and y axes' values.
                  xAxisKey: 'x',
                  yAxisKey: 'y',
                },
              },
            ],
          };
        },
      },
    ],
    customToolbarItems: [
      {
        label: 'Client Details',
        icon: 'pi pi-info-circle',
        onClick: () => {
          this.router.navigate(['/clients', this.clientId]);
        },
      },
    ],
  };

  constructor(
    private hoursService: HoursService,
    private clientService: ClientService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.clientId = params['id'] || this.clientId;
      this.loadClientInfo();
    });
  }

  private loadClientInfo() {
    if (this.clientId) {
      this.clientService.getClient(this.clientId).subscribe({
        next: (client) => {
          this.clientName = client.name;
          this.dashboardConfig.header = `${client.name} Dashboard`;
          this.dashboardConfig.subheader = 'Hours Overview';
          this.updateBreadcrumb();

          // Force refresh if dashboard is initialized
          if (this.dashboard) {
            this.dashboard.loadAllDashboardData();
          }
        },
        error: (err) => {
          console.error('Failed to load client info', err);
          this.dashboardConfig.header = 'Client Dashboard';
          this.dashboardConfig.subheader = 'Client not found';
        },
      });
    }
  }

  private updateBreadcrumb() {
    this.breadcrumbService.setHome({
      icon: 'pi pi-building',
      label: `${this.clientName} Dashboard`,
      routerLink: ['/clients', this.clientId, 'dashboard'],
    } as MenuItem);
  }
}
```

## Example - User Dashboard with Hierarchy

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardComponent } from '../../../components/dashboard/dashboard.component';
import { DashboardConfig } from '../../../components/dashboard/dashboard.types';
import { HoursService } from '../../../services/hours.service';
import { AccountService } from '../../../services/account.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-users-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  template: `<pb-dashboard [config]="dashboardConfig"></pb-dashboard>`,
})
export class UsersDashboardComponent implements OnInit {
  dashboardConfig: DashboardConfig = {
    header: 'Users Dashboard',
    subheader: 'Organization and Performance Overview',
    refreshInterval: 1800000, // Refresh every 30 minutes
    customToolbarItems: [],
    items: [
      // Organization Chart
      {
        type: 'hierarchy',
        colSpan: 12,
        data: {
          title: 'Organization Structure',
          height: '400px',
          selectable: true,
          data: [], // Will be populated when loaded
          onNodeSelect: (node) => this.handleUserSelect(node),
        },
        loadItems: () => this.accountService.getAccountsHierarchy(),
        formatData: (currentData, responseData) => {
          // Transform the data if needed
          return responseData;
        },
      },

      {
        type: 'table',
        colSpan: 12,
        data: {
          title: 'Users',
          columns: [
            { field: 'displayName', header: 'Name' },
            { field: 'team', header: 'Team' },
          ],

          showPaginator: true,
          flattenedData: true,
          pageSize: 8, // Show 8 users by default
          pageSizeOptions: [5, 8, 15, 30], // Page size options
          emptyMessage: 'All users are meeting their billable targets', // Positive empty message
          onRowSelect: (row) => {
            console.log('Row selected:', row);
          },
        },
        loadItems: () =>
          this.accountService.getAccounts({
            take: 100,
            skip: 0,
          }),
        formatData: (currentData, responseData) => {
          // Transform the data if needed
          return responseData;
        },
      },
    ],
  };

  constructor(
    private router: Router,
    private hoursService: HoursService,
    private accountService: AccountService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Any additional initialization if needed
    if (this.authService.isAdmin()) {
      this.dashboardConfig.customToolbarItems?.push({
        label: 'View All Users',
        icon: 'pi pi-users',
        onClick: () => this.router.navigate(['/admin/users']),
      });
    }
  }

  private handleUserSelect(node: any): void {
    if (node && node.data && node.data.id) {
      this.router.navigate(['/admin/users', node.data.id]);
    }
  }

  private loadBillableHoursByUser() {
    // First, get all active users
    return this.hoursService.getBillableUsersBelowTarget().pipe(
      map((users) => {
        const labels = users.map((user) => `${user.displayName}`);
        const data = users.map((user) => user.billableHours);

        return {
          labels: labels,
          datasets: [
            {
              label: 'Billable Hours',
              backgroundColor: '#42A5F5',
              data: data,
            },
          ],
        };
      }),
      catchError((error) => {
        console.error('Error loading billable hours by user:', error);
        return of({
          labels: [],
          datasets: [
            {
              label: 'Billable Hours',
              backgroundColor: '#42A5F5',
              data: [],
            },
          ],
        });
      })
    );
  }

  exportData(): void {
    // Implementation for exporting data
    console.log('Exporting dashboard data...');
    // TODO: Implement export functionality
  }
}
```
