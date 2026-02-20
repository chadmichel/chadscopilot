import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MenuItem } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
  public breadcrumbsSubject = new BehaviorSubject<MenuItem[]>([]);

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const root = this.activatedRoute.root;
        const breadcrumbs: MenuItem[] = [];
        this.buildBreadcrumbs(root, '', breadcrumbs);
        this.breadcrumbsSubject.next(breadcrumbs);
      });
  }

  private buildBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: MenuItem[] = []
  ) {
    const children = route.children;

    if (children.length === 0) {
      return;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url
        .map((segment) => segment.path)
        .join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const data = child.snapshot.data;
      if (data['title']) {
        breadcrumbs.push({
          label: data['title'],
          routerLink: url,
          icon: data['icon'],
        });
      }

      // If there's a breadcrumb array in the route data, use it instead
      if (data['breadcrumb']) {
        const customBreadcrumbs = data['breadcrumb'].map((item: any) => ({
          ...item,
          routerLink: this.resolvePath(item.routerLink, child.snapshot.params),
        }));
        breadcrumbs.splice(0, breadcrumbs.length);
        breadcrumbs.push(...customBreadcrumbs);
      }

      this.buildBreadcrumbs(child, url, breadcrumbs);
    }
  }

  private resolvePath(routerLink: any[], params: any): string {
    if (!routerLink) {
      return '';
    }
    return routerLink
      .map((segment) => {
        if (typeof segment === 'string' && segment.startsWith(':')) {
          return params[segment.substring(1)];
        }
        return segment;
      })
      .join('/');
  }

  updateLastBreadcrumbLabel(label: string) {
    const current = this.breadcrumbsSubject.value;
    if (current.length > 0) {
      current[current.length - 1].label = label;
      this.breadcrumbsSubject.next(current);
    }
  }

  public setHome(home: MenuItem) {
    const current = this.breadcrumbsSubject.value;
    if (current.length > 0 && current[0].icon === 'pi pi-home') {
      current[0] = home;
    } else {
      current.unshift(home);
    }
    this.breadcrumbsSubject.next(current);
  }
}
