import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ItemDetailComponent } from '../../../components/item-detail/item-detail.component';
import { ItemDetailConfig } from '../../../components/item-detail/item-detail.types';
import { SelectOption } from '../../../components/common-dto/query.dto';
import { IntegrationService } from '../../../services/integration.service';
import { ProjectService } from '../../../services/project.service';
import { IntegrationDto } from '../../../dto/integration.dto';

@Component({
  selector: 'app-integration-detail',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class IntegrationDetailComponent {
  detailConfig: ItemDetailConfig = {
    header: 'Integration',
    isEditable: true,
    supportsAdd: true,
    supportsDelete: true,
    breadcrumbField: 'name',
    updateSuccessMessage: 'Integration updated',
    createSuccessMessage: 'Integration created',
    deleteSuccessMessage: 'Integration deleted',
    customToolbarItems: [
      {
        label: 'Back',
        icon: 'pi pi-arrow-left',
        onClick: () => this.router.navigate(['/integrations']),
      },
    ],
    formLayout: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { label: 'GitHub Repository', value: 'github_repo' },
          { label: 'GitHub Project', value: 'github_project' },
          { label: 'Azure DevOps Project', value: 'azure_devops_project' },
        ],
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Disconnected', value: 'disconnected' },
          { label: 'Connected', value: 'connected' },
          { label: 'Error', value: 'error' },
        ],
      },
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'projectIds',
        label: 'Linked Projects',
        type: 'multiselect',
        loadOptions: () => this.loadProjectOptions(),
      },
      {
        key: 'credentialsRef',
        label: 'Credentials Reference',
        type: 'text',
      },
      {
        key: 'config',
        label: 'Config (JSON)',
        type: 'json',
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        id: params['id'],
        isNew: params['id'] === 'new',
      }),
      loadItem: (query) => {
        if (query.isNew) {
          return of({
            name: '',
            type: 'github_repo',
            status: 'disconnected',
            description: '',
            projectIds: [],
            config: {},
            credentialsRef: '',
          } as IntegrationDto);
        }
        return this.integrationService.getIntegration(query.id || '');
      },
      createItem: (query, item) => this.integrationService.createIntegration(item),
      updateItem: (query, item) =>
        this.integrationService.updateIntegration(query.id || '', item),
      deleteItem: (query) =>
        this.integrationService.deleteIntegration(query.id || ''),
    },
  };

  constructor(
    private integrationService: IntegrationService,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  private loadProjectOptions(): Observable<SelectOption[]> {
    return this.projectService.getProjects({ take: 200, skip: 0 }).pipe(
      map((res) =>
        (res.items || []).map((it) => ({
          label: it.item?.name || it.id,
          value: it.id,
        }))
      )
    );
  }
}

