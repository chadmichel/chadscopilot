import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

export interface StudentBadge {
  text: string;
  variant: 'danger' | 'warning' | 'success' | 'info' | 'purple' | 'neutral';
  tooltip?: string;
}

@Component({
  selector: 'app-student-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  template: `
    <div class="student-card" [class]="variantClass()">
      <div class="student-card__main">
        <!-- Position badge (waitlist) OR Avatar -->
        @if (position()) {
          <span class="student-card__position">{{ position() }}</span>
        } @else if (showAvatar()) {
          <div class="student-card__avatar">
            {{ avatarInitials() }}
          </div>
        }

        <!-- Info section -->
        <div class="student-card__info">
          <div class="student-card__name">
            {{ name() }}
            @for (badge of badges(); track badge.text) {
              <span
                class="badge badge--xs"
                [class.badge--danger]="badge.variant === 'danger'"
                [class.badge--warning]="badge.variant === 'warning'"
                [class.badge--success]="badge.variant === 'success'"
                [class.badge--info]="badge.variant === 'info'"
                [class.badge--purple]="badge.variant === 'purple'"
                [class.badge--neutral]="badge.variant === 'neutral'"
                [pTooltip]="badge.tooltip || ''"
              >
                {{ badge.text }}
              </span>
            }
          </div>
          @if (subtitle()) {
            <div class="student-card__subtitle" [class.student-card__subtitle--clickable]="subtitleClickable()" (click)="subtitleClickable() && onSubtitleClick.emit()">
              @if (subtitleIcon()) {
                <i [class]="'pi ' + subtitleIcon()"></i>
              }
              <span>{{ subtitle() }}</span>
              @if (subtitleClickable()) {
                <i class="pi pi-pencil student-card__edit-icon"></i>
              }
            </div>
          }
          @if (secondaryText()) {
            <div class="student-card__secondary">{{ secondaryText() }}</div>
          }
        </div>

        <!-- Actions -->
        <div class="student-card__actions">
          <ng-content select="[slot=actions]"></ng-content>
          @if (actionType() === 'add') {
            <button
              pButton
              type="button"
              icon="pi pi-plus"
              class="student-card__btn student-card__btn--add"
              [pTooltip]="actionTooltip()"
              [disabled]="actionDisabled()"
              (click)="onAction.emit()"
            ></button>
          } @else if (actionType() === 'remove') {
            <button
              pButton
              type="button"
              icon="pi pi-trash"
              class="student-card__btn student-card__btn--remove"
              [pTooltip]="actionTooltip()"
              [disabled]="actionDisabled()"
              (click)="onAction.emit()"
            ></button>
          }
        </div>
      </div>

      <!-- Expandable content (children, address picker, etc.) -->
      @if (hasContent) {
        <div class="student-card__content">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styleUrls: ['./student-card.component.scss'],
})
export class StudentCardComponent {
  // Identity
  name = input.required<string>();
  avatarInitials = input<string>('');
  showAvatar = input(true);
  position = input<number | null>(null); // For waitlist position

  // Badges (car seat, booster, today only, etc.)
  badges = input<StudentBadge[]>([]);

  // Subtitle (e.g., address for transportation)
  subtitle = input<string>('');
  subtitleIcon = input<string>(''); // e.g., 'pi-map-marker'
  subtitleClickable = input(false);

  // Secondary text (e.g., LL#, date)
  secondaryText = input<string>('');

  // Action button
  actionType = input<'add' | 'remove' | 'none'>('none');
  actionTooltip = input('');
  actionDisabled = input(false);

  // Variant for slight styling differences
  variant = input<'default' | 'transportation' | 'class' | 'childcare' | 'attendance'>('default');

  // Track if content is projected
  hasContent = true; // We'll always show content div, CSS handles empty state

  // Outputs
  onAction = output<void>();
  onSubtitleClick = output<void>();

  variantClass = computed(() => {
    const v = this.variant();
    return v !== 'default' ? `student-card--${v}` : '';
  });
}
