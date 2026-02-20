# ItemDetail Component

`<pb-item-detail>` is used for creating detail/edit forms with support for various field types and validations.

## Usage

```typescript
@Component({
  selector: 'app-your-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class YourDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'Item Details',
    isEditable: true,
    supportsAdd: true,
    supportsDelete: true,
    updateSuccessMessage: 'Item updated successfully',
    breadcrumbField: 'name',
    formLayout: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { label: 'Category A', value: 'A' },
          { label: 'Category B', value: 'B' },
        ],
      },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        isNew: params['id'] === 'new',
      }),
      loadItem: (params) => this.yourService.getItem(params.id || ''),
      createItem: (params, item) => this.yourService.createItem(item),
      updateItem: (params, item) =>
        this.yourService.updateItem(params.id || '', item),
      deleteItem: (params) => this.yourService.deleteItem(params.id || ''),
    },
    customToolbarItems: [
      {
        label: 'Custom Action',
        icon: 'pi pi-cog',
        onClick: () => this.customAction(),
      },
    ],
  };

  constructor(
    private yourService: YourService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  customAction() {
    // Custom action implementation
  }
}
```

## Configuration Options

| Property               | Type              | Description                                          |
| ---------------------- | ----------------- | ---------------------------------------------------- |
| `header`               | string            | Title displayed at the top of the form               |
| `isEditable`           | boolean           | Whether the form can be edited                       |
| `supportsAdd`          | boolean           | Whether creation of new items is allowed             |
| `supportsDelete`       | boolean           | Whether deletion is supported                        |
| `updateSuccessMessage` | string            | Message to show after successful update              |
| `createSuccessMessage` | string            | Message to show after successful creation            |
| `breadcrumbField`      | string            | Field to use in breadcrumbs                          |
| `formLayout`           | FormField[]       | Array of form field configurations                   |
| `dataService`          | DataServiceConfig | Configuration for data loading and saving operations |
| `customToolbarItems`   | ToolbarItem[]     | Custom actions to add to the toolbar                 |
| `metrics`              | MetricItem[]      | Optional metrics to display at the top               |

## Field Types

| Type       | Description            | Additional Props                          |
| ---------- | ---------------------- | ----------------------------------------- |
| `text`     | Standard text input    | `maxLength`, `placeholder`                |
| `textarea` | Multi-line text input  | `rows`, `cols`, `maxLength`               |
| `number`   | Numeric input          | `min`, `max`, `step`                      |
| `date`     | Date picker            | `showTime`, `format`                      |
| `select`   | Dropdown selection     | `options`, `multiple`, `filterBy`         |
| `checkbox` | Boolean toggle         | `label`, `checkedValue`, `uncheckedValue` |
| `password` | Masked password input  | `toggleMask`, `feedback`                  |
| `file`     | File upload            | `accept`, `multiple`, `maxFileSize`       |
| `custom`   | Custom field rendering | `renderFn`, `parseFn`                     |

## Example - Client Detail

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemDetailComponent } from '../../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../../components/item-detail/item-detail.types';
import { ClientService } from '../../../services/client.service';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
        label: 'Exteranl NPS',
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
  } as ItemDetailConfig;

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
