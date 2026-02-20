import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BackendService } from './backend.service';
import {
  ProcessResult,
  QueryOptions,
  QueryResult,
} from '../components/common-dto/query.dto';
import { IntegrationDto } from '../dto/integration.dto';

@Injectable({
  providedIn: 'root',
})
export class IntegrationService {
  constructor(private backend: BackendService) {}

  getIntegrations(
    queryParams: QueryOptions
  ): Observable<QueryResult<IntegrationDto>> {
    return this.backend.getQuery<IntegrationDto>('integrations', queryParams);
  }

  getIntegration(id: string): Observable<IntegrationDto> {
    return this.backend.get<IntegrationDto>(`integrations/${id}`);
  }

  createIntegration(item: IntegrationDto): Observable<ProcessResult> {
    item.createdAt = undefined;
    item.updatedAt = undefined;
    return this.backend.post<ProcessResult>('integrations', item);
  }

  updateIntegration(id: string, item: IntegrationDto): Observable<ProcessResult> {
    return this.backend.put<ProcessResult>(`integrations/${id}`, item);
  }

  deleteIntegration(id: string): Observable<ProcessResult> {
    return this.backend.delete<ProcessResult>(`integrations/${id}`);
  }
}

