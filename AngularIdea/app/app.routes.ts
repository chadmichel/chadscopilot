import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';

import { authGuard } from './guards/auth.guard';
import { ProfileComponent } from './pages/profile/profile.component';

import { UserListComponent } from './pages/users/user-list/user-list.component';
import { AuthMicrosoftComponent } from './pages/auth/auth-microsoft/auth-microsoft.component';
import { AuthGoogleComponent } from './pages/auth/auth-google/auth-google.component';
import { UserDetailComponent } from './pages/users/user-detail/user-detail.component';
import { UsersTenantListComponent } from './pages/users/users-tenant-list/users-tenant-list.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminTenantListComponent } from './pages/admin/admin-tenant-list/admin-tenant-list.component';
import { AdminUserListComponent } from './pages/admin/admin-user-list/admin-user-list.component';
import { AdminTenantDetailComponent } from './pages/admin/admin-tenant-detail/admin-tenant-detail.component';
import { AdminTenantUsersListComponent } from './pages/admin/admin-tenant-users-list/admin-tenant-users-list.component';
import { AuthCognitoComponent } from './pages/auth/auth-cognito/auth-cognito.component';
import { AuthApiKeyComponent } from './pages/auth/auth-apikey/auth-apikey.component';
import { SignupComponent } from './pages/auth/signup/signup.component';
import { UsersDashboardComponent } from './pages/users/users-dashboard/users-dashboard.component';
import { TokenRefresherComponent } from './pages/token-refresher/token-refresher.component';
import { AdminTenantComponent } from './pages/admin/admin-tenant/admin-tenant.component';
import { FeaturesComponent } from './pages/features/features.component';

// Agent components
import { AgentComponent } from './pages/agent/agent.component';

// WhenIsDone task tracking (planned → first-pass placeholders)
import { BoardListComponent } from './pages/boards/board-list/board-list.component';
import { BoardViewComponent } from './pages/boards/board-view/board-view.component';
import { ProjectListComponent } from './pages/projects/project-list/project-list.component';
import { ProjectDetailComponent } from './pages/projects/project-detail/project-detail.component';
import { TaskDetailComponent } from './pages/tasks/task-detail/task-detail.component';
import { IntegrationsComponent } from './pages/integrations/integrations.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { IntegrationDetailComponent } from './pages/integrations/integration-detail/integration-detail.component';
import { SyncItemsComponent } from './pages/sync-items/sync-items.component';
import { GitHubIntegrationComponent } from './pages/integrations/github-integration/github-integration.component';
import { AzureDevOpsIntegrationComponent } from './pages/integrations/azure-devops-integration/azure-devops-integration.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { MonthViewComponent } from './pages/calendar/month-view/month-view.component';
import { WeekViewComponent } from './pages/calendar/week-view/week-view.component';
import { DayViewComponent } from './pages/calendar/day-view/day-view.component';

