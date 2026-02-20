import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { BackendService } from './backend.service';
import { UserDto } from '../dto/user.dto';
import {
  ProcessResult,
  QueryOptions,
  QueryResult,
  SelectOption,
} from '../components/common-dto/query.dto';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  constructor(private backend: BackendService, private http: HttpClient) {}

  getCurrentProfile(): Observable<UserDto> {
    return this.backend.get<UserDto>('profile');
  }

  updateProfile(profile: UserDto): Observable<ProcessResult> {
    return this.backend.put<ProcessResult>('profile', profile);
  }

  getAccount(id: string): Observable<UserDto> {
    if (id === 'new') {
      return of({
        id: 'new',
        username: '',
        email: '',
        tenantId: '',
        role: '',
        firstName: '',
        lastName: '',
        source: '',
        tenants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        title: '',
        displayName: '',
      });
    } else {
      return this.backend.get<UserDto>(`account/users/${id}`);
    }
  }

  updateAccount(id: string, user: UserDto): Observable<ProcessResult> {
    return this.backend.put<ProcessResult>(`account/users/${id}`, user);
  }

  createAccount(user: UserDto): Observable<ProcessResult> {
    user.createdAt = undefined;
    user.updatedAt = undefined;
    return this.backend.post<ProcessResult>('account/users', user);
  }

  deleteAccount(id: string): Observable<ProcessResult> {
    return this.backend.delete<ProcessResult>(`account/users/${id}`);
  }

  getAccounts(queryParams: QueryOptions): Observable<QueryResult<UserDto>> {
    return this.backend.getQuery<UserDto>('account/users', queryParams);
  }

  getAccountsForLookup(): Observable<SelectOption[]> {
    return this.backend.get<SelectOption[]>('account/users?lookupList=true');
  }

  getTutorsForLookup(): Observable<SelectOption[]> {
    return this.backend.get<SelectOption[]>(
      'account/users?lookupList=true&isTutor=true'
    );
  }

  getCoordinatorsForLookup(): Observable<SelectOption[]> {
    return this.backend.get<SelectOption[]>(
      'account/users?lookupList=true&isCoordinator=true'
    );
  }

  getAccountsHeiachy(): Observable<any> {
    return this.backend.get<any>('account/users?hierarchy=true');
  }

  addUserToTenant(tenantId: string, userId: string): Observable<any> {
    return this.backend.post(`account/tenant/add-user`, { tenantId, userId });
  }

  removeUserFromTenant(
    tenantId: string,
    userId: string
  ): Observable<ProcessResult> {
    return this.backend.post<ProcessResult>(`account/tenant/remove-user`, {
      tenantId,
      userId,
    });
  }

  resetPassword(userId: string): Observable<ProcessResult> {
    return this.backend.post<ProcessResult>(
      `account/${userId}/reset-password`,
      {}
    );
  }
}
