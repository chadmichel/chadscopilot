# AI CODE GENERATION INSTRUCTIONS

## Table of Contents

- [Introduction](#introduction)
- [Application Structure](#application-structure)
- [A Note on ID](#a-note-on-id)
- [Common DTOs](#common-dtos)
- [Page Paradigm](#page-paradigm)
  - [List Pages](#list-pages)
  - [Detail/Edit Pages](#detailedit-pages)
  - [Dashboard Pages](#dashboard-pages)
- [Common Imported Components](#common-imported-components)
- [Common Components](#common-components)
- [DTO Generation](#dto-generation)
- [Service Generation](#service-generation)
- [File Locations](#file-locations)
- [Production Deployment](#production-deployment)
  - [Building for Production](#building-for-production)
  - [Deployment](#deployment)
  - [Environment Configuration](#environment-configuration)
  - [Server Configuration](#server-configuration)
- [Client Components](#client-components)
  - [Client Components Overview](#client-components-overview)
  - [ClientListComponent](#clientlistcomponent)
  - [ClientDetailComponent](#clientdetailcomponent)
  - [ClientsDashboardComponent](#clientsdashboardcomponent)
  - [ClientDashboardComponent](#clientdashboardcomponent)
  - [Client DTO](#client-dto)
- [Route Examples](#route-examples)
  - [List Style Route](#list-style-route)
  - [Detail Style Route](#detail-style-route)
- [Automated Test Generation](#automated-test-generation)
  - [Technology Stack](#technology-stack)
  - [Service Tests](#service-tests)

## Introduction

THIS IS AN ANGULAR FRONTEND APPLICATION. DO NOT GENERATE BACKEND CODE.

## Application Structure

The application is structured as follows:

src/app/components: Contains reusable components
src/app/dto: Contains data transfer objects (DTOs)
src/app/pages: Contains page components
src/app/services: Contains service classes for API calls
src/app/services-mock: Contains mock services for testing

## A Note on ID

In general the dtos coming from the backend will NOT have an id. The id is on the list not on the dto itself.

As an example the user dto will not have an id. The id is on the list.

```typescript
export interface UserDto {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
```

A list call will return a QueryResult<UserDto> which will have an id.

```typescript
export interface QueryResult<T> {
  items: T[];
  totalCount: number;
}
```

As an example the user list will return a QueryResult<UserDto> which will have an id.

```typescript
const result: QueryResult<UserDto> = {
  items: [
    {
      id: mockUserId,
      item: mockUser,
    },
  ],
  total: 1,
  skip: 0,
  take: 10,
};
```

## Common DTOs

These are located in app/components/query.dto.ts. These are almost always used in the services and components.

```typescript
export interface QueryResultItem<T> {
  item: T;
  id: string;
}

export interface QueryResult<T> {
  items: QueryResultItem<T>[];
  total: number;
  take: number;
  skip: number;
}

export interface QueryOptions {
  id?: string;
  isNew?: boolean;
  take?: number;
  skip?: number;
  tenantId?: string;
  userId?: string;
  all?: boolean;
  excludeMine?: boolean;
  filter?: string;
  directReports?: boolean;
  clientId?: string;
  projectId?: string;
  lookupList?: boolean;
  week?: string;
}
```

## Page Paradigm

Most pages are based on the following paradigm:

- List (list.component.ts)
- Detail/Edit (detail.component.ts)
- Dashboard (dashboard.component.ts)

### List Pages

The list page is a table that displays a list of items. It uses the `TableModule` from PrimeNG. This table should do pagination using skip and take.

#### Using the ItemList Component

To create a list page using the ItemList component:

1. Create a new component in the pages directory
2. Import and use the ItemListComponent in your template
   - import { ItemListComponent } from '../../components/item-list/item-list.component';
   - import { ItemListConfig } from '../../components/item-list/item-list.types';
3. Configure the ItemListConfig object to match your requirements
4. When building out the columns in the columns section only use the following properties
   - field: The property name in the data object
   - header: The column header text
   - type: The data type (text, date, number, etc.)
   - sortable: Whether the column is sortable

Example:

```typescript
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class UserListComponent {
  listConfig: ItemListConfig = {
    header: 'Users', // Title that appears at the top
    supportsAdd: true, // Shows "Add" button
    supportsEdit: true, // Enables edit functionality
    supportsDelete: true, // Shows delete button/functionality
    defaultSortField: 'username', // Initial sort field
    columns: [
      {
        field: 'username', // Property name in data object
        header: 'Username', // Column header text
        type: 'text', // Data type (text, date, number, etc.)
        sortable: true, // Enable column sorting
      },
      // Additional columns...
    ],
    dataService: {
      // Configure data loading and operations
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        where: { tenantId: this.authService.getCurrentTenant()?.id },
      }),
      loadItems: (params) => this.someService.getItems(params),
      deleteItem: (params, item) => this.someService.deleteItem(item.id),
    },
  };

  constructor(
    private someService: SomeService,
    private authService: AuthService
  ) {}
}
```

The ItemListConfig interface provides numerous options for customization:

- Custom filtering
- Selection modes
- Pagination controls
- Custom actions
- Row styling
- Export functionality

### Detail/Edit Pages

The detail page is a form that displays a single item. It uses the `FormModule` from PrimeNG. This form should be used for details, create and edit.

#### Using the ItemDetail Component

To create a detail/edit page using the ItemDetail component:

1. Create a new component in the pages directory
2. Import and use the ItemDetailComponent in your template
   - import { ItemDetailComponent } from '../../components/item/detail/item-detail.component';
   - import { ItemDetailConfig } from '../../components/item/detail/item-detail.types';
3. Configure the ItemDetailConfig object to define your form fields and behavior
4. When building out the fields in the formLayout section only use the following properties
   - key: The key of the field in the dto
   - label: The label of the field
   - type: The type of the field (text, textarea, number, date, select, checkbox, radio, password, file, custom)
   - required: Whether the field is required
   - options: The options for the select field

Example:

```typescript
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class UserDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'User Details', // Page title
    isEditable: true, // Whether form can be edited
    supportsAdd: false, // Allow creating new items
    supportsDelete: true, // Show delete button
    updateSuccessMessage: 'User updated successfully',
    breadcrumbField: 'username', // Field to use in breadcrumbs

    // Define form fields and their properties
    formLayout: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        newOnly: true, // Only show when creating new items
      },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },
      {
        key: 'role',
        label: 'Role',
        type: 'select', // Dropdown select field
        required: true,
        options: [
          // Options for select field
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
      },
    ],

    // Custom toolbar actions
    customToolbarItems: [
      {
        label: 'Reset Password',
        icon: 'pi pi-lock',
        onClick: () => this.resetPassword(),
      },
      {
        label: 'Tenants',
        icon: 'pi pi-sitemap',
        onClick: () => this.showTenants(),
      },
    ],

    // Configure data loading and saving operations
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        where: { tenantId: this.authService.getCurrentTenant()?.id },
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) => this.userService.getUser(params.id || ''),
      createItem: (params, item) => this.userService.createUser(item),
      updateItem: (params, item) =>
        this.userService.updateUser(params.id || '', item),
      deleteItem: (params) => this.userService.deleteUser(params.id || ''),
    },
  };

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  resetPassword() {
    // Custom action implementation
  }

  showTenants() {
    // Navigate to related view
    this.router.navigate(['tenants'], { relativeTo: this.route });
  }
}
```

The ItemDetailConfig supports various field types:

- text - Standard text input
- textarea - Multi-line text input
- number - Numeric input
- date - Date picker
- select - Dropdown selection
- checkbox - Boolean toggle
- radio - Radio button selection
- password - Masked password input
- file - File upload
- custom - For custom field rendering

### Dashboard Pages

Dashboards display visualizations, KPIs, and important information in a grid layout.

#### Using the Dashboard Component

To create a dashboard using the Dashboard component:

1. Create a new component in the pages directory
2. Import and use the DashboardComponent in your template
3. Configure the DashboardConfig object with your widgets and layout

Example:

```typescript
@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  template: `<pb-dashboard [config]="dashboardConfig"></pb-dashboard>`,
})
export class AnalyticsDashboardComponent implements OnInit {
  dashboardConfig: DashboardConfig = {
    header: 'Analytics Dashboard',
    refreshInterval: 300000, // Auto-refresh every 5 minutes (in ms)
    widgets: [
      {
        id: 'users-widget',
        title: 'Active Users',
        type: 'counter',
        size: 'small',
        position: { x: 0, y: 0, cols: 1, rows: 1 },
        dataSource: {
          load: () => this.analyticsService.getActiveUsers(),
        },
        settings: {
          icon: 'pi pi-users',
          color: '#4CAF50',
        },
      },
      {
        id: 'revenue-chart',
        title: 'Monthly Revenue',
        type: 'chart',
        size: 'medium',
        position: { x: 1, y: 0, cols: 2, rows: 2 },
        dataSource: {
          load: () => this.analyticsService.getRevenueData(),
        },
        settings: {
          chartType: 'bar',
          xAxis: 'month',
          yAxis: 'amount',
          colors: ['#2196F3', '#FF5722'],
        },
      },
      {
        id: 'recent-orders',
        title: 'Recent Orders',
        type: 'table',
        size: 'large',
        position: { x: 0, y: 2, cols: 3, rows: 2 },
        dataSource: {
          load: (params) => this.orderService.getRecentOrders(params),
        },
        settings: {
          columns: [
            { field: 'id', header: 'Order ID' },
            { field: 'customer', header: 'Customer' },
            { field: 'amount', header: 'Amount', format: 'currency' },
            { field: 'status', header: 'Status' },
          ],
          pagination: true,
          pageSize: 5,
        },
      },
    ],
    // Optional actions in dashboard header
    actions: [
      {
        label: 'Export',
        icon: 'pi pi-download',
        onClick: () => this.exportDashboard(),
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        onClick: () => this.showSettings(),
      },
    ],
  };

  constructor(
    private analyticsService: AnalyticsService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    // Any initialization logic
  }

  exportDashboard() {
    // Handle export functionality
  }

  showSettings() {
    // Display dashboard settings dialog
  }
}
```

The DashboardConfig supports multiple widget types:

- counter - Simple numeric KPI with icon
- chart - Data visualization (bar, line, pie, etc.)
- table - Tabular data display
- list - Scrollable list of items
- heatmap - Color-coded data visualization
- card - Information card with customizable content
- custom - For custom widget implementations

Widgets can be resizable and repositionable, giving users the ability to customize their dashboard experience. Each widget has its own data source configuration for loading and refreshing data independently.

## Common Imported Components

The application uses the following common imports:

```
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    ToolbarModule,
  ],
```

## Base Components

As a goal we should always be reusing base components. Each page should just be a configuration of base components.

Do not create new modules. All components should be standalone.

Base components

- ItemList (Table) src/app/components/item-list/item-list-component.ts
- ItemDetail (Form) src/app/components/item/detail/item-detail-component.ts
- Dashboard (Dashboard) src/app/components/dashboard/dashboard-component.ts

List pages should be generated like the user list page. List pages should use the item-list component. Look at the user list page for an example.

```typescript
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class UserListComponent {
  listConfig: ItemListConfig = {
    header: 'Users',
    supportsAdd: true,
    supportsEdit: true,
    supportsDelete: true,
    defaultSortField: 'username',
    columns: [
      {
        field: 'username',
        header: 'Username',
        type: 'text',
        sortable: true,
      },
      { field: 'email', header: 'Email', type: 'text', sortable: true },

      {
        field: 'createdAt',
        header: 'Created',
        type: 'date',
        format: 'short',
        sortable: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        where: { tenantId: this.authService.getCurrentTenant()?.id },
      }),
      loadItems: (params) => this.accountService.getAccounts(params),
      deleteItem: (params, item) => this.accountService.deleteAccount(item.id),
    },
  };

  constructor(
    private accountService: AccountService,
    private authService: AuthService
  ) {}
}
```

Detail pages should be generated like the user detail page. Detail pages should use the item-detail component. Look at the user detail page for an example.

```tyepscript
@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class UserDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'User Details',
    isEditable: true,
    supportsAdd: false,
    supportsDelete: true,
    updateSuccessMessage: 'User updated successfully',
    breadcrumbField: 'username',
    formLayout: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        newOnly: true,
      },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
      },
    ],
    customToolbarItems: [
      {
        label: 'Reset Password',
        icon: 'pi pi-lock',
        onClick: () => this.resetPassword(),
      },
      {
        label: 'Tenants',
        icon: 'pi pi-sitemap',
        onClick: () => this.showTenants(),
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        where: { tenantId: this.authService.getCurrentTenant()?.id },
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) => this.accountService.getAccount(params.id || ''),
      createItem: (params, item) => this.accountService.createAccount(item),
      updateItem: (params, item) =>
        this.accountService.updateAccount(params.id || '', item),
      deleteItem: (params) =>
        this.accountService.deleteAccount(params.id || ''),
    },
  };

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit() {

    this.route.snapshot.data['label'] = 'goodbye';
  }

  resetPassword() {
  }

  showTenants() {
    this.router.navigate(['tenants'], { relativeTo: this.route });
  }
}
```

Add custom actions. All custom actions should be put in the customToolbarItems array. The customToolbarItems array should be an array of objects with the following properties: label, icon, and onClick.

```
customToolbarItems: [
  {
    label: 'Reset Password',
    icon: 'pi pi-lock',
    onClick: () => this.resetPassword(),
  },
  {
    label: 'Tenants',
    icon: 'pi pi-sitemap',
    onClick: () => this.showTenants(),
  },
],
```

## DTO Generation

All DTOs should be in the DTO folder (src/app/dto). All services should be in the services folder. All components should be in the components folder. All pages should be in the pages folder.

Services should use a DTO for the request and response. They query DTO should always use the QueryOptions DTO that already exists.

QueryOptions DTO already exists and should not be modied.

```
export interface QueryOptions {
  id?: string;
  isNew?: boolean;
  take?: number;
  skip?: number;
  where?: Record<string, any>;
  order?: Record<string, any>;
  tenantId?: string;
  userId?: string;
  all?: boolean;
  excludeMine?: boolean;
  filter?: string;
}
```

DTOs should look like below

```typescript
export interface UserDto {
  id: string;
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Service Generation

Services should be generated in the services folder. Services should be generated like the following pattern

Create, Update, and Delete should return an Observable<ProcessResult>. ProcessResult should have a message and a success property. ProcessResult should already exists in query.dto.ts.

```
@Injectable({
  providedIn: 'root',
})
export class AccountService {
  constructor(private backend: BackendService, private http: HttpClient) {}

  updateAccount(id: string, user: UserDto): Observable<ProcessResult> {
    return this.backend.put<ProcessResult>(`account/${id}`, user);
  }

  createAccount(user: UserDto): Observable<ProcessResult> {
    user.createdAt = undefined;
    user.updatedAt = undefined;
    return this.backend.post<ProcessResult>('account', user);
  }

  deleteAccount(id: string): Observable<ProcessResult> {
    return this.backend.delete<ProcessResult>(`account/${id}`);
  }

  getAccounts(queryParams: QueryOptions): Observable<QueryResult<UserDto>> {
    return this.backend.getQuery<UserDto>('account', queryParams);
  }

  addUserToTenant(tenantId: string, userId: string): Observable<any> {
    return this.backend.post(`account/tenant/add-user`, { tenantId, userId });
  }
}
```

Servie names on the back end tend to be singular. As in the example below. Do not use plural names for services. Use singular names.

```typescript
export class ProjectService {
  constructor(private backend: BackendService, private http: HttpClient) {}

  getProjects(queryParams: QueryOptions): Observable<QueryResult<ProjectDto>> {
    return this.backend.getQuery<ProjectDto>('project', queryParams);
  }

  getProject(id: string): Observable<ProjectDto> {
    return this.backend.get<ProjectDto>(`project/${id}`);
  }

  createProject(project: ProjectDto): Observable<ProcessResult> {
    project.createdAt = undefined;
    project.updatedAt = undefined;
    return this.backend.post<ProcessResult>('project', project);
  }

  updateProject(id: string, project: ProjectDto): Observable<ProcessResult> {
    return this.backend.put<ProcessResult>(`project/${id}`, project);
  }

  deleteProject(id: string): Observable<ProcessResult> {
    return this.backend.delete<ProcessResult>(`project/${id}`);
  }
}
```

When generating services generate a mock service at the same time. Mock services should go in the services-mock folder. Mock services should be named the same as the service but with a Mock prefix as an example AccountService should become MockAccountService.

When generating mock services you need to configure them to get used correctly in app.config. Below is how you would configure the MockAccountService.

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    BrowserAnimationsModule,
    provideHttpClient(),
    // Conditionally provide mock or non-mock services
    {
      provide: AccountService,
      useClass: environment.mock ? MockAccountService : AccountService,
    },
  ],
};
```

## File Locations

- DTOs: src/app/dto
- Services: src/app/services
- Components: src/app/components (only use for base components)
- Pages: src/app/pages
- Guards: src/app/guards
- src/app/app.routes.ts (all routes should be defined here)

## Production Deployment

### Building for Production

To build the application for production, run:

```bash
npm run build:prod
```

This will create an optimized production build in the `dist/` directory.

### Deployment

To deploy the application to the production environment, run:

```bash
npm run deploy:prod
```

This script:

1. Creates a production build
2. Backs up the existing deployment (if any)
3. Copies the new build to the deployment directory

### Environment Configuration

The application uses different environment configurations:

- `environment.ts` - Development environment (local development)
- `environment.prod.ts` - Production environment

Additionally, some configuration can be modified at runtime without rebuilding by editing:

```
/assets/config.json
```

### Server Configuration

For production deployments, configure your web server (Apache/Nginx) to:

1. Serve the static files from the deployment directory
2. Redirect all routes to `index.html` for the Angular router
3. Configure appropriate cache headers for static assets

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name panicblaster.example.com;
    root /var/www/panicblaster;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    location /api/ {
        proxy_pass http://backend-server:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

# Client Components

This section provides detailed instructions for working with the client components in the application:

## Client Components Overview

The application includes four main client-related components:

- **ClientListComponent**: List view of all clients with sortable columns
- **ClientDetailComponent**: Form for viewing and editing client details
- **ClientsDashboardComponent**: Organization-level dashboard showing metrics across all clients
- **ClientDashboardComponent**: Client-specific dashboard showing performance metrics and hours

## ClientListComponent

The `ClientListComponent` displays a paginated list of clients with sortable columns and search functionality.

### Features

- Sortable columns (Name, Description, External ID, Created Date)
- Search functionality
- Navigation to client dashboard
- Edit functionality

### Example Implementation

```typescript
@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class ClientListComponent {
  listConfig: ItemListConfig = {
    header: 'Clients',
    supportsAdd: false,
    supportsEdit: true,
    supportsDelete: false,
    defaultSortField: 'name',
    enableSearch: true,
    customToolbarItems: [
      {
        label: 'Dashboard',
        icon: 'pi pi-chart-line',
        onClick: () => {
          this.router.navigate(['/clientsdashboard']);
        },
      },
    ],
    columns: [
      {
        field: 'name',
        header: 'Name',
        type: 'text',
        sortable: true,
      },
      {
        field: 'description',
        header: 'Description',
        type: 'text',
        sortable: true,
        mobileHide: true, // Hides column on mobile devices
      },
      {
        field: 'externalId',
        header: 'External ID',
        type: 'text',
        sortable: true,
        mobileHide: true,
      },
      {
        field: 'createdAt',
        header: 'Created',
        type: 'date',
        format: 'short',
        sortable: true,
        mobileHide: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
      }),
      loadItems: (params) => this.clientService.getClients(params),
      deleteItem: (params, item) => this.clientService.deleteClient(item.id),
    },
    onEdit: (item) => {
      this.router.navigate(['/', 'clients', item.id, 'dashboard']);
    },
  };

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private router: Router
  ) {}
}
```

### Configuration Options

| Option             | Description                                         |
| ------------------ | --------------------------------------------------- |
| `header`           | Title displayed at the top of the client list       |
| `supportsAdd`      | Whether to show the Add button (false in this case) |
| `supportsEdit`     | Whether to enable edit functionality (true)         |
| `supportsDelete`   | Whether to show the Delete button (false)           |
| `defaultSortField` | The default field to sort by ('name')               |
| `enableSearch`     | Whether to show the search input (true)             |

## ClientDetailComponent

The `ClientDetailComponent` provides a form for viewing and editing client details, with metrics display.

### Features

- Form for editing client information
- Metrics display for profitability, happiness, and revenue indices
- Navigation to client dashboard

### Example Implementation

```typescript
@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class ClientDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'Client Details',
    isEditable: true,
    supportsAdd: false,
    supportsDelete: false,
    updateSuccessMessage: 'Client updated successfully',
    breadcrumbField: 'name',
    // Display key metrics at the top of the form
    metrics: [
      {
        label: 'Profit Index',
        field: 'profitIndex',
        icon: 'pi pi-dollar',
      },
      {
        label: 'Happy Index',
        field: 'happyIndex',
        icon: 'pi pi-face-smile',
      },
      {
        label: 'Revenue Index',
        field: 'revenueIndex',
        icon: 'pi pi-money-bill',
      },
    ],
    formLayout: [
      { key: 'name', label: 'Name', type: 'text' },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
      },
      {
        key: 'notes',
        label: 'Notes',
        type: 'text',
      },
      {
        key: 'internalNps',
        label: 'Internal NPS',
        type: 'number',
      },
      {
        key: 'externalNps',
        label: 'External NPS',
        type: 'number',
      },
    ],
    customToolbarItems: [
      {
        label: 'View Dashboard',
        icon: 'pi pi-chart-bar',
        onClick: () => this.viewDashboard(),
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) => this.clientService.getClient(params.id || ''),
      createItem: (params, item) => {
        item.tenantId = this.authService.getCurrentTenant()?.id;
        return this.clientService.createClient(item);
      },
      updateItem: (params, item) =>
        this.clientService.updateClient(params.id || '', item),
      deleteItem: (params) => this.clientService.deleteClient(params.id || ''),
    },
  };

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  viewDashboard() {
    const clientId = this.route.snapshot.params['id'];
    if (clientId && clientId !== 'new') {
      this.router.navigate(['dashboard'], { relativeTo: this.route });
    }
  }
}
```

### Form Fields

| Field         | Type   | Description                                                          |
| ------------- | ------ | -------------------------------------------------------------------- |
| `name`        | text   | Client name                                                          |
| `description` | text   | Client description                                                   |
| `notes`       | text   | Additional notes about the client                                    |
| `internalNps` | number | Internal Net Promoter Score - used to calculate happiness index      |
| `externalNps` | number | External Net Promoter Score - used to calculate satisfaction metrics |

### Metrics Display

The component shows three key metrics at the top of the form:

- **Profit Index**: Indicator of client profitability
- **Happy Index**: Indicator of client satisfaction
- **Revenue Index**: Indicator of revenue generation

## ClientsDashboardComponent

The `ClientsDashboardComponent` provides an overview of all clients with visualizations and metrics.

### Features

- Bubble chart showing client profitability vs satisfaction
- KPI cards for total clients and average satisfaction
- Table with client performance metrics
- Auto-refresh functionality

### Example Implementation

```typescript
@Component({
  selector: 'app-clients-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  template: `<pb-dashboard [config]="dashboardConfig"></pb-dashboard>`,
})
export class ClientsDashboardComponent implements OnInit {
  dashboardConfig: any = {
    header: 'Clients Dashboard',
    refreshInterval: 300000, // Auto-refresh every 5 minutes
    items: [
      // Bubble chart showing profitability vs satisfaction
      {
        id: 'client-bubble-chart',
        title: 'Client Profitability vs Satisfaction',
        type: 'chart',
        colSpan: 12,
        data: {
          height: '500px',
          type: 'bubble',
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Profitability Index',
                },
              },
              y: {
                title: {
                  display: true,
                  text: 'Happiness Index',
                },
              },
            },
          },
        },
        loadItems: () => {
          return this.loadClientBubbleChartData();
        },
        formatData: (item: any, data: any) => {
          item.data = data;
        },
      },
      // Total clients KPI card
      {
        type: 'card',
        colSpan: 6,
        data: {
          title: 'Total Clients',
          value: '0',
          icon: 'pi pi-clock',
          backgroundColor: '#42A5F5',
          color: '#FFFFFF',
        },
        loadItems: () => {
          return this.loadClientCount();
        },
        formatData: (item: any, data: any) => {
          item.value = data.value || 0;
          item.subtitle = 'Total Clients';
        },
      },
      // Average satisfaction KPI card
      {
        type: 'card',
        colSpan: 6,
        data: {
          title: 'Average Satisfaction',
          value: '0',
          icon: 'pi pi-heart',
          backgroundColor: '#FFA726',
          color: '#FFFFFF',
        },
        loadItems: () => {
          return this.loadAverageSatisfaction();
        },
        formatData: (item: any, data: any) => {
          item.subtitle = 'Total Clients';
        },
      },
      // Client performance metrics table
      {
        id: 'clients-table',
        title: 'Client Performance Metrics',
        type: 'table',
        colSpan: 12,
        data: {
          columns: [
            { field: 'name', header: 'Client Name' },
            { field: 'happyIndex', header: 'Happiness Index' },
            { field: 'profitIndex', header: 'Profitability Index' },
            {
              field: 'revenueIndex',
              header: 'Revenue Index',
              format: 'currency',
            },
          ],
          pagination: true,
          pageSize: 10,
          onRowSelect: (item: any) => this.navigateToClientDashboard(item),
        },
        loadItems: () => {
          return this.loadClientsTableData();
        },
        formatData: (item: any, data: any) => {
          item.data = data.items;
          // Initialize values if undefined
          item.data.forEach((client: ClientDto) => {
            client.happyIndex = client.happyIndex || 0;
            client.profitIndex = client.profitIndex || 0;
            client.revenueIndex = client.revenueIndex || 1;
          });
          item.totalRecords = data.totalCount;
        },
      },
    ],
    customToolbarItems: [
      {
        label: 'Clients',
        icon: 'pi pi-id-card',
        onClick: () => this.router.navigate(['clients']),
      },
    ],
  };

  constructor(private clientService: ClientService, private router: Router) {}

  // Implementation methods omitted for brevity
}
```

### Dashboard Items

| Item                       | Type           | Description                                      |
| -------------------------- | -------------- | ------------------------------------------------ |
| Client Bubble Chart        | chart (bubble) | Visualizes client profitability vs satisfaction  |
| Total Clients              | card           | Shows total number of clients                    |
| Average Satisfaction       | card           | Shows average happiness index across all clients |
| Client Performance Metrics | table          | Tabular data showing key metrics for each client |

## ClientDashboardComponent

The `ClientDashboardComponent` provides detailed metrics for a specific client, focused on hours tracking and project details.

### Features

- KPI cards for last week and current week hours
- Charts for hours by developer and hours by week
- Projects table with billable hours tracking
- Navigation between client details and dashboard

### Example Implementation

```typescript
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

### Dashboard Items

| Item               | Type             | Description                                                   |
| ------------------ | ---------------- | ------------------------------------------------------------- |
| Last Week Hours    | card             | Hours logged for this client last week                        |
| This Week Hours    | card             | Hours logged for this client this week so far                 |
| Hours by Developer | chart (doughnut) | Distribution of hours among developers over the last 12 weeks |
| Hours by Week      | chart (bar)      | Trend of hours logged per week over the last 12 weeks         |
| Client Projects    | table            | List of projects for this client with billable/total hours    |

## Client DTO

The client components use the `ClientDto` interface:

```typescript
export interface ClientDto {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;

  // Standard metadata fields
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;

  // Financial metrics
  totalRevenue: number;
  totalBillableHours: number;
  totalHours: number;

  // Satisfaction metrics
  internalNps: number;
  externalNps: number;

  // Analytics indices
  profitIndex?: number;
  happyIndex?: number;
  revenueIndex?: number;
}
```

## Route Examples

Route Components

```
  {
    path: <PATH>,
    component: <ANGULAR_COMPONENT>
    canActivate: [authGuard], // assuming this needs authentication
    title: <TITLE>, // title for the page
    data: {
      title: <TITLE>, // title for the page
      icon: <ICON>, // icon for the page
      breadcrumb: [ // breadcrumb for the page
        {
          label: <LABEL>, // label for the breadcrumb
          routerLink: [<ROUTER_LINK>], // router link for the breadcrumb
          icon: <ICON>, // icon for the breadcrumb
        },
      ],
    },
  },
```

### List Style Route

List routes typically will follow the name of the collection or entity. For example for projects it would be "projects". For users it would be "users".

A list style route is below.

```typescript
  {
    path: 'projects',
    component: ProjectListComponent,
    canActivate: [authGuard],
    title: 'Projects List',
    data: {
      title: 'Projects List',
      icon: 'pi pi-list-check',
      breadcrumb: [
        {
          label: 'Projects',
          routerLink: ['/projects'],
          icon: 'pi pi-list-check',
        },
      ],
    },
  },

```

### Detail Style Route

Detail routes typically will follow the name of the collection or entity with an id. For example for projects it would be "projects/:id". For users it would be "users/:id".

A detail style route is below.

```typescript
  {
    path: 'projects/:id',
    component: ProjectDetailComponent,
    canActivate: [authGuard],
    title: 'Project Details',
    data: {
      title: 'Projects Details',
      icon: 'pi pi-list-check',
      breadcrumb: [
        {
          label: 'Projects',
          routerLink: ['/projects'],
          icon: 'pi pi-list-check',
        },
        {
          label: 'Project Details',
          routerLink: ['/projects', ':id'],
          icon: 'pi pi-list-check',
        },
      ],
    },
  }
```

# Automated Test Generation

Keep tests simple and easy to read. Do not generate many tests per method on a service. One test per method is enough.

Never call the backend in a test. Always mock the backend.

When done generating make sure any DTO matches the real DTO. If the DTO is not correct then the test will fail.

When generating tests DO NOT update the tested code. Only update the test code. The tested code should not be modified.

When generating tests do not verify that mocked methods are called.

## Technology Stack

- Angular
- Jest

## Service Tests

Service tests should be generated in the same folder as the service. The test file should be named <service-name>.service.spec.ts. The test file should use the following pattern.

- Imports
- Mock Data
- Mock Service
- Test Suite (describe, it)

Import Example

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { AccountService } from './account.service';
import { BackendService } from './backend.service';
import { UserDto } from '../dto/user.dto';
import {
  ProcessResult,
  QueryResult,
  QueryOptions,
} from '../components/common-dto/query.dto';
```

Mock Example

```typescript
// Mock data
const mockUserId = '123';
const mockUser: UserDto = {
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
  title: 'Developer',
};

const mockQueryResult: QueryResult<UserDto> = {
  items: [
    {
      id: mockUserId,
      item: mockUser,
    },
  ],
  total: 1,
  skip: 0,
  take: 10,
};

const mockProcessResult: ProcessResult = {
  success: true,
  message: 'Operation successful',
  id: '123',
};
```

Mock Service Example

```typescript
class MockBackendService {
  get<T>(url: string): Observable<T> {
    return of(mockQueryResult as unknown as T);
  }

  post<T>(url: string, body: any): Observable<T> {
    return of(mockProcessResult as unknown as T);
  }

  put<T>(url: string, body: any): Observable<T> {
    return of(mockProcessResult as unknown as T);
  }

  delete<T>(url: string): Observable<T> {
    return of(mockProcessResult as unknown as T);
  }
}
```

Test Suite Example

```typescript
describe('AccountService', () => {
  let service: AccountService;
  let backendService: BackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AccountService,
        { provide: BackendService, useValue: mockBackendService },
      ],
    });
    service = TestBed.inject(AccountService);
    backendService = TestBed.inject(BackendService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentProfile', () => {
    it('should get current user profile', () => {
      // Arrange
      mockBackendService.get.mockReturnValue(of(mockUser));

      // Act
      let result: UserDto | undefined;
      service.getCurrentProfile().subscribe((profile) => {
        result = profile;
      });

      // Assert
      expect(backendService.get).toHaveBeenCalledWith('profile');
      expect(result).toEqual(mockUser);
    });
  });
}
```
