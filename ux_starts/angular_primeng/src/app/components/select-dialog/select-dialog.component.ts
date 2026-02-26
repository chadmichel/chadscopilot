import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { SelectDialogConfig } from './select-dialog.types';
import { IdDisplayPipe } from '../../pipes/id-display.pipe';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MessagesModule } from 'primeng/messages';
import { PaginatorModule } from 'primeng/paginator';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-select-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    ToastModule,
    IdDisplayPipe,
    MessagesModule,
    PaginatorModule,
    CheckboxModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-dialog
      [(visible)]="visible"
      [header]="config.header"
      [modal]="true"
      [style]="{ width: '70vw', height: '90vh' }"
      [draggable]="false"
      [resizable]="false"
      [maximizable]="true"
      styleClass="select-dialog"
      [breakpoints]="{ '960px': '100vw', '640px': '100vw' }"
      [contentStyle]="{ 'max-height': '100vh' }"
    >
      <div class="dialog-content">
        <div class="search-container mb-3">
          <span class="p-input-icon-right full-width">
            <input
              type="text"
              pInputText
              [(ngModel)]="filterValue"
              (ngModelChange)="onFilterChange($event)"
              placeholder="Search..."
              class="auto-width"
            />
          </span>
        </div>

        <div class="flex-grow-1 overflow-hidden">
          <p-table
            #dt
            [value]="flatItems"
            [columns]="config.columns"
            [paginator]="false"
            [rows]="500"
            [loading]="loading"
            [totalRecords]="totalRecords"
            (onLazyLoad)="loadData($event)"
            [lazy]="true"
            [(selection)]="selectedItems"
            dataKey="id"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
            [scrollable]="true"
            scrollHeight="100%"
          >
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 4rem">
                  <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                </th>
                <th *ngFor="let col of config.columns">
                  {{ col.header }}
                </th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-item>
              <tr>
                <td>
                  <p-tableCheckbox [value]="item"></p-tableCheckbox>
                </td>
                <td *ngFor="let col of config.columns">
                  <ng-container [ngSwitch]="col.type">
                    <span *ngSwitchCase="'date'">
                      {{ item[col.field] | date : col.format || 'medium' }}
                    </span>
                    <span *ngSwitchCase="'id'">
                      {{ item[col.field] | idDisplay }}
                    </span>
                    <span *ngSwitchDefault>{{ item[col.field] }}</span>
                  </ng-container>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <div class="dialog-footer">
          <div class="button-container">
            <p-button
              label="Cancel"
              icon="pi pi-times"
              (onClick)="hide()"
              styleClass="p-button-text"
            ></p-button>
            <p-button
              label="Select"
              icon="pi pi-check"
              (onClick)="handleSelect()"
              [disabled]="!selectedItems.length"
            ></p-button>
          </div>
        </div>
      </div>

      <p-toast position="top-right"></p-toast>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .select-dialog {
        display: flex;
        flex-direction: column;
      }
      :host ::ng-deep .dialog-content {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      :host ::ng-deep .dialog-footer {
        border-top: 1px solid var(--surface-border);
        padding: 1rem 0;
        margin-top: 1rem;
      }
      :host ::ng-deep .button-container {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
      }
      :host ::ng-deep .p-datatable {
        flex: 1;
      }
      :host ::ng-deep .p-datatable-wrapper {
        height: 100%;
      }
      :host ::ng-deep .select-dialog.p-dialog {
        margin: 0;
      }
      @media screen and (max-width: 960px) {
        :host ::ng-deep .select-dialog.p-dialog {
          width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
        }
        :host ::ng-deep .select-dialog .p-dialog-content {
          padding: 0 1rem 1rem 1rem;
        }
      }
    `,
  ],
})
export class SelectDialogComponent implements OnInit {
  @Input() config!: SelectDialogConfig<any>;

  customToolbarItems: any[] = [
    {
      label: 'Select',
      icon: 'pi pi-check',
      onClick: () => this.handleSelect(),
    },
  ];

  header: string = 'Select Items';
  visible: boolean = false;
  items: any[] = [];
  flatItems: any[] = [];
  selectedItems: any[] = [];
  loading: boolean = false;
  totalRecords: number = 0;
  filterValue: string = '';

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.header = this.config.header;
  }

  show() {
    this.visible = true;
    this.loadData({ first: 0, rows: 10 });
  }

  hide() {
    this.visible = false;
    this.selectedItems = [];
    this.filterValue = '';
  }

  loadData(event: any) {
    this.loading = true;
    const params = {
      skip: event.first,
      take: event.rows,
      filter: this.filterValue,
    };

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

  onFilterChange(event: any) {
    this.loadData({ first: 0, rows: 10, filter: event });
  }

  async handleSelect() {
    if (this.selectedItems.length === 0) return;

    this.config.dataService.selectItems(this.selectedItems);
    this.hide();
  }
}
