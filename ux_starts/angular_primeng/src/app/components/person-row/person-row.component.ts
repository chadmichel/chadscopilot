import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
  PersonRowData,
  PersonRowVariant,
  PersonRowAction,
  ATTENDANCE_ACTIONS,
  TRANSPORTATION_ACTIONS,
} from './person-row.types';
import { getInitials, Child } from '../../utils';

@Component({
  selector: 'app-person-row',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  template: `
    <div class="person-card">
      <div class="person-row">
        <div class="person-avatar">{{ initials() }}</div>
        <div class="person-details">
          <div class="person-name-row">
            <span class="entity-name entity-name--sm">{{ person().name }}</span>
            <ng-container *ngIf="variant() === 'transportation'">
              <span *ngIf="person().isTransitory" class="badge badge--purple badge--xs" pTooltip="Today only">TODAY</span>
              <span *ngIf="person().needsCarSeat" class="badge badge--danger badge--xs" pTooltip="Needs Car Seat">CS</span>
              <span *ngIf="person().needsBooster" class="badge badge--warning badge--xs" pTooltip="Needs Booster">B</span>
            </ng-container>
          </div>
          <div class="person-address" *ngIf="person().address">
            <i class="pi pi-map-marker"></i>
            <span>{{ person().address }}</span>
          </div>
          <span class="notes" *ngIf="person().notes">{{ person().notes }}</span>
        </div>
        <span class="badge badge--xs" [ngClass]="statusBadgeClass()">
          {{ statusLabel() }}
        </span>
        <div class="status-actions">
          <button
            *ngFor="let action of actions()"
            pButton
            type="button"
            [icon]="action.icon"
            class="action-btn"
            [class.action-btn--success]="action.variant === 'success'"
            [class.action-btn--danger]="action.variant === 'danger'"
            [class.action-btn--warning]="action.variant === 'warning'"
            [class.active]="person().status === action.activeWhen"
            [pTooltip]="getTooltip(action)"
            tooltipPosition="top"
            [disabled]="person().updating"
            (click)="onActionClick(action.actionType)"
          ></button>
        </div>
      </div>
      <!-- Children inline - transportation only -->
      <div class="children-row" *ngIf="variant() === 'transportation' && hasAvailableChildren()">
        <span
          *ngFor="let child of person().availableChildren"
          class="chip chip--xs"
          [class.chip--assigned]="isChildAssigned(child)"
          [class.chip--unassigned]="!isChildAssigned(child)"
          (click)="onToggleChild(child)"
        >
          {{ child.name }}
          <span *ngIf="child.needsCarSeat" class="badge badge--xs badge--danger">CS</span>
          <span *ngIf="child.needsBooster" class="badge badge--xs badge--warning">B</span>
        </span>
      </div>
    </div>
  `,
  styleUrls: ['./person-row.component.scss'],
})
export class PersonRowComponent {
  person = input.required<PersonRowData>();
  variant = input<PersonRowVariant>('attendance');
  customActions = input<PersonRowAction[] | null>(null);

  actionClicked = output<string | null>();
  childToggled = output<{ child: Child; isAssigned: boolean }>();

  initials = computed(() => getInitials(this.person().name));

  hasAvailableChildren = computed(() => {
    const children = this.person().availableChildren;
    return children && children.length > 0;
  });

  private assignedChildIds = computed(() => {
    const children = this.person().children || [];
    return new Set(children.map(c => c.id));
  });

  actions = computed(() => {
    if (this.customActions()) {
      return this.customActions()!;
    }
    return this.variant() === 'attendance' ? ATTENDANCE_ACTIONS : TRANSPORTATION_ACTIONS;
  });

  statusBadgeClass = computed(() => {
    const status = this.person().status;
    const isAttendance = this.variant() === 'attendance';

    if (status === 'Present' || status === 'on-board') {
      return 'badge--success';
    }
    if (status === 'Absent' || status === 'no-show') {
      return 'badge--danger';
    }
    if (status === 'Excused' || status === 'excused') {
      return 'badge--warning';
    }
    return isAttendance ? 'badge--neutral' : 'badge--info';
  });

  statusLabel = computed(() => {
    const status = this.person().status;
    if (this.variant() === 'attendance') {
      return status || 'Unmarked';
    } else {
      switch (status) {
        case 'on-board':
          return 'On Board';
        case 'no-show':
          return 'No Show';
        case 'excused':
          return 'Excused';
        default:
          return 'Assigned';
      }
    }
  });

  onActionClick(actionType: string) {
    // Toggle behavior: if clicking the same status, clear it (emit null)
    const currentStatus = this.person().status;
    const isAttendance = this.variant() === 'attendance';

    // Check if this action matches the current status
    const isCurrentlyActive = currentStatus === actionType;

    if (isCurrentlyActive) {
      // Clear the status - emit the default state
      const defaultStatus = isAttendance ? 'Unmarked' : null;
      this.actionClicked.emit(defaultStatus);
    } else {
      this.actionClicked.emit(actionType);
    }
  }

  getTooltip(action: PersonRowAction): string {
    const isActive = this.person().status === action.activeWhen;
    if (isActive) {
      return this.variant() === 'attendance'
        ? `Clear ${action.activeWhen} status`
        : `Clear ${action.tooltip.replace('Mark ', '')} status`;
    }
    return action.tooltip;
  }

  isChildAssigned(child: Child): boolean {
    return this.assignedChildIds().has(child.id);
  }

  onToggleChild(child: Child) {
    const isAssigned = this.isChildAssigned(child);
    this.childToggled.emit({ child, isAssigned });
  }
}
