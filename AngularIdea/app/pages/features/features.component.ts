import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="features-container">
      <!-- Header Section -->
      <div class="features-header">
        <div class="header-content">
          <h1>WhenIsDone</h1>
          <p class="header-subtitle">
            A multi-tenant task tracking system with boards, projects, and optional GitHub/Azure DevOps sync.
          </p>
          <div class="header-actions">
            <a routerLink="/auth" class="cta-button primary">Sign In</a>
            <a routerLink="/signup" class="cta-button secondary">Create Account</a>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="features-grid">
        <!-- Boards -->
        <div class="feature-card">
          <div class="feature-icon">
            <i class="pi pi-th-large"></i>
          </div>
          <h3>Boards</h3>
          <p class="feature-description">
            A simple, opinionated workflow: Backlog → OnDeck → InProcess → Complete.
            Drag/drop and ordering are designed to feel instant (cache-first UI).
          </p>
          <ul class="feature-benefits">
            <li>All board (system) + user boards (Work/Home/etc.)</li>
            <li>Fast navigation via cached data</li>
            <li>Filters for assignee, tags, and external links (planned)</li>
          </ul>
        </div>

        <!-- Projects -->
        <div class="feature-card">
          <div class="feature-icon">
            <i class="pi pi-briefcase"></i>
          </div>
          <h3>Projects</h3>
          <p class="feature-description">
            Projects are the container for tasks and the place where integrations and sync rules live.
          </p>
          <ul class="feature-benefits">
            <li>Project lifecycle: Backlog / OnDeck / InProcess / Done</li>
            <li>Per-project external mappings (planned)</li>
          </ul>
        </div>

        <!-- Integrations -->
        <div class="feature-card">
          <div class="feature-icon">
            <i class="pi pi-sliders-h"></i>
          </div>
          <h3>Integrations</h3>
          <p class="feature-description">
            Optional sync with external tools to keep your source-of-truth flexible.
          </p>
          <ul class="feature-benefits">
            <li>GitHub Issues/PR links (planned)</li>
            <li>Azure DevOps work item links (planned)</li>
            <li>Status mapping + sync direction per project (planned)</li>
          </ul>
        </div>
      </div>

      <!-- Additional Features Section -->
      <div class="additional-features">
        <h2>Additional Capabilities</h2>
        <div class="capabilities-grid">
          <div class="capability-item">
            <i class="pi pi-cloud-download"></i>
            <h4>Offline-first caching</h4>
            <p>
              Render from cache instantly, reconcile in the background (planned TanStack Query layer).
            </p>
          </div>
          <div class="capability-item">
            <i class="pi pi-comments"></i>
            <h4>AI Agent</h4>
            <p>
              Natural language navigation and quick operations as task tools come online.
            </p>
          </div>
          <div class="capability-item">
            <i class="pi pi-shield"></i>
            <h4>Multi-tenant</h4>
            <p>
              An active tenant scopes what projects/boards/tasks you can see.
            </p>
          </div>
          <div class="capability-item">
            <i class="pi pi-mobile"></i>
            <h4>Mobile Responsive</h4>
            <p>
              Sidebar collapses on smaller screens; board/task UX will adapt (drawer vs full page).
            </p>
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>
          Sign in and start from your All board.
        </p>
        <div class="cta-buttons">
          <a routerLink="/auth" class="cta-button primary large">Sign In</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .features-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .features-header {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 80px 20px;
        text-align: center;
        color: white;
      }

      .header-content {
        max-width: 800px;
        margin: 0 auto;
      }

      .features-header h1 {
        font-size: 3.5rem;
        font-weight: 700;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .header-subtitle {
        font-size: 1.3rem;
        margin-bottom: 40px;
        opacity: 0.9;
        line-height: 1.6;
      }

      .header-actions {
        display: flex;
        gap: 20px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .cta-button {
        padding: 15px 30px;
        border-radius: 30px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .cta-button.primary {
        background: white;
        color: #667eea;
        border: 2px solid white;
      }

      .cta-button.primary:hover {
        background: transparent;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }

      .cta-button.secondary {
        background: transparent;
        color: white;
        border: 2px solid white;
      }

      .cta-button.secondary:hover {
        background: white;
        color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }

      .cta-button.large {
        padding: 18px 35px;
        font-size: 1.2rem;
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 40px;
        padding: 80px 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .feature-card {
        background: white;
        border-radius: 20px;
        padding: 40px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .feature-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea, #764ba2);
      }

      .feature-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      }

      .feature-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 30px;
        color: white;
        font-size: 2rem;
      }

      .feature-card h3 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #333;
        margin-bottom: 20px;
      }

      .feature-description {
        font-size: 1.1rem;
        color: #666;
        line-height: 1.7;
        margin-bottom: 25px;
      }

      .feature-benefits {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .feature-benefits li {
        padding: 8px 0;
        color: #555;
        position: relative;
        padding-left: 25px;
      }

      .feature-benefits li::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: #667eea;
        font-weight: bold;
        font-size: 1.1rem;
      }

      .additional-features {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        padding: 80px 20px;
        text-align: center;
      }

      .additional-features h2 {
        color: white;
        font-size: 2.5rem;
        margin-bottom: 50px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .capabilities-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 30px;
        max-width: 1000px;
        margin: 0 auto;
      }

      .capability-item {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 30px;
        color: white;
        transition: all 0.3s ease;
      }

      .capability-item:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-5px);
      }

      .capability-item i {
        font-size: 2.5rem;
        color: #fff;
        margin-bottom: 20px;
        display: block;
      }

      .capability-item h4 {
        font-size: 1.3rem;
        margin-bottom: 15px;
        font-weight: 600;
      }

      .capability-item p {
        opacity: 0.9;
        line-height: 1.6;
      }

      .cta-section {
        background: white;
        padding: 80px 20px;
        text-align: center;
      }

      .cta-section h2 {
        font-size: 2.5rem;
        color: #333;
        margin-bottom: 20px;
      }

      .cta-section p {
        font-size: 1.2rem;
        color: #666;
        margin-bottom: 40px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      .cta-buttons {
        display: flex;
        gap: 20px;
        justify-content: center;
        flex-wrap: wrap;
      }

      @media (max-width: 768px) {
        .features-header h1 {
          font-size: 2.5rem;
        }

        .header-subtitle {
          font-size: 1.1rem;
        }

        .features-grid {
          grid-template-columns: 1fr;
          padding: 40px 20px;
        }

        .feature-card {
          padding: 30px;
        }

        .header-actions {
          flex-direction: column;
          align-items: center;
        }

        .cta-buttons {
          flex-direction: column;
          align-items: center;
        }
      }
    `,
  ],
})
export class FeaturesComponent {}
