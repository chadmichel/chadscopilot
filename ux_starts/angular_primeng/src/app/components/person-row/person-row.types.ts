/**
 * Person row component types
 * Shared between attendance and transportation pages
 */

import { Child } from '../../utils';

export type PersonRowVariant = 'attendance' | 'transportation';

export interface PersonRowData {
  id?: string;
  name: string;
  status?: string;
  notes?: string;
  updating?: boolean;
  // Transportation-specific
  address?: string;
  needsCarSeat?: boolean;
  needsBooster?: boolean;
  isTransitory?: boolean;
  // Children (transportation)
  children?: Child[];
  availableChildren?: Child[];
}

export interface PersonRowAction {
  icon: string;
  tooltip: string;
  actionType: string;
  variant: 'success' | 'danger' | 'warning';
  activeWhen?: string;
}

// Pre-defined action configurations
export const ATTENDANCE_ACTIONS: PersonRowAction[] = [
  { icon: 'pi pi-check', tooltip: 'Mark Present', actionType: 'Present', variant: 'success', activeWhen: 'Present' },
  { icon: 'pi pi-times', tooltip: 'Mark Absent', actionType: 'Absent', variant: 'danger', activeWhen: 'Absent' },
  { icon: 'pi pi-clock', tooltip: 'Mark Excused', actionType: 'Excused', variant: 'warning', activeWhen: 'Excused' },
];

export const TRANSPORTATION_ACTIONS: PersonRowAction[] = [
  { icon: 'pi pi-user-plus', tooltip: 'Mark on board', actionType: 'on-board', variant: 'success', activeWhen: 'on-board' },
  { icon: 'pi pi-user-minus', tooltip: 'Mark no-show', actionType: 'no-show', variant: 'danger', activeWhen: 'no-show' },
  { icon: 'pi pi-calendar-times', tooltip: 'Mark excused', actionType: 'excused', variant: 'warning', activeWhen: 'excused' },
];
