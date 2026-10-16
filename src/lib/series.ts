/**
 * Utility functions for PLATTEROBE Product Series Numbers (e.g. "PLTR.001").
 */

/**
 * Safely normalizes a product series number:
 * - Trims leading and trailing whitespace
 * - Collapses multiple spaces into single space
 * - Converts to uppercase
 *
 * Example: "  pltr.001  " -> "PLTR.001"
 */
export function normalizeSeriesNo(code: string | null | undefined): string {
  if (!code) return "";
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Validates whether a series number conforms to PLATTEROBE convention:
 * Supports format like "PLTR.001", "PLTR-001", or alphanumeric codes between 3 and 32 characters.
 */
export function isValidSeriesNo(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = normalizeSeriesNo(code);
  // Must be between 3 and 32 characters and contain only uppercase letters, numbers, dots, and hyphens
  return /^[A-Z0-9.-]{3,32}$/.test(normalized);
}

/**
 * Formats a series number for consistent editorial display.
 */
export function formatSeriesNo(code: string | null | undefined): string {
  if (!code) return "";
  return normalizeSeriesNo(code);
}