export const routes: Routes = [
  // Features page (no authentication required)
  {
    path: 'features',
    component: FeaturesComponent,
    title: 'Features',
    data: {
      title: 'Features',
      icon: 'pi pi-star',
      breadcrumb: [
        {
          label: 'Features',
          routerLink: ['/features'],
          icon: 'pi pi-star',
        },
      ],
    },
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuard],
    title: 'Dashboard',
    data: {
      title: 'Dashboard',
      icon: 'pi pi-home',
      breadcrumb: [
        {
          label: 'Dashboard',
          routerLink: ['/'],
          icon: 'pi pi-home',
        },
      ],
    },
  },
  {
    path: 'home',
    component: HomeComponent,
    data: {
      title: 'Home',
      icon: 'pi pi-home',
      breadcrumb: [
        { label: 'Home', routerLink: ['/home'], icon: 'pi pi-home' },
      ],
    },
    canActivate: [authGuard],
  },

  // Task tracking routes (planned in shared-docs/ROUTES.md)
  {
    path: 'boards',
    component: BoardListComponent,
    canActivate: [authGuard],
    title: 'Boards',
    data: {
      title: 'Boards',
      icon: 'pi pi-th-large',
      breadcrumb: [
        { label: 'Boards', routerLink: ['/boards'], icon: 'pi pi-th-large' },
      ],
    },
  },
  {
    path: 'boards/:boardId',
    component: BoardViewComponent,
    canActivate: [authGuard],
    title: 'Board',
    data: {
      title: 'Board',
      icon: 'pi pi-th-large',
      breadcrumb: [
        { label: 'Boards', routerLink: ['/boards'], icon: 'pi pi-th-large' },
        { label: 'Board', routerLink: ['/boards', ':boardId'], icon: 'pi pi-th-large' },
      ],
    },
  },
  {
    path: 'projects',
    component: ProjectListComponent,
    canActivate: [authGuard],
    title: 'Projects',
    data: {
      title: 'Projects',
      icon: 'pi pi-briefcase',
      breadcrumb: [
        { label: 'Projects', routerLink: ['/projects'], icon: 'pi pi-briefcase' },
      ],
    },
  },
  {
    path: 'projects/:projectId',
    component: ProjectDetailComponent,
    canActivate: [authGuard],
    title: 'Project',
    data: {
      title: 'Project',
      icon: 'pi pi-briefcase',
      breadcrumb: [
        { label: 'Projects', routerLink: ['/projects'], icon: 'pi pi-briefcase' },
        { label: 'Project', routerLink: ['/projects', ':projectId'], icon: 'pi pi-briefcase' },
      ],
    },
  },
  {
    path: 'tasks/:taskId',
    component: TaskDetailComponent,
    canActivate: [authGuard],
    title: 'Task',
    data: {
      title: 'Task',
      icon: 'pi pi-check-square',
      breadcrumb: [
        { label: 'Boards', routerLink: ['/boards'], icon: 'pi pi-th-large' },
        { label: 'Task', routerLink: ['/tasks', ':taskId'], icon: 'pi pi-check-square' },
      ],
    },
  },
  {
    path: 'integrations',
    component: IntegrationsComponent,
    canActivate: [authGuard],
    title: 'Integrations',
    data: {
      title: 'Integrations',
      icon: 'pi pi-sliders-h',
      breadcrumb: [
        { label: 'Integrations', routerLink: ['/integrations'], icon: 'pi pi-sliders-h' },
      ],
    },
  },
  {
    path: 'integrations/github',
    component: GitHubIntegrationComponent,
    canActivate: [authGuard],
    title: 'GitHub Projects',
    data: {
      title: 'GitHub Projects',
      icon: 'pi pi-github',
      breadcrumb: [
        { label: 'Integrations', routerLink: ['/integrations'], icon: 'pi pi-sliders-h' },
        { label: 'GitHub Projects', routerLink: ['/integrations/github'], icon: 'pi pi-github' },
      ],
    },
  },
  {
    path: 'integrations/azuredevops',
    component: AzureDevOpsIntegrationComponent,
    canActivate: [authGuard],
    title: 'Azure DevOps',
    data: {
      title: 'Azure DevOps',
      icon: 'pi pi-microsoft',
      breadcrumb: [
        { label: 'Integrations', routerLink: ['/integrations'], icon: 'pi pi-sliders-h' },
        { label: 'Azure DevOps', routerLink: ['/integrations/azuredevops'], icon: 'pi pi-microsoft' },
      ],
    },
  },
  {
    path: 'syncitems',
    component: SyncItemsComponent,
    canActivate: [authGuard],
    title: 'Sync Items',
    data: {
      title: 'Sync Items',
      icon: 'pi pi-cloud-upload',
      breadcrumb: [
        { label: 'Integrations', routerLink: ['/integrations'], icon: 'pi pi-sliders-h' },
        { label: 'Sync Items', routerLink: ['/syncitems'], icon: 'pi pi-cloud-upload' },
      ],
    },
  },
  {
    path: 'integrations/:id',
    component: IntegrationDetailComponent,
    canActivate: [authGuard],
    title: 'Integration',
    data: {
      title: 'Integration',
      icon: 'pi pi-sliders-h',
      breadcrumb: [
        { label: 'Integrations', routerLink: ['/integrations'], icon: 'pi pi-sliders-h' },
        { label: 'Integration', routerLink: ['/integrations', ':id'], icon: 'pi pi-sliders-h' },
      ],
    },
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [authGuard],
    title: 'Settings',
    data: {
      title: 'Settings',
      icon: 'pi pi-cog',
      breadcrumb: [
        { label: 'Settings', routerLink: ['/settings'], icon: 'pi pi-cog' },
      ],
    },
  },

  { path: 'auth', component: AuthComponent },
  {
    path: 'signup',
    component: SignupComponent,
    title: 'Sign Up',
    data: {
      title: 'Sign Up',
      icon: 'pi pi-user-plus',
    },
  },
  {
    path: 'profile',
    component: ProfileComponent,
    title: 'Profile',
    data: {
      title: 'Profile',
      icon: 'pi pi-user',
      breadcrumb: [{ label: 'Profile', icon: 'pi pi-user' }],
    },
    canActivate: [authGuard],
  },

  {
    path: 'authmicrosoft',
    component: AuthMicrosoftComponent,
  },
  {
    path: 'authgoogle',
    component: AuthGoogleComponent,
  },
  {
    path: 'authcognito',
    component: AuthCognitoComponent,
  },
  {
    path: 'authapikey',
    component: AuthApiKeyComponent,
    title: 'API Key Sign In',
  },
  {
    path: 'users',
    component: UserListComponent,
    data: {
      title: 'Users',
      icon: 'pi pi-users',
      breadcrumb: [
        { label: 'Users', routerLink: ['/users'], icon: 'pi pi-users' },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'users/:id',
    component: UserDetailComponent,
    data: {
      title: 'User',
      icon: 'pi pi-user',
      canReplace: true,
      breadcrumb: [
        { label: 'Users', routerLink: ['/users'], icon: 'pi pi-users' },
        { label: 'User', routerLink: ['/users', ':id'], icon: 'pi pi-user' },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'users/:id/tenants',
    component: UsersTenantListComponent,
    data: {
      breadcrumb: [
        { label: 'Users', routerLink: ['/users'], icon: 'pi pi-users' },
        { label: 'User', routerLink: ['/users', ':id'], icon: 'pi pi-user' },
        {
          label: 'Tenants',
          routerLink: ['/users', ':id', 'tenants'],
          icon: 'pi pi-sitemap',
        },
      ],
    },
    canActivate: [authGuard],
  },

  {
    path: 'users/:userId/dashboard',
    component: HomeComponent,
    data: {
      title: 'Dashboard',
      icon: 'pi pi-user',
      breadcrumb: [
        { label: 'Home', icon: 'pi pi-home' },
        { label: 'User', icon: 'pi pi-user' },
        { label: 'Dashboard', icon: 'pi pi-chart-bar' },
      ],
    },
    canActivate: [authGuard],
  },

  {
    path: 'admin',
    component: AdminComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'admin/tenants',
    component: AdminTenantListComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Tenants',
          routerLink: ['/admin/tenants'],
          icon: 'pi pi-building',
        },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'usersdashboard',
    component: UsersDashboardComponent,
    data: {
      title: 'Users Dashboard',
      icon: 'pi pi-chart-bar',
      breadcrumb: [
        {
          label: 'Users',
          routerLink: ['/usersdashboard'],
          icon: 'pi pi-users',
        },
        {
          label: 'Users Dashboard',
          routerLink: ['/usersdashboard'],
          icon: 'pi pi-chart-bar',
        },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'admin/users',
    component: AdminUserListComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Users',
          routerLink: ['/admin/users'],
          icon: 'pi pi-users',
        },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'admin/users/:id',
    component: UserDetailComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Users',
          routerLink: ['/admin/users'],
          icon: 'pi pi-users',
        },
        {
          label: 'User',
          routerLink: ['/admin/users', ':id'],
          icon: 'pi pi-user',
        },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'admin/users/:id/tenants',
    component: UsersTenantListComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Users',
          routerLink: ['/admin/users'],
          icon: 'pi pi-users',
        },
        {
          label: 'User',
          routerLink: ['/admin/users', ':id'],
          icon: 'pi pi-user',
        },
        {
          label: 'Tenants',
          routerLink: ['/admin/users', ':id', 'tenants'],
          icon: 'pi pi-sitemap',
        },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'admin/users/:userId/dashboard',
    component: HomeComponent,
    data: {
      title: 'Dashboard',
      icon: 'pi pi-user',
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Users',
          routerLink: ['/admin/users'],
          icon: 'pi pi-users',
        },
        {
          label: 'User',
          routerLink: ['/admin/users', ':id'],
          icon: 'pi pi-user',
        },
        {
          label: 'Dashboard',
          icon: 'pi pi-chart-bar',
          routerLink: ['/admin/users', ':id', 'dashboard'],
        },
      ],
    },
    canActivate: [authGuard],
  },

  {
    path: 'admin/tenants/:id',
    component: AdminTenantDetailComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Tenants',
          routerLink: ['/admin/tenants'],
          icon: 'pi pi-building',
        },
        {
          label: 'Tenant',
          routerLink: ['/admin/tenants', ':id'],
          icon: 'pi pi-building',
          canReplace: true,
        },
      ],
    },
    canActivate: [authGuard],
  },
  {
    path: 'admin/tenants/:id/users',
    component: AdminTenantUsersListComponent,
    data: {
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Tenants',
          routerLink: ['/admin/tenants'],
          icon: 'pi pi-building',
        },
        {
          label: 'Tenant',
          routerLink: ['/admin/tenants', ':id'],
          icon: 'pi pi-building',
        },
        {
          label: 'Users',
          routerLink: ['/admin/tenants', ':id', 'users'],
          icon: 'pi pi-users',
        },
      ],
    },
    canActivate: [authGuard],
  },

  {
    path: 'token-refresher',
    component: TokenRefresherComponent,
    canActivate: [authGuard],
    title: 'Token Refresher',
    data: {
      title: 'Token Refresher',
      icon: 'pi pi-refresh',
      breadcrumb: [
        {
          label: 'Token Refresher',
          routerLink: ['/token-refresher'],
          icon: 'pi pi-refresh',
        },
      ],
    },
  },

  {
    path: 'admin/tenant',
    component: AdminTenantComponent,
    canActivate: [authGuard],
    title: 'Current Tenant',
    data: {
      title: 'Current Tenant',
      icon: 'pi pi-building',
      breadcrumb: [
        { label: 'Admin', routerLink: ['/admin'], icon: 'pi pi-cog' },
        {
          label: 'Current Tenant',
          routerLink: ['/admin/tenant'],
          icon: 'pi pi-building',
        },
      ],
    },
  },

  {
    path: 'calendar',
    component: CalendarComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '', redirectTo: 'month', pathMatch: 'full'
      },
      {
        path: 'month',
        component: MonthViewComponent,
        data: {
          breadcrumb: [
            { label: 'Calendar', routerLink: ['/calendar'], icon: 'pi pi-calendar' },
            { label: 'Month', routerLink: ['/calendar/month'], icon: 'pi pi-calendar-plus' }
          ]
        }
      },
      {
        path: 'month/:yearMonth',
        component: MonthViewComponent,
        data: {
          breadcrumb: [
            { label: 'Calendar', routerLink: ['/calendar'], icon: 'pi pi-calendar' },
            { label: 'Month', routerLink: ['/calendar/month', ':yearMonth'] }
          ]
        }
      },
      {
        path: 'week',
        component: WeekViewComponent,
        data: {
          breadcrumb: [
            { label: 'Calendar', routerLink: ['/calendar'], icon: 'pi pi-calendar' },
            { label: 'Week', routerLink: ['/calendar/week'], icon: 'pi pi-bars' }
          ]
        }
      },
      {
        path: 'week/:yearWeek',
        component: WeekViewComponent,
        data: {
          breadcrumb: [
            { label: 'Calendar', routerLink: ['/calendar'], icon: 'pi pi-calendar' },
            { label: 'Week', routerLink: ['/calendar/week', ':yearWeek'] }
          ]
        }
      },
      {
        path: 'day/:yearMonthDay',
        component: DayViewComponent,
        data: {
          breadcrumb: [
            { label: 'Calendar', routerLink: ['/calendar'], icon: 'pi pi-calendar' },
            { label: 'Day', routerLink: ['/calendar/day', ':yearMonthDay'] }
          ]
        }
      },
    ],
    data: {
      title: 'Calendar',
      icon: 'pi pi-calendar',
      breadcrumb: [
        { label: 'Calendar', routerLink: ['/calendar'], icon: 'pi pi-calendar' },
      ],
    },
  },

  // Agent routes
  {
    path: 'agent',
    component: AgentComponent,
    canActivate: [authGuard],
    title: 'Agent',
    data: {
      title: 'Agent',
      icon: 'pi pi-comments',
      breadcrumb: [
        {
          label: 'Agent',
          routerLink: ['/agent'],
          icon: 'pi pi-comments',
        },
      ],
    },
  },
  {
    path: 'agent/:id',
    component: AgentComponent,
    canActivate: [authGuard],
    title: 'Agent',
    data: {
      title: 'Agent',
      icon: 'pi pi-comments',
      breadcrumb: [
        {
          label: 'Agent',
          routerLink: ['/agent'],
          icon: 'pi pi-comments',
        },
      ],
    },
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
