import { Component } from '@angular/core';

@Component({
  selector: 'app-projects',
  standalone: true,
  template: `
    <div class="page">
      <h2>Projects</h2>
      <p>Project management coming soon.</p>
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
export class ProjectsComponent {}
