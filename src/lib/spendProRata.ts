/**
 * Pro-rata spend calculation utility
 * 
 * When filtering by date range, spend should be attributed proportionally
 * to the overlap between the spend period and the filter period.
 * 
 * Example:
 * - Spend record: Jan 1 - Mar 31 (90 days), €1000
 * - Filter: Feb 1 - Feb 28 (28 days overlap)
 * - Pro-rata amount: €1000 × (28/90) = €311.11
 */

export interface SpendRecord {
  startDate: Date | string;
  endDate: Date | string | null;
  amount: number | string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Calculate the pro-rata amount of a spend record for a given date range
 */
export function calculateProRataSpend(
  record: SpendRecord,
  filterRange: DateRange
): number {
  const amount = typeof record.amount === 'string' 
    ? parseFloat(record.amount) 
    : Number(record.amount);
  
  if (isNaN(amount) || amount <= 0) return 0;
  
  // If no filter range, return full amount
  if (!filterRange.start && !filterRange.end) {
    return amount;
  }
  
  const recordStart = new Date(record.startDate);
  recordStart.setHours(0, 0, 0, 0);
  
  // For endDate: use provided date, or if null (ongoing), use filter end or today
  let recordEnd: Date;
  if (record.endDate) {
    recordEnd = new Date(record.endDate);
  } else {
    // Ongoing spend - use filter end date or today
    recordEnd = filterRange.end ? new Date(filterRange.end) : new Date();
  }
  recordEnd.setHours(23, 59, 59, 999);
  
  // Ensure record dates are valid
  if (recordEnd < recordStart) {
    recordEnd = recordStart;
  }
  
  // Calculate the total days in the spend period
  const totalDays = Math.max(1, Math.ceil(
    (recordEnd.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1); // +1 to include both start and end days
  
  // Calculate the overlap with the filter range
  const overlapStart = filterRange.start 
    ? new Date(Math.max(recordStart.getTime(), filterRange.start.getTime()))
    : recordStart;
  
  const overlapEnd = filterRange.end
    ? new Date(Math.min(recordEnd.getTime(), filterRange.end.getTime()))
    : recordEnd;
  
  // If no overlap, return 0
  if (overlapEnd < overlapStart) {
    return 0;
  }
  
  // Calculate overlap days
  const overlapDays = Math.max(1, Math.ceil(
    (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1);
  
  // Calculate pro-rata amount
  const proRataAmount = amount * (overlapDays / totalDays);
  
  return proRataAmount;
}

/**
 * Calculate total pro-rata spend for multiple records
 */
export function calculateTotalProRataSpend(
  records: SpendRecord[],
  filterRange: DateRange
): number {
  return records.reduce((total, record) => {
    return total + calculateProRataSpend(record, filterRange);
  }, 0);
}

/**
 * Parse date string to Date object with proper time handling
 */
export function parseDateParam(dateStr: string | null, isEndDate: boolean = false): Date | null {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  if (isEndDate) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}
