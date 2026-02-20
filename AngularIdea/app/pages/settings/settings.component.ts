import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { AppTheme, ThemeService } from '../../services/theme.service';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

type ThemePreview = {
  id: AppTheme;
  label: string;
  description: string;
  swatches: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, PageToolbarComponent],
  template: `
    <div class="settings-page">
      <pb-page-toolbar header="Preferences"></pb-page-toolbar>
      <p class="page-subtitle mb-4">
        Personalize your experience across devices.
      </p>

      <section class="settings-section">
        <div class="section-header">
          <div class="section-title">Theme</div>
          <div class="section-description">
            Preview and choose a theme. Your selection is saved locally.
          </div>
        </div>

        <div class="theme-grid">
          <p-card
            *ngFor="let t of themePreviews"
            styleClass="theme-card"
            [ngClass]="{ selected: t.id === currentTheme }"
          >
            <ng-template pTemplate="header">
              <div class="theme-card-header">
                <div class="theme-card-title">
                  <span>{{ t.label }}</span>
                  <p-tag
                    *ngIf="t.id === currentTheme"
                    value="Selected"
                    severity="success"
                  ></p-tag>
                </div>
                <button
                  pButton
                  type="button"
                  class="p-button-sm"
                  [label]="t.id === currentTheme ? 'Active' : 'Use'"
                  [icon]="t.id === currentTheme ? 'pi pi-check' : 'pi pi-palette'"
                  [outlined]="t.id === currentTheme"
                  (click)="selectTheme(t.id)"
                ></button>
              </div>
            </ng-template>

            <div class="theme-preview">
              <div class="swatches">
                <span class="swatch" [style.background]="t.swatches.primary"></span>
                <span class="swatch" [style.background]="t.swatches.background"></span>
                <span class="swatch" [style.background]="t.swatches.surface"></span>
                <span class="swatch" [style.background]="t.swatches.text"></span>
              </div>

              <div
                class="preview-surface"
                [style.background]="t.swatches.surface"
                [style.color]="t.swatches.text"
              >
                <div class="preview-row">
                  <span class="preview-pill" [style.background]="t.swatches.primary"></span>
                  <span class="preview-text">WhenIsDone</span>
                </div>
                <div class="preview-muted" [style.opacity]="0.75">
                  {{ t.description }}
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .settings-page {
        /* Align with the rest of the app: rely on app shell padding */
        max-width: none;
        margin: 0;
        padding: 0;
        background: transparent;
      }

      /* Uses global .page-header/.page-title/.page-subtitle */

      .settings-section {
        margin-top: 1.25rem;
      }

      .section-header {
        margin-bottom: 0.75rem;
      }

      .section-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--app-text);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      }

      .section-description {
        margin-top: 0.25rem;
        color: var(--app-text-muted);
      }

      .theme-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      @media (max-width: 768px) {
        .settings-page {
          padding: 0;
        }
        .theme-grid {
          grid-template-columns: 1fr;
        }
      }

      :host ::ng-deep .theme-card .p-card-body {
        padding-top: 0.75rem;
      }

      .theme-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 0.75rem 0;
        /* Improve readability over wallpaper backgrounds */
        background: color-mix(in srgb, var(--app-surface) 82%, transparent 18%);
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--app-border), transparent 40%);
        backdrop-filter: blur(10px) saturate(120%);
        -webkit-backdrop-filter: blur(10px) saturate(120%);
      }

      .theme-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 800;
        color: var(--app-text);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      }

      .theme-preview {
        display: grid;
        gap: 0.75rem;
      }

      .swatches {
        display: flex;
        gap: 0.35rem;
        align-items: center;
      }

      .swatch {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 1px solid rgba(0, 0, 0, 0.15);
      }

      .preview-surface {
        border-radius: 12px;
        padding: 0.75rem;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }

      .preview-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
      }

      .preview-pill {
        width: 14px;
        height: 14px;
        border-radius: 4px;
      }

      .preview-text {
        font-weight: 700;
      }

      .preview-muted {
        font-size: 0.9rem;
      }

      :host ::ng-deep .theme-card.selected {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
        border-radius: 12px;
      }
    `,
  ],
})
export class SettingsComponent implements OnInit, OnDestroy {
  currentTheme: AppTheme = 'light';
  private sub?: Subscription;

  themePreviews: ThemePreview[] = [
    {
      id: 'light',
      label: 'Light',
      description: 'Clean, bright, and fast.',
      swatches: {
        primary: '#0d9488',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#1e293b',
      },
    },
    {
      id: 'midnight',
      label: 'Midnight',
      description: 'Low-light focused dark theme.',
      swatches: {
        primary: '#8b5cf6',
        background: '#1a1a1a',
        surface: '#2d2d2d',
        text: '#e0e0e0',
      },
    },
    {
      id: 'arcade80s',
      label: '80s Arcade',
      description: 'Neon retro goodness.',
      swatches: {
        primary: '#ff4fd8',
        background: '#0b0616',
        surface: '#140a2a',
        text: '#fdf4ff',
      },
    },
    {
      id: 'grunge90s',
      label: '90s Grunge',
      description: 'Rugged, dark, and bold.',
      swatches: {
        primary: '#c08457',
        background: '#241a14',
        surface: '#2f221a',
        text: '#f3e9dc',
      },
    },
  ];

  constructor(private themeService: ThemeService) { }

  ngOnInit(): void {
    this.currentTheme = this.themeService.getTheme();
    this.sub = this.themeService.theme$.subscribe((t) => {
      this.currentTheme = t;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  selectTheme(theme: AppTheme): void {
    this.themeService.setTheme(theme);
  }
}

