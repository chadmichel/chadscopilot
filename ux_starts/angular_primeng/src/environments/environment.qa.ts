export const environment = {
  production: false,
  mock: false, // Indicates this is a QA environment
  apiUrl: '/api/v1',
  baseUrl: '/',
  appName: 'Base App [QA]',
  version: '1.0.0-qa',
  // QA-specific configuration
  authConfig: {
    tokenExpiration: 3600, // seconds
    refreshThreshold: 300, // seconds before expiration to trigger refresh
  },
  caching: {
    defaultTTL: 120, // seconds
    longTTL: 600, // seconds
  },
  logLevel: 'info', // none, error, warn, info, debug
};
