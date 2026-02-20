import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BackendService } from './backend.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  QueryOptions,
  QueryResult,
  ProcessResult,
} from '../components/common-dto/query.dto';

// Mock data
interface TestDto {
  name: string;
  value: number;
}

const mockTenant = { id: 'tenant-123', name: 'Test Tenant' };
const mockToken = 'mock-jwt-token';
const mockApiUrl = 'https://api.example.com';
const mockQueryResult: QueryResult<TestDto> = {
  items: [{ id: '1', item: { name: 'Test', value: 123 } }],
  total: 1,
  skip: 0,
  take: 10,
};
const mockProcessResult: ProcessResult = {
  success: true,
  message: 'Operation successful',
  id: '123',
};
const mockErrorResponse = {
  status: 401,
  error: { message: 'Token has expired' },
};

// Mock services
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

const mockAuthService = {
  getCurrentTenant: jest.fn(),
  getToken: jest.fn(),
  isTokenExpired: jest.fn(),
  refreshToken: jest.fn(),
  handleUnauthorized: jest.fn(),
};

const mockRouter = {
  navigate: jest.fn(),
};

describe('BackendService', () => {
  let service: BackendService;
  let httpClient: HttpClient;
  let authService: AuthService;

  beforeEach(() => {
    // Override environment.apiUrl for testing
    (environment as any).apiUrl = mockApiUrl;

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockAuthService.getCurrentTenant.mockReturnValue(mockTenant);
    mockAuthService.getToken.mockReturnValue(mockToken);
    mockAuthService.isTokenExpired.mockReturnValue(false);
    mockAuthService.refreshToken.mockReturnValue(of({}));

    mockHttpClient.get.mockReturnValue(of({}));
    mockHttpClient.post.mockReturnValue(of({}));
    mockHttpClient.put.mockReturnValue(of({}));
    mockHttpClient.delete.mockReturnValue(of({}));
    mockHttpClient.patch.mockReturnValue(of({}));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        BackendService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(BackendService);
    httpClient = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getHeaders', () => {
    it('should handle missing tenant or token', () => {
      mockAuthService.getCurrentTenant.mockReturnValue(null);
      mockAuthService.getToken.mockReturnValue(null);

      service.get('test');

      // Should still make the call without those headers
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `${mockApiUrl}/test`,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
    });
  });

  describe('ensureAuthenticated', () => {
    it('should make API call directly when token is valid', () => {
      mockAuthService.isTokenExpired.mockReturnValue(false);

      service.get('test');

      expect(mockAuthService.isTokenExpired).toHaveBeenCalled();
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalled();
    });

    it('should refresh token first when token is expired', () => {
      mockAuthService.isTokenExpired.mockReturnValue(true);

      service.get('test');

      expect(mockAuthService.isTokenExpired).toHaveBeenCalled();
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });

    it('should handle unauthorized when token refresh fails', () => {
      mockAuthService.isTokenExpired.mockReturnValue(true);
      mockAuthService.refreshToken.mockReturnValue(
        throwError(() => new Error('Failed to refresh'))
      );

      service.get('test').subscribe(
        () => fail('Should have failed'),
        (error) => expect(error).toBeTruthy()
      );

      expect(mockAuthService.handleUnauthorized).toHaveBeenCalled();
    });
  });

  describe('getQuery', () => {
    it('should handle default skip and take values', () => {
      mockHttpClient.get.mockReturnValue(of(mockQueryResult));
      const queryOptions: QueryOptions = {};

      service.getQuery<TestDto>('items', queryOptions).subscribe();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`${mockApiUrl}/items?take=100&skip=0`),
        expect.anything()
      );
    });
  });

  describe('HTTP methods', () => {
    it('should make GET request with correct URL and headers', () => {
      mockHttpClient.get.mockReturnValue(of({ data: 'response' }));

      let result: any;
      service.get('test').subscribe((data) => {
        result = data;
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `${mockApiUrl}/test`,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
      expect(result).toEqual({ data: 'response' });
    });

    it('should make POST request with correct URL, body and headers', () => {
      const body = { name: 'Test', value: 42 };
      mockHttpClient.post.mockReturnValue(of(mockProcessResult));

      let result: ProcessResult | undefined;
      service.post<ProcessResult>('create', body).subscribe((data) => {
        result = data;
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `${mockApiUrl}/create`,
        body,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
      expect(result).toEqual(mockProcessResult);
    });

    it('should make PUT request with correct URL, body and headers', () => {
      const body = { id: '123', name: 'Updated' };
      mockHttpClient.put.mockReturnValue(of(mockProcessResult));

      let result: ProcessResult | undefined;
      service.put<ProcessResult>('update/123', body).subscribe((data) => {
        result = data;
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        `${mockApiUrl}/update/123`,
        body,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
      expect(result).toEqual(mockProcessResult);
    });

    it('should make DELETE request with correct URL and headers', () => {
      mockHttpClient.delete.mockReturnValue(of(mockProcessResult));

      let result: ProcessResult | undefined;
      service.delete<ProcessResult>('remove/123').subscribe((data) => {
        result = data;
      });

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        `${mockApiUrl}/remove/123`,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
      expect(result).toEqual(mockProcessResult);
    });

    it('should make PATCH request with correct URL, body and headers', () => {
      const body = { status: 'active' };
      mockHttpClient.patch.mockReturnValue(of(mockProcessResult));

      let result: ProcessResult | undefined;
      service.patch<ProcessResult>('partial/123', body).subscribe((data) => {
        result = data;
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        `${mockApiUrl}/partial/123`,
        body,
        expect.objectContaining({
          headers: expect.anything(),
        })
      );
      expect(result).toEqual(mockProcessResult);
    });

    it('should make GET request for text response', () => {
      mockHttpClient.get.mockReturnValue(of('text response'));

      let result: string | undefined;
      service.getText('text').subscribe((data) => {
        result = data;
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `${mockApiUrl}/text`,
        expect.objectContaining({
          responseType: 'text',
          headers: expect.anything(),
        })
      );
      expect(result).toEqual('text response');
    });
  });

  describe('Error handling', () => {
    it('should handle 401 errors with expired token message', () => {
      mockHttpClient.get.mockReturnValue(throwError(() => mockErrorResponse));

      service.get('test').subscribe(
        () => fail('Should have failed'),
        (error) => {
          expect(error).toEqual(mockErrorResponse);
          expect(mockAuthService.handleUnauthorized).toHaveBeenCalled();
        }
      );
    });

    it('should rethrow non-401 errors', () => {
      const nonAuthError = { status: 500, error: { message: 'Server error' } };
      mockHttpClient.get.mockReturnValue(throwError(() => nonAuthError));

      service.get('test').subscribe(
        () => fail('Should have failed'),
        (error) => {
          expect(error).toEqual(nonAuthError);
          expect(mockAuthService.handleUnauthorized).not.toHaveBeenCalled();
        }
      );
    });
  });
});
