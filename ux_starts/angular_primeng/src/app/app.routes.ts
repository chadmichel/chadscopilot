import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';

import { authGuard } from './guards/auth.guard';
import { TodoListComponent } from './pages/todo/todo-list.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'todo',
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
  { path: '**', redirectTo: 'todo' },
];
