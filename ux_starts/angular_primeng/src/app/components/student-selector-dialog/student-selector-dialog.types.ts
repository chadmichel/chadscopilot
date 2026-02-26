/**
 * Student selector dialog types
 * Used for managing students with optional children
 * for transportation, classes, childcare, etc.
 */

import { Child } from '../../utils/child-utils';

// ===========================================
// ADDRESS TYPES
// ===========================================

export interface StudentAddress {
  id: string;
  nickname: string; // e.g., "Home", "Work", "Church"
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  isDefault?: boolean;
}

// ===========================================
// STUDENT OPTION (for Add tab)
// ===========================================

export interface StudentOption {
  label: string;
  value: string; // ID
  llNumber?: string;
  children?: Child[];
  addresses?: StudentAddress[];
}

// ===========================================
// STUDENT SELECTION (emitted when adding)
// ===========================================

export interface StudentSelection {
  studentId: string;
  studentName: string;
  selectedChildren: Child[];
  totalSeats: number;
  isTransitory?: boolean;
  addressId?: string;
  address?: string;
}

// ===========================================
// ASSIGNED STUDENT (for Manage tab)
// ===========================================

export interface AssignedStudent {
  id: string;
  studentId: string;
  studentName?: string;
  llNumber?: string;
  needsCarSeat?: boolean;
  needsBooster?: boolean;
  isTransitory?: boolean;
  transitoryDate?: string;
  requestDate?: string; // For waitlist items
  children?: Child[];
  availableChildren?: Child[]; // All children available for this student
  addressId?: string;
  address?: string;
  addresses?: StudentAddress[];
}

// ===========================================
// EVENTS
// ===========================================

export interface ChildActionEvent {
  student: AssignedStudent;
  child: Child;
}

export interface AddressChangeEvent {
  student: AssignedStudent;
  newAddressId: string;
  newAddress: string;
}

// ===========================================
// CONFIG
// ===========================================

/**
 * Dialog variants - determines behavior:
 * - transportation: children in accordion + address picker
 * - childcare: children shown directly (no accordion)
 * - class: no children, no address
 * - attendance: no children, no address
 */
export type DialogVariant = 'transportation' | 'class' | 'childcare' | 'attendance';

export interface DialogLabels {
  manageTabHeader?: string;
  addTabHeader?: string;
  emptyMessage?: string;
  removeTooltip?: string;
  searchPlaceholder?: string;
}

export interface StudentSelectorConfig {
  variant: DialogVariant;
  title: string;
  excludeStudentIds?: string[];
  showChildrenCheckboxes?: boolean;
  capacityInfo?: {
    available: number;
    total: number;
  };
  allowTransitory?: boolean;
  isViewingToday?: boolean;
  labels?: DialogLabels;
  requireAddress?: boolean;
}

// ===========================================
// CONTENT PROJECTION CONTEXTS
// ===========================================

/**
 * Context passed to the childrenDisplay content projection template
 */
export interface AssignedStudentContext {
  $implicit: AssignedStudent;
  student: AssignedStudent;
  assignedChildren: Child[];
  availableChildren: Child[];
  onAddChild: (child: Child) => void;
  onRemoveChild: (child: Child) => void;
}

/**
 * Context passed to the childrenSelector content projection template
 */
export interface StudentOptionContext {
  $implicit: StudentOption;
  student: StudentOption;
  children: Child[];
}
