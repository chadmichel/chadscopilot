/**
 * Child-related utility functions for transportation and childcare features
 */

// Day of week enum for enrollment
export enum DayOfWeek {
  Sunday = 'sunday',
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
}

export interface ChildNeeds {
  needsCarSeat: boolean;
  needsBooster: boolean;
}

export interface Child {
  id: string;
  name: string;
  age?: number;
  needsCarSeat?: boolean;
  needsBooster?: boolean;
  selected?: boolean;
  enrolledDays?: DayOfWeek[]; // Days child is enrolled
  enrollmentId?: string; // Enrollment record ID (for childcare)
}

/**
 * Determine car seat/booster needs based on age
 * - Age <= 4: needs car seat
 * - Age 5-7: needs booster
 * - Age > 7: no special seat needed
 */
export function determineChildNeeds(age: number): ChildNeeds {
  return {
    needsCarSeat: age <= 4,
    needsBooster: age > 4 && age <= 7,
  };
}

/**
 * Calculate aggregate car seat/booster needs from a list of children
 * @param children Array of children with needsCarSeat/needsBooster flags
 * @returns Object indicating if any child needs car seat or booster
 */
export function calculateChildNeeds(children?: Child[]): ChildNeeds {
  if (!children || children.length === 0) {
    return { needsCarSeat: false, needsBooster: false };
  }
  return {
    needsCarSeat: children.some((c) => c.needsCarSeat),
    needsBooster: children.some((c) => c.needsBooster),
  };
}

/**
 * Get children that are available to add (not already assigned)
 * @param studentId The parent student ID
 * @param assignedChildren Children already assigned to this item
 * @param allChildrenByParent Map of all children keyed by parent ID
 * @returns Array of children that can be added
 */
export function getAvailableChildren(
  studentId: string,
  assignedChildren: Child[] | undefined,
  allChildrenByParent: Map<string, Child[]>
): Child[] {
  const allChildren = allChildrenByParent.get(studentId) || [];
  const assignedChildIds = new Set((assignedChildren || []).map((c) => c.id));
  return allChildren.filter((c) => !assignedChildIds.has(c.id));
}

/**
 * Count total car seats needed from a list of children
 */
export function countCarSeatsNeeded(children?: Child[]): number {
  if (!children) return 0;
  let count = 0;
  for (const c of children) {
    if (c.needsCarSeat) count++;
  }
  return count;
}

/**
 * Count total boosters needed from a list of children
 */
export function countBoostersNeeded(children?: Child[]): number {
  if (!children) return 0;
  let count = 0;
  for (const c of children) {
    if (c.needsBooster) count++;
  }
  return count;
}
