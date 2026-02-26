import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  of,
  tap,
  throwError,
  catchError,
  map,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import {
  AuthResponse,
  Profile,
  TenantInfo,
  AuthSetupResponse,
} from '../dto/auth.dto';
import { QueryResult } from '../components/common-dto/query.dto';
import { Router } from '@angular/router';
import {
  IPublicClientApplication,
  PublicClientApplication,
  BrowserCacheLocation,
  LogLevel,
  InteractionType,
} from '@azure/msal-browser';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly TOKEN_EXPIRES_KEY = 'token_expires';
  private readonly REFRESH_TOKEN_EXPIRES_KEY = 'refresh_token_expires';
  private readonly USERNAME_KEY = 'username';
  private readonly USER_ID_KEY = 'user_id';
  private readonly FIRST_NAME_KEY = 'first_name';
  private readonly LAST_NAME_KEY = 'last_name';
  private readonly EMAIL_KEY = 'email';
  private readonly PHONE_KEY = 'phone';
  private readonly ROLE_KEY = 'role';
  private readonly AVATAR_URL_KEY = 'avatar_url';
  private readonly AVATAR_BASE_64 = 'profilePhoto';
  private readonly TENANTS_KEY = 'tenants';
  private readonly TENANT_ID_KEY = 'tenant_id';
  private readonly TENANT_NAME_KEY = 'tenant_name';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(
    this.hasValidToken()
  );
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private baseUrl = environment.apiUrl;

  // Auth configuration from backend
  private authSetup: AuthSetupResponse | null = null;
  private authSetupLoaded = false;
  private redirectUri = `${window.location.origin}/auth`;

  // Default OAuth configuration (fallback)
  private msRedirectUri = `${window.location.origin}/authmicrosoft`;
  private msAuthEndpoint = '';

  // Add Cognito OAuth configuration
  private cognitoRedirectUri = `${window.location.origin}/authcognito`;
  private cognitoAuthEndpoint = `https://${environment.cognitoDomain}/oauth2/authorize`;

  // Add Google OAuth configuration
  private googleRedirectUri = `${window.location.origin}/authgoogle`;
  private googleAuthEndpoint = `https://accounts.google.com/o/oauth2/v2/auth`;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // Initialize authentication state
    this.isAuthenticatedSubject.next(this.hasValidToken());
  }

  /**
   * Get headers with tenant ID
   */
  private getHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {};

    // Add tenant ID from environment or current tenant
    const tenantId =
      environment.tenantId !== 'your-tenant-id'
        ? environment.tenantId
        : this.getCurrentTenant()?.id;
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  /**
   * Load auth configuration from backend
   */
  loadAuthSetup(): Observable<AuthSetupResponse> {
    if (this.authSetupLoaded && this.authSetup) {
      return of(this.authSetup);
    }

    return this.http
      .get<AuthSetupResponse>(`${this.baseUrl}/auth/setup`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((setup) => {
          this.authSetup = setup;
          this.authSetupLoaded = true;

          // Update OAuth endpoints with backend configuration
          if (setup.data.microsoftIntegration) {
            this.redirectUri =
              this.authSetup?.data.microsoftIntegration?.uri ?? '';
          }

          if (setup.data.googleIntegration) {
            this.googleRedirectUri = `${window.location.origin}/authgoogle`;
          }
        }),
        catchError((error) => {
          console.warn(
            'Failed to load auth setup from backend, using environment defaults:',
            error
          );
          throw error;
        })
      );
  }

  /**
   * Load auth configuration for a specific tenant
   */
  loadAuthSetupForTenant(tenantId: string): Observable<AuthSetupResponse> {
    return this.http
      .get<AuthSetupResponse>(`${this.baseUrl}/auth/setup/${tenantId}`)
      .pipe(
        tap((setup) => {
          this.authSetup = setup;
          this.authSetupLoaded = true;

          // Update OAuth endpoints with backend configuration
          if (setup.data.microsoftIntegration) {
            this.redirectUri =
              this.authSetup?.data.microsoftIntegration?.uri ?? '';
          }

          if (setup.data.googleIntegration) {
            this.googleRedirectUri = `${window.location.origin}/authgoogle`;
          }
        }),
        catchError((error) => {
          console.warn(
            'Failed to load auth setup for tenant from backend:',
            error
          );
          throw error;
        })
      );
  }

  /**
   * Get current auth setup configuration
   */
  getAuthSetup(): AuthSetupResponse | null {
    return this.authSetup;
  }

  /**
   * Check if auth setup is loaded
   */
  isAuthSetupLoaded(): boolean {
    return this.authSetupLoaded;
  }

  /**
   * Clear auth setup cache (useful when switching tenants)
   */
  clearAuthSetupCache(): void {
    this.authSetup = null;
    this.authSetupLoaded = false;
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;

    // Check if token is expired
    const expiresAt = localStorage.getItem(this.TOKEN_EXPIRES_KEY);
    if (expiresAt && new Date(expiresAt) < new Date()) {
      // Token expired, but we might be able to refresh it
      return !!localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    return true;
  }

  signin(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/signin`,
        {
          username,
          password,
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  private setSession(response: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, response.accessToken);

    // Store token expiration
    if (response.accessTokenExpiresAt) {
      localStorage.setItem(
        this.TOKEN_EXPIRES_KEY,
        response.accessTokenExpiresAt.toString()
      );
    }

    // Store refresh token and its expiration
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
      if (response.refreshTokenExpiresAt) {
        localStorage.setItem(
          this.REFRESH_TOKEN_EXPIRES_KEY,
          response.refreshTokenExpiresAt.toString()
        );
      }
    }

    localStorage.setItem(this.USER_ID_KEY, response.user.id);
    localStorage.setItem(this.USERNAME_KEY, response.user.username);
    localStorage.setItem(this.FIRST_NAME_KEY, response.user.firstName);
    localStorage.setItem(this.LAST_NAME_KEY, response.user.lastName);
    localStorage.setItem(this.EMAIL_KEY, response.user.email);
    localStorage.setItem(this.ROLE_KEY, response.user.role);

    localStorage.setItem(this.AVATAR_URL_KEY, this.getAvatarUrl());

    localStorage.setItem(
      this.TENANTS_KEY,
      JSON.stringify(response.user.tenants)
    );

    if (response.currentTenantId && response.currentTenantName) {
      localStorage.setItem(this.TENANT_ID_KEY, response.currentTenantId);
      localStorage.setItem(this.TENANT_NAME_KEY, response.currentTenantName);
    }
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRES_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_EXPIRES_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.FIRST_NAME_KEY);
    localStorage.removeItem(this.LAST_NAME_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.PHONE_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.AVATAR_URL_KEY);
    localStorage.removeItem(this.TENANTS_KEY);
    localStorage.removeItem(this.TENANT_ID_KEY);
    localStorage.removeItem(this.TENANT_NAME_KEY);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  getCurrentEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
  }

  getCurrentPhone(): string | null {
    return localStorage.getItem(this.PHONE_KEY);
  }

  getCurrentTenantId(): string | null {
    return localStorage.getItem(this.TENANT_ID_KEY);
  }

  getCurrentTenantName(): string | null {
    return localStorage.getItem(this.TENANT_NAME_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentProfile(): Profile | null {
    const firstName = localStorage.getItem(this.FIRST_NAME_KEY);
    const lastName = localStorage.getItem(this.LAST_NAME_KEY);
    const username = localStorage.getItem(this.USERNAME_KEY);
    const email = localStorage.getItem(this.EMAIL_KEY);

    return { firstName, lastName, username, email };
  }

  getUserInitials(): string {
    const firstName = localStorage.getItem(this.FIRST_NAME_KEY) || '';
    const lastName = localStorage.getItem(this.LAST_NAME_KEY) || '';

    if (!firstName && !lastName) {
      return '??';
    }

    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getAvatarUrl(): string {
    const firstName = localStorage.getItem(this.FIRST_NAME_KEY) || '';
    const lastName = localStorage.getItem(this.LAST_NAME_KEY) || '';
    const name = `${firstName}+${lastName}`;
    return `https://ui-avatars.com/api/?name=${name}`;
  }

  signup(credentials: {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    tenantName: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/signup`, credentials, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((response) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  selectTenant(tenant: TenantInfo) {
    localStorage.setItem(this.TENANT_ID_KEY, tenant.id);
    localStorage.setItem(this.TENANT_NAME_KEY, tenant.name);
  }

  getCurrentTenant(): TenantInfo | null {
    const id = localStorage.getItem(this.TENANT_ID_KEY);
    const name = localStorage.getItem(this.TENANT_NAME_KEY);
    return id && name ? { id, name } : null;
  }

  getUserId(): string {
    return localStorage.getItem(this.USER_ID_KEY) || '';
  }

  isAdmin(): boolean {
    return (
      localStorage.getItem(this.ROLE_KEY) === 'admin' ||
      localStorage.getItem(this.ROLE_KEY) === 'superadmin'
    );
  }

  handleUnauthorized() {
    console.log('handleUnauthorized');
    this.logout();
    this.router.navigate(['/auth']);
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(this.TOKEN_EXPIRES_KEY);
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  isRefreshTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(this.REFRESH_TOKEN_EXPIRES_KEY);
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.handleUnauthorized();
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.isRefreshTokenExpired()) {
      this.handleUnauthorized();
      return throwError(() => new Error('Refresh token expired'));
    }

    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/refresh`,
        {
          refreshToken: refreshToken,
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  codeChallenge: string = '';
  codeVerifier: string = '';

  async generatePkceCodes() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 43);

    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(this.codeVerifier)
    );
    this.codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    localStorage['code_verifier'] = this.codeVerifier;
    localStorage['code_challenge'] = this.codeChallenge;
  }

  async redirectToMicrosoftLogin() {
    await this.generatePkceCodes();

    if (!this.authSetupLoaded) {
      await this.loadAuthSetup().toPromise();
    }

    const clientId = this.authSetup?.data.microsoftIntegration?.extra1 || '';
    this.redirectUri = this.msRedirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid profile email User.Read',
      response_mode: 'query',
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${
      this.authSetup?.data.microsoftIntegration?.uri
    }?${params.toString()}`;
  }

  static lastMsCode = '';
  static lastMsLogin: Observable<AuthResponse> | undefined = undefined;

  loginWithMicrosoftCode(
    code: string,
    state: string
  ): Observable<AuthResponse> {
    if (AuthService.lastMsCode === code && AuthService.lastMsLogin) {
      return of({
        accessToken: '',
        accessTokenExpiresAt: new Date(),
        refreshToken: '',
        refreshTokenExpiresAt: new Date(),
        user: {
          id: '',
          username: '',
          firstName: '',
          lastName: '',
          email: '',
          role: '',
          tenants: [],
        },
        currentTenantId: '',
        currentTenantName: '',
      });
    }

    AuthService.lastMsCode = code;

    AuthService.lastMsLogin = this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/signinWithMs`,
        {
          code,
          redirectUri: this.msRedirectUri,
          state,
          codeVerifier: localStorage['code_verifier'],
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response: any) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );

    return AuthService.lastMsLogin;
  }

  async redirectToGoogleLogin() {
    await this.generatePkceCodes();

    if (!this.authSetupLoaded) {
      await this.loadAuthSetup().toPromise();
    }

    const clientId = this.authSetup?.data.googleIntegration?.extra1 || '';
    this.redirectUri = this.googleRedirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid profile email',
      response_mode: 'query',
      code_challenge: this.codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${this.googleAuthEndpoint}?${params.toString()}`;
  }

  static lastGoogleCode = '';
  static lastGoogleLogin: Observable<AuthResponse> | undefined = undefined;

  loginWithGoogleCode(code: string, state: string): Observable<AuthResponse> {
    if (AuthService.lastGoogleCode === code && AuthService.lastGoogleLogin) {
      return of({
        accessToken: '',
        accessTokenExpiresAt: new Date(),
        refreshToken: '',
        refreshTokenExpiresAt: new Date(),
        user: {
          id: '',
          username: '',
          firstName: '',
          lastName: '',
          email: '',
          role: '',
          tenants: [],
        },
        currentTenantId: '',
        currentTenantName: '',
      });
    }

    AuthService.lastGoogleCode = code;

    AuthService.lastGoogleLogin = this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/signinWithGoogle`,
        {
          code,
          redirectUri: this.googleRedirectUri,
          state,
          codeVerifier: localStorage['code_verifier'],
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response: any) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );

    return AuthService.lastGoogleLogin;
  }

  async redirectToCognitoLogin() {
    if (!this.authSetupLoaded) {
      await this.loadAuthSetup().toPromise();
    }

    const domain = environment.cognitoDomain;
    const clientId = environment.cognitoClientId;
    const scope = environment.cognitoScope;
    const redirectUri = environment.cognitoRedirectUri;

    const url = `https://${domain}/login?client_id=${clientId}&response_type=code&scope=${scope.join(
      '+'
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = url;
  }

  loginWithCognitoCode(code: string): Observable<AuthResponse> {
    const redirectUri = environment.cognitoRedirectUri;

    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/signin-with-cognito`,
        {
          code,
          redirectUri: redirectUri,
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  getAvatar(): string | null {
    return localStorage.getItem(this.AVATAR_BASE_64) || null;
  }

  setAvatar(avatarAsBase64: string) {
    localStorage.setItem(
      this.AVATAR_BASE_64,
      `data:image/svg+xml;base64,${avatarAsBase64}`
    );
    window.dispatchEvent(new Event('storage'));
  }

  /**
   * Authenticate with API key
   */
  signinWithApiKey(apiKey: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/signinwithapikey`,
        {
          apiKey,
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  /**
   * Authenticate with passcode
   */
  signinWithPasscode(passcode: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.baseUrl}/auth/signinwithpasscode`,
        {
          passcode,
        },
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response) => {
          this.setSession(response);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  /**
   * Get user's available tenants from local storage
   */
  getUserTenants(): TenantInfo[] {
    const tenantsJson = localStorage.getItem(this.TENANTS_KEY);
    if (tenantsJson) {
      try {
        return JSON.parse(tenantsJson);
      } catch {
        return [];
      }
    }
    return [];
  }
}
