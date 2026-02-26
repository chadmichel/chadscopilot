import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-capacity-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seats-badge">
      <span>{{ display() }} {{ label() }}</span>
      <div class="seats-bar">
        <div
          class="seats-fill"
          [class.warning]="statusClass() === 'warning'"
          [class.full]="statusClass() === 'full'"
          [style.width.%]="percent()"
        ></div>
      </div>
    </div>
  `,
})
export class CapacityBadgeComponent {
  current = input.required<number>();
  max = input.required<number>();
  label = input<string>('seats');

  display = computed(() => `${this.current()}/${this.max()}`);

  percent = computed(() => {
    const max = this.max();
    return max > 0 ? Math.min((this.current() / max) * 100, 100) : 0;
  });

  statusClass = computed(() => {
    const pct = this.percent();
    if (pct >= 100) return 'full';
    if (pct >= 75) return 'warning';
    return '';
  });
}
