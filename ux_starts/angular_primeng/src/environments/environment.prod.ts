export const environment = {
  production: true,
  mock: false, // Indicates this is a production environment
  apiUrl: '/api/v1',
  baseUrl: '/',
  appName: 'Base App',
  version: '1.0.0',
  // Add any other production-specific configuration
  authConfig: {
    tokenExpiration: 3600, // seconds
    refreshThreshold: 300, // seconds before expiration to trigger refresh
  },
  caching: {
    defaultTTL: 300, // seconds
    longTTL: 3600, // seconds
  },

  // Tenant configuration
  tenantId: '',

  // Legacy Cognito auth config (optional)
  cognitoDomain: '',
  cognitoClientId: '',
  cognitoScope: ['email', 'openid'],
  cognitoRedirectUri: '',
};
