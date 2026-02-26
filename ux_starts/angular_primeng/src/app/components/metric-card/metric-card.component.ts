import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricVariant } from './metric-card.types';
import { BabyIconComponent, BusIconComponent } from '../icons';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, BabyIconComponent, BusIconComponent],
  template: `
    <div class="metric-card">
      <div class="metric-icon" [ngClass]="'icon-' + variant()">
        <app-baby-icon *ngIf="customIcon() === 'baby'" size="24"></app-baby-icon>
        <app-bus-icon *ngIf="customIcon() === 'bus'" size="24"></app-bus-icon>
        <i *ngIf="!customIcon()" [class]="icon()"></i>
      </div>
      <div class="metric-content">
        <span class="metric-value">{{ value() }}</span>
        <span class="metric-label">{{ label() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./metric-card.component.scss'],
})
export class MetricCardComponent {
  icon = input('pi pi-chart-bar');
  customIcon = input<'baby' | 'bus' | null>(null);
  value = input<number | string>(0);
  label = input('');
  variant = input<MetricVariant>('info');
}
