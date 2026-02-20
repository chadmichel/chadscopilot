import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { IntegrationService } from './integration.service';
import { BackendService } from './backend.service';
import { IntegrationDto } from '../dto/integration.dto';
import {
  ProcessResult,
  QueryOptions,
  QueryResult,
} from '../components/common-dto/query.dto';

// Mock data
const mockIntegrationId = 'integration-1';
const mockIntegration: IntegrationDto = {
  name: 'GitHub Repo (Demo)',
  type: 'github_repo',
  status: 'disconnected',
  description: 'Demo integration instance',
  projectIds: ['project-1'],
  config: { repositories: ['org/repo'] },
  credentialsRef: 'cred_demo',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockQueryResult: QueryResult<IntegrationDto> = {
  items: [
    {
      id: mockIntegrationId,
      item: mockIntegration,
    },
  ],
  total: 1,
  skip: 0,
  take: 10,
};

const mockProcessResult: ProcessResult = {
  success: true,
  message: 'Operation successful',
  id: mockIntegrationId,
};

class MockBackendService {
  getQuery<T>(endpoint: string, queryParams: QueryOptions) {
    return of(mockQueryResult as unknown as QueryResult<T>);
  }
  get<T>(endpoint: string) {
    return of(mockIntegration as unknown as T);
  }
  post<T>(endpoint: string, body: any) {
    return of(mockProcessResult as unknown as T);
  }
  put<T>(endpoint: string, body: any) {
    return of(mockProcessResult as unknown as T);
  }
  delete<T>(endpoint: string) {
    return of(mockProcessResult as unknown as T);
  }
}

describe('IntegrationService', () => {
  let service: IntegrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        IntegrationService,
        { provide: BackendService, useClass: MockBackendService },
      ],
    });
    service = TestBed.inject(IntegrationService);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getIntegrations', () => {
    it('should return integrations', () => {
      let result: QueryResult<IntegrationDto> | undefined;
      service.getIntegrations({ take: 10, skip: 0 }).subscribe((r) => (result = r));
      expect(result).toEqual(mockQueryResult);
    });
  });

  describe('getIntegration', () => {
    it('should return a single integration', () => {
      let result: IntegrationDto | undefined;
      service.getIntegration(mockIntegrationId).subscribe((r) => (result = r));
      expect(result).toEqual(mockIntegration);
    });
  });

  describe('createIntegration', () => {
    it('should create an integration', () => {
      let result: ProcessResult | undefined;
      service.createIntegration({ ...mockIntegration }).subscribe((r) => (result = r));
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('updateIntegration', () => {
    it('should update an integration', () => {
      let result: ProcessResult | undefined;
      service
        .updateIntegration(mockIntegrationId, { ...mockIntegration })
        .subscribe((r) => (result = r));
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('deleteIntegration', () => {
    it('should delete an integration', () => {
      let result: ProcessResult | undefined;
      service.deleteIntegration(mockIntegrationId).subscribe((r) => (result = r));
      expect(result).toEqual(mockProcessResult);
    });
  });
});

