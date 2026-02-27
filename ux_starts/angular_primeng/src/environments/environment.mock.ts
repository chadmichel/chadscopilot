export const environment = {
  production: false,
  mock: true, // Indicates this is a mock environment
  // Use relative URL so MSW can intercept requests (MSW runs in browser, same origin)
  apiUrl: '/api/v1',
  baseUrl: '/',
  appName: 'Base App [MOCK]',
  version: '1.0.0-mock',

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
