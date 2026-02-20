import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Observable, of } from 'rxjs';
import { ItemDetailComponent } from '../../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../../components/item-detail/item-detail.types';
import { ProcessResult, QueryOptions } from '../../../components/common-dto/query.dto';

export interface ProjectDtoStub {
  name: string;
  key?: string;
  status: 'backlog' | 'ondeck' | 'inprocess' | 'done';
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class ProjectDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'Project',
    isEditable: true,
    supportsAdd: true,
    supportsDelete: false,
    updateSuccessMessage: 'Project updated',
    createSuccessMessage: 'Project created',
    breadcrumbField: 'name',
    formLayout: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'key', label: 'Key', type: 'text' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Backlog', value: 'backlog' },
          { label: 'OnDeck', value: 'ondeck' },
          { label: 'InProcess', value: 'inprocess' },
          { label: 'Done', value: 'done' },
        ],
      },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['projectId'],
        isNew: params['projectId'] === 'new',
      }),
      loadItem: (params: QueryOptions): Observable<ProjectDtoStub> =>
        of({
          name: params.isNew ? '' : 'Example Project',
          key: params.isNew ? '' : 'WID',
          status: 'backlog',
          description:
            'This is a placeholder project screen. Next step: wire ProjectService + caching.',
        }),
      createItem: (query: QueryOptions, item: any): Observable<ProcessResult> =>
        of({ id: 'new', success: true, message: 'Created (stub)' }),
      updateItem: (query: QueryOptions, item: any): Observable<ProcessResult> =>
        of({ id: query.id || 'unknown', success: true, message: 'Updated (stub)' }),
      deleteItem: (query: QueryOptions): Observable<ProcessResult> =>
        of({ id: query.id || 'unknown', success: true, message: 'Deleted (stub)' }),
    },
  };
}

