import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

async function bootstrap() {
  // Start MSW in mock mode
  if (environment.mock) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn about unhandled requests (static assets, etc.)
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('[MSW] Mock Service Worker started');
  }

  bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
}

bootstrap();
