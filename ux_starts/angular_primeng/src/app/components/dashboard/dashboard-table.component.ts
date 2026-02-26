import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { catchError } from 'rxjs';
import { NumberCleanup } from '../../pipes/number-cleanup.pipe';
import { getValueByDotNotationUtility } from '../../utilities/dot-notation-access.utility';
import { DashboardItem, DashboardTableData } from './dashboard.types';
import { IdDisplayPipe } from '../../pipes/id-display.pipe';

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
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="tableData.columns.length" class="text-center">
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
            return [];
          })
        )
        .subscribe((data) => {
          if (this.tableData.flattenedData === false) {
            this.tableData.data = data;
            this.data = data;
          } else {
            const flattendItems = data.items.map((item: any) => ({
              ...item,
              ...item.item,
              // Ensure the id from the QueryResultItem wrapper takes precedence
              id: item.id,
            }));
            this.tableData.data = flattendItems;
            this.data = flattendItems;
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
