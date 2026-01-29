/**
 * Decimal handling utilities for Prisma
 * 
 * Prisma returns Decimal fields as Prisma.Decimal objects which serialize to strings.
 * These utilities provide consistent conversion to JavaScript numbers.
 */

import { Decimal } from "@prisma/client/runtime/library";

/**
 * Safely convert a Prisma Decimal, string, or number to a JavaScript number.
 * Returns 0 for null/undefined/invalid values.
 * 
 * @example
 * // From Prisma query result
 * const amount = toNumber(spendRecord.amount); // Decimal → number
 * 
 * // From API response (serialized as string)
 * const total = toNumber(data.totalSpent); // "1234.56" → 1234.56
 */
export function toNumber(value: Decimal | string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // Prisma Decimal object - has toNumber() method
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  
  // Fallback for objects with toString (serialized Decimals)
  if (typeof value === "object" && value !== null) {
    const str = String(value);
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Sum an array of Decimal/string/number values
 * 
 * @example
 * const totalSpent = sumDecimals(records.map(r => r.amount));
 */
export function sumDecimals(values: (Decimal | string | number | null | undefined)[]): number {
  return values.reduce<number>((sum, val) => sum + toNumber(val), 0);
}

/**
 * Format a number as currency (EUR)
 * 
 * @example
 * formatCurrency(1234.5) // "€1.234,50"
 */
export function formatCurrency(
  value: Decimal | string | number | null | undefined,
  options: { locale?: string; currency?: string; minimumFractionDigits?: number } = {}
): string {
  const { 
    locale = "it-IT", 
    currency = "EUR",
    minimumFractionDigits = 2 
  } = options;
  
  const num = toNumber(value);
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
  }).format(num);
}

/**
 * Format a number with specified decimal places
 * 
 * @example
 * formatDecimal(1234.5678, 2) // "1234.57"
 */
export function formatDecimal(
  value: Decimal | string | number | null | undefined,
  decimals: number = 2
): string {
  return toNumber(value).toFixed(decimals);
}

/**
 * Calculate percentage safely (avoids division by zero)
 * 
 * @example
 * const cpl = safePercentage(totalSpent, totalLeads); // Cost per lead
 */
export function safeDivide(
  numerator: Decimal | string | number | null | undefined,
  denominator: Decimal | string | number | null | undefined,
  fallback: number = 0
): number {
  const num = toNumber(numerator);
  const den = toNumber(denominator);
  
  if (den === 0) {
    return fallback;
  }
  
  return num / den;
}
