/**
 * Capacity calculation utilities for routes and vehicles
 */

export interface CapacityInfo {
  assigned: number;
  capacity: number;
  available: number;
  percentage: number;
  display: string;
  statusClass: 'full' | 'warning' | '';
}

/**
 * Calculate capacity information for a route
 * @param capacity Total capacity of the route
 * @param assigned Number of seats currently assigned
 * @returns CapacityInfo object with all relevant metrics
 */
export function calculateCapacity(
  capacity: number,
  assigned: number
): CapacityInfo {
  const safeCapacity = capacity || 0;
  const safeAssigned = assigned || 0;
  const available = Math.max(0, safeCapacity - safeAssigned);
  const percentage =
    safeCapacity > 0
      ? Math.min((safeAssigned / safeCapacity) * 100, 100)
      : 0;

  let statusClass: 'full' | 'warning' | '' = '';
  if (percentage >= 100) {
    statusClass = 'full';
  } else if (percentage >= 75) {
    statusClass = 'warning';
  }

  return {
    assigned: safeAssigned,
    capacity: safeCapacity,
    available,
    percentage,
    display: `${safeAssigned}/${safeCapacity}`,
    statusClass,
  };
}

/**
 * Calculate total seats used by passengers and their children
 * @param passengers Array of passengers with optional children arrays
 * @returns Total seat count (1 per passenger + 1 per child)
 */
export function getTotalSeatsUsed<
  T extends { children?: { id: string }[] }
>(passengers: T[]): number {
  if (!passengers) return 0;
  return passengers.reduce((total, p) => {
    return total + 1 + (p.children?.length || 0);
  }, 0);
}

/**
 * Get number of available seats
 */
export function getAvailableSeats(capacity: number, seatsUsed: number): number {
  return Math.max(0, (capacity || 0) - (seatsUsed || 0));
}

/**
 * Check if adding seats would exceed capacity
 * @param capacity Route capacity
 * @param currentSeats Currently used seats
 * @param seatsToAdd Number of seats to add
 * @returns True if adding would exceed capacity
 */
export function wouldExceedCapacity(
  capacity: number,
  currentSeats: number,
  seatsToAdd: number
): boolean {
  return currentSeats + seatsToAdd > capacity;
}
