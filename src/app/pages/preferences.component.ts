import { Component } from '@angular/core';

@Component({
  selector: 'app-preferences',
  standalone: true,
  template: `
    <div class="page">
      <h2>Preferences</h2>
      <p>Application preferences coming soon.</p>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 32px;
        color: #d4d4d4;
      }
      h2 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      p {
        color: #888;
        font-size: 14px;
      }
    `,
  ],
})
export class PreferencesComponent {}
