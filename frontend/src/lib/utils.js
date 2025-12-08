import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers to compact Indonesian format
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number (e.g., "3.9jt", "4.8rb", "852")
 */
export function formatCompactNumber(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const absNum = Math.abs(num);

  // Less than 1,000: show as is
  if (absNum < 1000) {
    return num.toString();
  }

  // 1,000 to 999,999: show in thousands with "rb" (ribu)
  if (absNum < 1000000) {
    const thousands = num / 1000;
    const formatted = thousands.toFixed(decimals);
    // Remove trailing zeros after decimal point
    return parseFloat(formatted) + 'rb';
  }

  // 1,000,000 and above: show in millions with "jt" (juta)
  const millions = num / 1000000;
  const formatted = millions.toFixed(decimals);
  // Remove trailing zeros after decimal point
  return parseFloat(formatted) + 'jt';
}
