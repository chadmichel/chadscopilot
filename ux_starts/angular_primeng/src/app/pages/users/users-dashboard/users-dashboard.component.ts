import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardComponent } from '../../../components/dashboard/dashboard.component';
import { DashboardConfig } from '../../../components/dashboard/dashboard.types';
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
    refreshInterval: 1800000, // Refresh every 30 minutes
    customToolbarItems: [],
    items: [
      // Organization Chart
      {
        type: 'hierarchy',
        colSpan: 12,
        data: {
          title: 'Organization Structure',
          subTitle: 'Last week hours affects color',
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
    private accountService: AccountService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Any additional initialization if needed
    if (this.authService.isAdmin()) {
      this.dashboardConfig.customToolbarItems?.push(
        {
          label: 'Workplace Attendance',
          icon: 'pi pi-briefcase',
          onClick: () => this.router.navigate(['/attendance']),
        },
        {
          label: 'Transportation (JARC)',
          icon: 'pi pi-truck',
          onClick: () => this.router.navigate(['/transportation']),
        }
      );
    }
  }

  private handleUserSelect(node: any): void {
    if (node && node.data && node.data.id) {
      this.router.navigate(['/admin/users', node.data.id]);
    }
  }

  exportData(): void {
    // Implementation for exporting data
    console.log('Exporting dashboard data...');
    // TODO: Implement export functionality
  }
}
