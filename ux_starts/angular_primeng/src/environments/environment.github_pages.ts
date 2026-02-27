export const environment = {
  production: false,
  mock: true, // Indicates this is a mock environment for GitHub Pages
  apiUrl: '/api/v1',
  baseUrl: '/',
  appName: 'Base App [GitHub Pages]',
  version: '1.0.0-github-pages',
  // Add GitHub Pages-specific configuration
  authConfig: {
    tokenExpiration: 3600, // seconds
    refreshThreshold: 300, // seconds before expiration to trigger refresh
    useMockAuth: true, // Flag to use mock authentication
  },
  caching: {
    defaultTTL: 60, // seconds
    longTTL: 300, // seconds
  },
  logLevel: 'debug', // none, error, warn, info, debug

  // Tenant configuration
  tenantId: '',

  // Legacy Cognito auth config (optional)
  cognitoDomain: '',
  cognitoClientId: '',
  cognitoScope: ['email', 'openid'],
  cognitoRedirectUri: '',
};

// For easier debugging in development mode
import 'zone.js/plugins/zone-error';
