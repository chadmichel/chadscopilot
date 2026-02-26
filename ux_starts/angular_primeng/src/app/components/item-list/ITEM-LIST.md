# ItemList Component

`<pb-item-list>` is a versatile component for displaying data in a tabular format with built-in pagination, filtering, and CRUD operations.

## Usage

```typescript
@Component({
  selector: 'app-your-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class YourListComponent {
  listConfig: ItemListConfig = {
    header: 'Your Items',
    supportsAdd: true,
    supportsEdit: true,
    supportsDelete: true,
    defaultSortField: 'name',
    columns: [
      {
        field: 'name',
        header: 'Name',
        type: 'text',
        sortable: true,
      },
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
      }),
      loadItems: (params) => this.yourService.getItems(params),
      deleteItem: (params, item) => this.yourService.deleteItem(item.id),
    },
  };

  constructor(private yourService: YourService) {}
}
```

## Configuration Options

| Property             | Type                | Description                                   |
| -------------------- | ------------------- | --------------------------------------------- |
| `header`             | string              | Title displayed at the top of the list        |
| `supportsAdd`        | boolean             | Whether to show the Add button                |
| `supportsEdit`       | boolean             | Whether to enable edit functionality          |
| `supportsDelete`     | boolean             | Whether to show the Delete button             |
| `defaultSortField`   | string              | Field to sort by default                      |
| `enableSearch`       | boolean             | Whether to show the search input              |
| `columns`            | Column[]            | Array of column configurations                |
| `dataService`        | DataServiceConfig   | Configuration for data loading and operations |
| `customToolbarItems` | ToolbarItem[]       | Custom actions to add to the toolbar          |
| `rowSelectable`      | boolean             | Whether rows are selectable                   |
| `multiselect`        | boolean             | Whether multiple rows can be selected         |
| `onRowSelect`        | (item: any) => void | Callback when a row is selected               |
| `onEdit`             | (item: any) => void | Callback when edit button is clicked          |

## Example - Client List

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
        mobileHide: true,
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
