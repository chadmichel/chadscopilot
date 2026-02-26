import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ButtonModule],
  template: `
    <div class="home">
      <p-card header="Home" subheader="Base starter">
        <p class="muted">
          This is a minimal starter with Auth + a Todo list demo.
        </p>

        <div class="actions">
          <a pButton label="Open Todo List" icon="pi pi-check-square" routerLink="/todo"></a>
          <a pButton label="Sign in" icon="pi pi-sign-in" severity="secondary" routerLink="/auth"></a>
        </div>

        <div class="status" *ngIf="authService.isLoggedIn()">
          Signed in as <strong>{{ authService.getUsername() }}</strong>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      .home {
        max-width: 720px;
        margin: 2rem auto;
      }

      .muted {
        color: var(--app-muted);
        margin: 0 0 1rem;
      }

      .actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.75rem;
      }

      .status {
        margin-top: 1rem;
        color: var(--app-text);
      }
    `,
  ],
})
export class HomeComponent {
  constructor(public authService: AuthService) {}
}
