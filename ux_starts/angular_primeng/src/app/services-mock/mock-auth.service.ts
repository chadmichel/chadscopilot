import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AuthResponse, Profile, TenantInfo } from '../dto/auth.dto';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class MockAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly TOKEN_EXPIRES_KEY = 'token_expires';
  private readonly REFRESH_TOKEN_EXPIRES_KEY = 'refresh_token_expires';
  private readonly USERNAME_KEY = 'username';
  private readonly USER_ID_KEY = 'user_id';
  private readonly AVATAR_BASE_64 = 'profilePhoto';
  private readonly FIRST_NAME_KEY = 'first_name';
  private readonly LAST_NAME_KEY = 'last_name';
  private readonly EMAIL_KEY = 'email';
  private readonly PHONE_KEY = 'phone';
  private readonly ROLE_KEY = 'role';
  private readonly AVATAR_URL_KEY = 'avatar_url';
  private readonly TENANTS_KEY = 'tenants';
  private readonly TENANT_ID_KEY = 'tenant_id';
  private readonly TENANT_NAME_KEY = 'tenant_name';

  // Always authenticated in mock service
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(true);
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Mock user data
  private mockUser = {
    id: 'mock-user-id',
    username: 'bsmith@dontpaniclabs.com',
    firstName: 'bob',
    lastName: 'smith',
    email: 'bsmith@dontpaniclabs.com',
    role: 'admin',
    tenants: [{ id: 'default-tenant-id', name: 'default' }],
  };

  // Mock token data
  private mockToken = 'mock-jwt-token';
  private mockRefreshToken = 'mock-refresh-token';
  private mockTokenExpiry = new Date(Date.now() + 3600 * 1000).toString();
  private mockRefreshTokenExpiry = new Date(Date.now() + 86400 * 1000).toString();

  constructor(private router: Router) {
    this.setupMockAuth();
  }

  private setupMockAuth(): void {
    localStorage.setItem(this.TOKEN_KEY, this.mockToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, this.mockRefreshToken);
    localStorage.setItem(this.TOKEN_EXPIRES_KEY, this.mockTokenExpiry);
    localStorage.setItem(this.REFRESH_TOKEN_EXPIRES_KEY, this.mockRefreshTokenExpiry);
    localStorage.setItem(this.USER_ID_KEY, this.mockUser.id);
    localStorage.setItem(this.USERNAME_KEY, this.mockUser.username);
    localStorage.setItem(this.FIRST_NAME_KEY, this.mockUser.firstName);
    localStorage.setItem(this.LAST_NAME_KEY, this.mockUser.lastName);
    localStorage.setItem(this.EMAIL_KEY, this.mockUser.email);
    localStorage.setItem(this.ROLE_KEY, this.mockUser.role);
    localStorage.setItem(this.AVATAR_URL_KEY, this.getAvatarUrl());
    localStorage.setItem(this.TENANTS_KEY, JSON.stringify(this.mockUser.tenants));
    localStorage.setItem(this.TENANT_ID_KEY, this.mockUser.tenants[0].id);
    localStorage.setItem(this.TENANT_NAME_KEY, this.mockUser.tenants[0].name);
  }

  private hasValidToken(): boolean {
    return true;
  }

  signin(username: string, password: string): Observable<AuthResponse> {
    return of(this.getMockAuthResponse());
  }

  private getMockAuthResponse(): AuthResponse {
    return {
      accessToken: this.mockToken,
      accessTokenExpiresAt: new Date(this.mockTokenExpiry),
      refreshToken: this.mockRefreshToken,
      refreshTokenExpiresAt: new Date(this.mockRefreshTokenExpiry),
      user: this.mockUser,
      currentTenantId: 'mock-tenant-id',
      currentTenantName: 'mock-tenant-name',
    };
  }

  logout() {
    localStorage.clear();
    this.setupMockAuth();
  }

  getToken(): string {
    return this.mockToken;
  }

  getUsername(): string {
    return this.mockUser.username;
  }

  isLoggedIn(): boolean {
    return true;
  }

  getCurrentProfile(): Profile {
    return {
      firstName: this.mockUser.firstName,
      lastName: this.mockUser.lastName,
      username: this.mockUser.username,
      email: this.mockUser.email,
    };
  }

  getUserInitials(): string {
    return `${this.mockUser.firstName.charAt(0)}${this.mockUser.lastName.charAt(0)}`.toUpperCase();
  }

  getAvatarUrl(): string {
    const firstName = this.mockUser.firstName;
    const lastName = this.mockUser.lastName;
    const name = `${firstName}+${lastName}`;
    return `https://ui-avatars.com/api/?name=${name}`;
  }

  signup(credentials: any): Observable<AuthResponse> {
    return of(this.getMockAuthResponse());
  }

  selectTenant(tenant: TenantInfo) {
    localStorage.setItem(this.TENANT_ID_KEY, tenant.id);
    localStorage.setItem(this.TENANT_NAME_KEY, tenant.name);
  }

  getCurrentTenant(): TenantInfo {
    return this.mockUser.tenants[0];
  }

  getUserId(): string {
    return this.mockUser.id;
  }

  isAdmin(): boolean {
    return this.mockUser.role === 'admin';
  }

  handleUnauthorized() {
    console.log('MockAuth: handleUnauthorized called, but staying logged in');
  }

  isTokenExpired(): boolean {
    return false;
  }

  isRefreshTokenExpired(): boolean {
    return false;
  }

  getRefreshToken(): string {
    return this.mockRefreshToken;
  }

  refreshToken(): Observable<AuthResponse> {
    return of(this.getMockAuthResponse());
  }

  async generatePkceCodes() {
    console.log('MockAuth: generatePkceCodes called');
  }

  async redirectToMicrosoftLogin() {
    console.log('MockAuth: redirectToMicrosoftLogin called');
    this.isAuthenticatedSubject.next(true);
  }

  loginWithMicrosoftCode(code: string, state: string): Observable<AuthResponse> {
    return of(this.getMockAuthResponse());
  }

  redirectToCognitoLogin() {
    console.log('MockAuth: redirectToCognitoLogin called');
    this.isAuthenticatedSubject.next(true);
  }

  loginWithCognitoCode(code: string): Observable<AuthResponse> {
    return of(this.getMockAuthResponse());
  }

  getAvatar(): string | null {
    return localStorage.getItem(this.AVATAR_BASE_64) || null;
  }

  setAvatar(avatarAsBase64: string) {
    localStorage.setItem(this.AVATAR_BASE_64, `data:image/svg+xml;base64,${avatarAsBase64}`);
    window.dispatchEvent(new Event('storage'));
  }

  getUserTenants(): TenantInfo[] {
    return this.mockUser.tenants;
  }
}
