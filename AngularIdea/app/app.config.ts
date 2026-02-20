import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient } from '@angular/common/http';
import Aura from '@primeng/themes/aura';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';
import { MockAuthService } from './services-mock/mock-auth.service';
import { AgentService } from './services/agent.service';
import { MockAgentService } from './services-mock/mock-agent.service';
import { AccountService } from './services/account.service';
import { TenantService } from './services/tenant.service';
import { SettingsService } from './services/settings.service';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { LocalStoreService } from './services/local-store.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // 24h
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function initLocalStoreHydration(localStore: LocalStoreService) {
  return async () => {
    await localStore.hydrateFromIndexedDb();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false || 'none',
        },
      },
    }),
    BrowserAnimationsModule,
    provideHttpClient(),
    ...provideTanStackQuery(queryClient),
    {
      provide: APP_INITIALIZER,
      useFactory: initLocalStoreHydration,
      deps: [LocalStoreService],
      multi: true,
    },

    // AuthService still uses class-based mocking (requires special handling for auth state)
    {
      provide: AuthService,
      useClass: environment.mock ? MockAuthService : AuthService,
    },

    // AgentService uses class-based mocking for WebSocket functionality
    {
      provide: AgentService,
      useClass: environment.mock ? MockAgentService : AgentService,
    },

    // Core services
    AccountService,
    TenantService,
    SettingsService,
  ],
};
