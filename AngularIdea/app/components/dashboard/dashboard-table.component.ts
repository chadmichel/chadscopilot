import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { catchError, of } from 'rxjs';
import { NumberCleanup } from '../../pipes/number-cleanup.pipe';
import { getValueByDotNotationUtility } from '../../utilities/dot-notation-access.utility';
import { DashboardItem, DashboardTableData } from './dashboard.types';
import { IdDisplayPipe } from '../../pipes/id-display.pipe';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'pb-dashboard-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    ProgressSpinnerModule,
    NumberCleanup,
    IdDisplayPipe,
    ButtonModule,
    TooltipModule,
  ],
  template: `
    <p-card [title]="tableData.title" styleClass="h-full">
      <h2>{{ tableData.title }}</h2>
      <p-table
        [paginator]="tableData.showPaginator !== false"
        [rows]="data.length"
        [rowsPerPageOptions]="tableData.pageSizeOptions"
        styleClass="p-datatable-sm"
        [selectionMode]="tableData.onRowSelect ? 'single' : undefined"
        (onRowSelect)="onRowSelect($event)"
        [loading]="loading"
        [value]="data"
      >
        <ng-template pTemplate="header">
          <tr>
            <th *ngFor="let col of tableData.columns">
              {{ col.header }}
            </th>
            <th *ngIf="tableData.rowActions && tableData.rowActions.length > 0" style="width: 100px">
              Actions
            </th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-rowData>
          <tr [pSelectableRow]="rowData">
            <td *ngFor="let col of tableData.columns">
              <ng-container [ngSwitch]="col.type">
                <span *ngSwitchCase="'date'">{{
                  getValueByDotNotation(rowData, col.field)
                    | date : col.format || 'short'
                }}</span>
                <span *ngSwitchCase="'boolean'">{{
                  rowData[col.field] ? 'Yes' : 'No'
                }}</span>
                <span *ngSwitchCase="'number'">{{
                  rowData[col.field] | numbercleanup
                }}</span>
                <span *ngSwitchCase="'id'">{{
                  getValueByDotNotation(rowData, col.field) | idDisplay
                }}</span>

                <span *ngSwitchCase="'boolean'">{{
                  getValueByDotNotation(rowData, col.field) ? 'Yes' : 'No'
                }}</span>
                <span *ngSwitchCase="'base64Svg'">
                  @if (getValueByDotNotation(rowData, col.field)) {
                  <img
                    [src]="
                      'data:image/svg+xml;base64,' +
                      getValueByDotNotation(rowData, col.field)
                    "
                    [alt]="col.header"
                    style="width: 50px; height: 50px;"
                  />
                  }
                </span>
                <span *ngSwitchDefault>{{
                  getValueByDotNotation(rowData, col.field)
                }}</span>
              </ng-container>
            </td>
            <td *ngIf="tableData.rowActions && tableData.rowActions.length > 0">
              <div class="flex gap-2">
                <button
                  *ngFor="let action of tableData.rowActions"
                  pButton
                  [icon]="action.icon"
                  [severity]="action.severity || 'secondary'"
                  [pTooltip]="action.tooltip || ''"
                  tooltipPosition="bottom"
                  class="p-button-text p-button-sm p-button-rounded"
                  (click)="$event.stopPropagation(); action.onClick(rowData)"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="tableData.columns.length + (tableData.rowActions?.length ? 1 : 0)" class="text-center">
              No records found
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
  styles: [
    `
      .h-full {
        height: 100%;
      }
    `,
  ],
})
export class DashboardTableComponent {
  @Input() tableData!: DashboardTableData;
  @Input() itemConfig!: DashboardItem;
  @Input() loading: boolean = false;

  data: any[] = [];

  onRowSelect(event: any): void {
    if (this.tableData.onRowSelect) {
      this.tableData.onRowSelect(event.data);
    }
  }

  getValueByDotNotation = getValueByDotNotationUtility;

  loadData(): void {
    if (this.itemConfig.loadItems) {
      this.loading = true;
      this.itemConfig
        .loadItems()
        .pipe(
          catchError((error) => {
            console.error('Error loading items:', error);
            this.loading = false;
            return of([]);
          })
        )
        .subscribe((data) => {
          if (Array.isArray(data)) {
            // If data is already an array, use it directly
            this.tableData.data = data;
            this.data = data;
          } else if (data && data.items && Array.isArray(data.items)) {
            // If data is a QueryResult, flatten it
            const flattendItems = data.items.map((item: any) => ({
              ...item,
              ...item.item,
              id: item.id || item.item?.id,
            }));
            this.tableData.data = flattendItems;
            this.data = flattendItems;
          } else {
            // Fallback for empty or unexpected formats
            this.tableData.data = [];
            this.data = [];
          }
          this.loading = false;
        });
    }
  }
  ngOnInit(): void {
    if (this.itemConfig.loadItems) {
      this.loadData();
    }
  }
}
