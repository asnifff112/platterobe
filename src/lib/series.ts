/**
 * Utility functions for PLATTEROBE Product Series Numbers.
 * Supports any manual custom identifier (e.g. "PLTR.001", "OAT-01", "FRUIT-101", etc.)
 * while safely handling accidental leading/trailing whitespace.
 */

/**
 * Trims accidental leading and trailing whitespace while preserving exact casing.
 */
export function sanitizeSeriesNo(code: string | null | undefined): string {
  if (!code) return "";
  return code.trim();
}

/**
 * Normalizes a series number for safe search: trims leading/trailing whitespace.
 */
export function normalizeSeriesNo(code: string | null | undefined): string {
  if (!code) return "";
  return code.trim();
}

/**
 * Validates that a series number is a non-empty string.
 * Allows ANY custom series identifier chosen by the admin.
 */
export function isValidSeriesNo(code: string | null | undefined): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  return trimmed.length > 0 && trimmed.length <= 64;
}

/**
 * Formats a series number for consistent editorial display.
 * Preserves the exact characters entered by the admin.
 */
export function formatSeriesNo(code: string | null | undefined): string {
  if (!code) return "";
  return code.trim();
}
