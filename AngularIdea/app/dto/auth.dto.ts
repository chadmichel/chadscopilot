export interface TenantInfo {
  id: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    tenants: TenantInfo[];
  };
  currentTenantId: string;
  currentTenantName: string;
}

export interface TenantInfoExtended {
  id: string;
  name: string;
  code?: string;
  hostname?: string;
  source?: string;
  // Auth settings
  allowSelfSignup?: boolean;
}

export interface IntegrationInfo {
  id: string;
  name: string;
  type: string;
  uri: string;
  extra1: string;
  extra2: string;
}

export interface EnvironmentInfo {
  nodeEnv: string;
  hostname: string;
}

export type AuthMethod = 'passcode' | 'microsoft' | 'google' | 'cognito' | 'apikey' | 'password';

export interface AuthSetupResponse {
  success: boolean;
  message: string;
  data: {
    tenant: TenantInfoExtended;
    // Auth methods available for this tenant
    authMethods?: AuthMethod[];
    // Legacy integration objects (may still be used)
    microsoftIntegration?: IntegrationInfo;
    googleIntegration?: IntegrationInfo;
    passcodeIntegration?: IntegrationInfo;
    environment: EnvironmentInfo;
    // Signup settings
    allowSelfSignup?: boolean;
  };
}

export interface Profile {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
}
