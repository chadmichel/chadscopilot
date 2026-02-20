import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, from, switchMap, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { QueryOptions, QueryResult } from '../components/common-dto/query.dto';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();

    // Add tenant ID from environment or current tenant
    let tenantId =
      environment.tenantId !== 'your-tenant-id'
        ? environment.tenantId
        : this.authService.getCurrentTenant()?.id;

    if (!tenantId) {
      tenantId = this.authService.getCurrentTenant()?.id || '';
    }
    if (tenantId) {
      headers = headers.set('X-Tenant-ID', tenantId);
    }

    const token = this.authService.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private handle401Error = (error: any) => {
    if (error.status === 401) {
      let message = error.error?.message ?? '';
      message = message.toLowerCase();
      if (message.indexOf('expired') > 0) {
        this.authService.handleUnauthorized();
      }
    }
    throw error;
  };

  private getFullUrl(endpoint: string): string {
    return `${this.apiUrl}/${endpoint}`;
  }

  /**
   * Ensures a valid token before making an API request
   */
  private ensureAuthenticated<T>(apiCall: () => Observable<T>): Observable<T> {
    // Check if token is expired and needs refresh
    if (this.authService.isTokenExpired()) {
      // Token expired, try to refresh it first
      return this.authService.refreshToken().pipe(
        switchMap(() => {
          // After successful refresh, make the original API call
          return apiCall();
        }),
        catchError((error) => {
          // If refresh failed, handle unauthorized
          this.authService.handleUnauthorized();
          throw error;
        })
      );
    } else {
      // Token is still valid, make the API call directly
      return apiCall();
    }
  }

  getQuery<T>(
    endpoint: string,
    queryParams: QueryOptions
  ): Observable<QueryResult<T>> {
    const url = this.getFullUrl(endpoint);
    let userParams = '';
    if (queryParams.userId) {
      userParams = `&user=${queryParams.userId}&userId=${queryParams.userId}`;
    }
    let allParams = '';
    if (queryParams.all) {
      allParams = `&all=${queryParams.all}`;
    }

    let filterParams = '';
    if (queryParams.filter) {
      filterParams = `&filter=${queryParams.filter}`;
    }

    if (queryParams.contactId) {
      filterParams = `&contactId=${queryParams.contactId}`;
    }

    let excludeMine = '';
    if (queryParams.excludeMine) {
      excludeMine = `&excludeMine=${queryParams.excludeMine}`;
    }

    let tenantParams = '';
    if (queryParams.tenantId) {
      tenantParams = `&tenantId=${queryParams.tenantId}`;
    }

    let directReports = '';
    if (queryParams.directReports === true) {
      directReports = `&directReports=true`;
    }

    if (queryParams.clientId) {
      userParams = `&clientId=${queryParams.clientId}`;
    }
    if (queryParams.projectId) {
      userParams = `&projectId=${queryParams.projectId}`;
    }

    if (queryParams.lookupList) {
      userParams = `&lookupList=true`;
    }

    if (queryParams.groupId) {
      userParams = `&groupId=${queryParams.groupId}`;
    }

    let staffParams = '';
    if (queryParams.staff === true) {
      staffParams = `&staff=true`;
    }

    let mapDataParams = '';
    if (queryParams.mapData === true) {
      mapDataParams = `&mapData=true`;
    }

    let statusParams = '';
    if (queryParams.status) {
      statusParams = `&status=${queryParams.status}`;
    }

    let metricsParams = '';
    if (queryParams.metrics === true) {
      metricsParams = `&metrics=true`;
    }

    if (queryParams.skip === undefined) {
      queryParams.skip = 0;
    }
    if (queryParams.take === undefined) {
      queryParams.take = 100;
    }

    return this.ensureAuthenticated(() =>
      this.http.get<QueryResult<T>>(
        `${url}?take=${queryParams.take}&skip=${queryParams.skip}${userParams}${allParams}${filterParams}${excludeMine}${tenantParams}${directReports}${staffParams}${mapDataParams}${statusParams}${metricsParams}`,
        {
          headers: this.getHeaders(),
        }
      )
    );
  }

  get<T>(
    endpoint: string,
    params?: HttpParams,
    options: any = {}
  ): Observable<any> {
    const url = this.getFullUrl(endpoint);
    return this.ensureAuthenticated(() =>
      this.http
        .get<T>(url, {
          headers: this.getHeaders(),
          params,
          ...options,
        })
        .pipe(catchError(this.handle401Error))
    );
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.ensureAuthenticated(() =>
      this.http
        .post<T>(url, body, {
          headers: this.getHeaders(),
        })
        .pipe(catchError(this.handle401Error))
    );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.ensureAuthenticated(() =>
      this.http
        .put<T>(url, body, {
          headers: this.getHeaders(),
        })
        .pipe(catchError(this.handle401Error))
    );
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.ensureAuthenticated(() =>
      this.http.patch<T>(`${this.apiUrl}/${path}`, body, {
        headers: this.getHeaders(),
      })
    );
  }

  delete<T>(endpoint: string): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.ensureAuthenticated(() =>
      this.http
        .delete<T>(url, {
          headers: this.getHeaders(),
        })
        .pipe(catchError(this.handle401Error))
    );
  }

  getText(endpoint: string, params?: HttpParams): Observable<string> {
    const url = this.getFullUrl(endpoint);
    return this.ensureAuthenticated(() =>
      this.http
        .get(url, {
          headers: this.getHeaders(),
          params,
          responseType: 'text',
        })
        .pipe(catchError(this.handle401Error))
    );
  }

  /**
   * Make an unauthenticated GET request (for public endpoints)
   */
  getUnauthenticated<T>(endpoint: string, params?: HttpParams): Observable<T> {
    const url = this.getFullUrl(endpoint);
    return this.http.get<T>(url, {
      params,
    });
  }
}
