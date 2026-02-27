import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';

import { authGuard } from './guards/auth.guard';
import { TodoListComponent } from './pages/todo/todo-list.component';
import { LandingComponent } from './pages/landing/landing.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    pathMatch: 'full',
  },

  { path: 'auth', component: AuthComponent, title: 'Sign In' },
  {
    path: 'todo',
    component: TodoListComponent,
    canActivate: [authGuard],
    title: 'Todo List',
    data: {
      title: 'Todo List',
      icon: 'pi pi-check-square',
      breadcrumb: [
        {
          label: 'Todo',
          routerLink: ['/todo'],
          icon: 'pi pi-check-square',
        },
      ],
    },
  },
  { path: '**', component: LandingComponent },
];
