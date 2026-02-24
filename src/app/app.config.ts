import { ApplicationConfig, provideZoneChangeDetection, Injectable } from '@angular/core';
import { provideRouter, withHashLocation, TitleStrategy, RouterStateSnapshot } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { routes } from './app.routes';

@Injectable({ providedIn: 'root' })
export class TemplatePageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title !== undefined) {
      this.title.setTitle(`What Is Done | ${title}`);
    } else {
      this.title.setTitle(`What Is Done`);
    }
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    { provide: TitleStrategy, useClass: TemplatePageTitleStrategy }
  ]
};
