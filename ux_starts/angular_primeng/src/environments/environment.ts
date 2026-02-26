export const environment = {
  production: false,
  mock: false, // Indicates this is a production environment
  apiUrl: 'http://localhost:7022/api/v1',
  baseUrl: '/',
  appName: 'Base App [DEV]',
  version: '1.0.0-dev',
  // Add development-specific configuration
  authConfig: {
    tokenExpiration: 3600, // seconds
    refreshThreshold: 300, // seconds before expiration to trigger refresh
  },
  caching: {
    defaultTTL: 60, // seconds
    longTTL: 300, // seconds
  },

  logLevel: 'debug', // none, error, warn, info, debug
};

// For easier debugging in development mode
import 'zone.js/plugins/zone-error';
