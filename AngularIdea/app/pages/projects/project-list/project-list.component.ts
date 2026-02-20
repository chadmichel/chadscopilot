import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ItemListComponent } from '../../../components/item-list/item-list.component';
import { ItemListConfig } from '../../../components/item-list/item-list.types';
import { QueryOptions, QueryResult } from '../../../components/common-dto/query.dto';
import { ProjectService } from '../../../services/project.service';
import { ProjectDto } from '../../../dto/project.dto';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class ProjectListComponent {
  listConfig: ItemListConfig = {
    header: 'Projects',
    supportsAdd: true,
    supportsEdit: true,
    supportsDelete: false,
    enableSearch: true,
    defaultSortField: 'name',
    columns: [
      { field: 'name', header: 'Name', type: 'text', sortable: true },
      { field: 'key', header: 'Key', type: 'text', sortable: true, mobileHide: true },
      {
        field: 'status',
        header: 'Status',
        type: 'select',
        sortable: true,
        options: [
          { label: 'Backlog', value: 'backlog' },
          { label: 'OnDeck', value: 'ondeck' },
          { label: 'InProcess', value: 'inprocess' },
          { label: 'Done', value: 'done' },
        ],
      },
      {
        field: 'updatedAt',
        header: 'Updated',
        type: 'date',
        format: 'shortDate',
        sortable: true,
        mobileHide: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        filter: queryParams['filter'] || '',
      }),
      loadItems: (params: QueryOptions): Observable<QueryResult<ProjectDto>> =>
        this.projectService.getProjects(params),
    },
    onAdd: () => this.router.navigate(['/', 'projects', 'new']),
    onEdit: (item) => this.router.navigate(['/', 'projects', item.id]),
  };

  constructor(
    private router: Router,
    private projectService: ProjectService
  ) {}
}

