import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { AccountService } from './account.service';
import { BackendService } from './backend.service';
import { UserDto } from '../dto/user.dto';
import { ProcessResult, QueryResult } from '../components/common-dto/query.dto';

// Mock data
const mockUserId = '123';
const mockUser: UserDto = {
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date(),
  updatedAt: new Date(),
  title: 'Developer',
};

const mockQueryResult: QueryResult<UserDto> = {
  items: [
    {
      id: mockUserId,
      item: mockUser,
    },
  ],
  total: 1,
  skip: 0,
  take: 10,
};

const mockProcessResult: ProcessResult = {
  success: true,
  message: 'Operation successful',
  id: '123',
};

// Create a mock BackendService
const mockBackendService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  getQuery: jest.fn(),
};

describe('AccountService', () => {
  let service: AccountService;
  let backendService: BackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AccountService,
        { provide: BackendService, useValue: mockBackendService },
      ],
    });
    service = TestBed.inject(AccountService);
    backendService = TestBed.inject(BackendService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentProfile', () => {
    it('should get current user profile', () => {
      // Arrange
      mockBackendService.get.mockReturnValue(of(mockUser));

      // Act
      let result: UserDto | undefined;
      service.getCurrentProfile().subscribe((profile) => {
        result = profile;
      });

      // Assert
      expect(backendService.get).toHaveBeenCalledWith('profile');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', () => {
      // Arrange
      mockBackendService.put.mockReturnValue(of(mockProcessResult));

      // Act
      let result: ProcessResult | undefined;
      service.updateProfile(mockUser).subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.put).toHaveBeenCalledWith('profile', mockUser);
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('getAccount', () => {
    it('should get user account by ID', () => {
      // Arrange
      mockBackendService.get.mockReturnValue(of(mockUser));

      // Act
      let result: UserDto | undefined;
      service.getAccount('123').subscribe((account) => {
        result = account;
      });

      // Assert
      expect(backendService.get).toHaveBeenCalledWith('account/users/123');
      expect(result).toEqual(mockUser);
    });

    it('should return a new user object when id is "new"', () => {
      // Act
      let result: UserDto | undefined;
      service.getAccount('new').subscribe((account) => {
        result = account;
      });

      // Assert
      expect(backendService.get).not.toHaveBeenCalled();
      expect(result?.username).toEqual('');
    });
  });

  describe('updateAccount', () => {
    it('should update an account', () => {
      // Arrange
      mockBackendService.put.mockReturnValue(of(mockProcessResult));

      // Act
      let result: ProcessResult | undefined;
      service.updateAccount('123', mockUser).subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.put).toHaveBeenCalledWith(
        'account/users/123',
        mockUser
      );
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('createAccount', () => {
    it('should create a new account and clear createdAt and updatedAt', () => {
      // Arrange
      mockBackendService.post.mockReturnValue(of(mockProcessResult));
      const userToCreate = { ...mockUser };

      // Act
      let result: ProcessResult | undefined;
      service.createAccount(userToCreate).subscribe((response) => {
        result = response;
      });

      // Assert
      expect(userToCreate.createdAt).toBeUndefined();
      expect(userToCreate.updatedAt).toBeUndefined();
      expect(backendService.post).toHaveBeenCalledWith(
        'account/users',
        userToCreate
      );
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('deleteAccount', () => {
    it('should delete an account', () => {
      // Arrange
      mockBackendService.delete.mockReturnValue(of(mockProcessResult));

      // Act
      let result: ProcessResult | undefined;
      service.deleteAccount('123').subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.delete).toHaveBeenCalledWith('account/users/123');
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('getAccounts', () => {
    it('should get accounts with query parameters', () => {
      // Arrange
      mockBackendService.getQuery.mockReturnValue(of(mockQueryResult));
      const queryParams = { skip: 0, take: 10, filter: 'test' };

      // Act
      let result: QueryResult<UserDto> | undefined;
      service.getAccounts(queryParams).subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.getQuery).toHaveBeenCalledWith(
        'account/users',
        queryParams
      );
      expect(result).toEqual(mockQueryResult);
    });
  });

  describe('getAccountsForLookup', () => {
    it('should get accounts for lookup', () => {
      // Arrange
      const mockLookupOptions = [
        { label: 'Test User', value: '123' },
        { label: 'Admin User', value: '456' },
      ];
      mockBackendService.get.mockReturnValue(of(mockLookupOptions));

      // Act
      let result: any;
      service.getAccountsForLookup().subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.get).toHaveBeenCalledWith(
        'account/users?lookupList=true'
      );
      expect(result).toEqual(mockLookupOptions);
    });
  });

  describe('getAccountsHeiachy', () => {
    it('should get accounts hierarchy', () => {
      // Arrange
      const mockHierarchyData = { root: { children: [] } };
      mockBackendService.get.mockReturnValue(of(mockHierarchyData));

      // Act
      let result: any;
      service.getAccountsHeiachy().subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.get).toHaveBeenCalledWith(
        'account/users?hierarchy=true'
      );
      expect(result).toEqual(mockHierarchyData);
    });
  });

  describe('addUserToTenant', () => {
    it('should add a user to a tenant', () => {
      // Arrange
      mockBackendService.post.mockReturnValue(of(mockProcessResult));

      // Act
      let result: any;
      service.addUserToTenant('tenant-1', '123').subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.post).toHaveBeenCalledWith(
        'account/tenant/add-user',
        {
          tenantId: 'tenant-1',
          userId: '123',
        }
      );
      expect(result).toEqual(mockProcessResult);
    });
  });

  describe('resetPassword', () => {
    it('should reset user password', () => {
      // Arrange
      mockBackendService.post.mockReturnValue(of(mockProcessResult));

      // Act
      let result: ProcessResult | undefined;
      service.resetPassword('123').subscribe((response) => {
        result = response;
      });

      // Assert
      expect(backendService.post).toHaveBeenCalledWith(
        'account/123/reset-password',
        {}
      );
      expect(result).toEqual(mockProcessResult);
    });
  });
});
