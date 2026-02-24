import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, AppTheme } from '../services/theme.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      
      <section class="settings-section">
        <h3>Theme</h3>
        <p>Choose your preferred interface style.</p>
        
        <div class="theme-grid">
          <div 
            *ngFor="let theme of themes" 
            class="theme-card" 
            [class.active]="currentTheme === theme.id"
            (click)="setTheme(theme.id)"
          >
            <div class="theme-preview" [style.background]="theme.bg">
              <div class="theme-accent" [style.background]="theme.accent"></div>
            </div>
            <div class="theme-label">{{ theme.label }}</div>
            <div class="check-mark" *ngIf="currentTheme === theme.id">
              <span class="dot"></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 32px;
        color: var(--app-text);
      }
      h2 {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 32px;
      }
      h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--app-text);
      }
      p {
        color: var(--app-text-muted);
        font-size: 14px;
        margin-bottom: 24px;
      }
      
      .theme-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 20px;
        max-width: 800px;
      }
      
      .theme-card {
        cursor: pointer;
        padding: 12px;
        background: var(--app-surface);
        border: 2px solid var(--app-border);
        border-radius: 12px;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .theme-card:hover {
        border-color: var(--theme-primary);
        transform: translateY(-2px);
      }
      
      .theme-card.active {
        border-color: var(--theme-primary);
        background: color-mix(in srgb, var(--theme-primary), transparent 95%);
      }
      
      .theme-preview {
        height: 80px;
        border-radius: 8px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--app-border);
      }
      
      .theme-accent {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      
      .theme-label {
        font-weight: 600;
        font-size: 14px;
        text-align: center;
      }

      .check-mark {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 20px;
        height: 20px;
        background: var(--theme-primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--app-background);
      }

      .check-mark .dot {
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
      }
    `,
  ],
})
export class PreferencesComponent implements OnInit {
  currentTheme: AppTheme = 'midnight';

  themes = [
    { id: 'light', label: 'Light', bg: '#f8fafc', accent: '#0d9488' },
    { id: 'midnight', label: 'Midnight', bg: '#1a1a1a', accent: '#8b5cf6' },
    { id: 'arcade80s', label: '80s Arcade', bg: '#0b0616', accent: '#ff4fd8' },
    { id: 'grunge90s', label: '90s Grunge', bg: '#241a14', accent: '#c08457' }
  ];

  constructor(private themeService: ThemeService) { }

  ngOnInit() {
    this.currentTheme = this.themeService.getTheme();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  setTheme(theme: string) {
    this.themeService.setTheme(theme as AppTheme);
  }
}
