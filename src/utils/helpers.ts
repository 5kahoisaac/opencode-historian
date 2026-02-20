import path from 'node:path';
import { getProjectMemoryPath } from '../storage';

/**
 * Creates a debounced version of a function.
 * The function will only be called after `ms` milliseconds have elapsed
 * since the last call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, ms);
  }) as T;
}

/**
 * Sanitizes a filename by removing or replacing unsafe characters.
 */
export function sanitizeFilename(name: string): string {
  // Remove or replace characters that are unsafe in filenames
  // This is a basic sanitization - adjust based on your OS requirements
  const controlChars = String.fromCharCode(
    ...Array.from({ length: 32 }, (_, i) => i),
  );
  const unsafeChars = '<>:"/\\|?*';

  return name
    .replace(new RegExp(`[${unsafeChars}${controlChars}]`, 'g'), '') // Remove unsafe characters
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 255); // Limit length (common filesystem limit)
}

/**
 * Truncates a string to a maximum length, optionally adding a suffix.
 */
export function truncateString(
  str: string,
  maxLen: number,
  suffix = '...',
): string {
  if (str.length <= maxLen) {
    return str;
  }

  const suffixLength = suffix.length;
  const truncateAt = Math.max(0, maxLen - suffixLength);

  return str.substring(0, truncateAt) + suffix;
}

/**
 * Converts a qmd:// URI to a real filesystem path.
 * qmd returns paths like "qmd://conventions-pattern/file.md"
 * but we need ".mnemonics/conventions-pattern/file.md"
 */
export function qmdPathToFsPath(qmdPath: string, projectRoot: string): string {
  if (qmdPath.startsWith('qmd://')) {
    const relativePath = qmdPath.replace('qmd://', '');
    return path.join(getProjectMemoryPath(projectRoot), relativePath);
  }
  return qmdPath;
}

/**
 * Creates a deep clone of an object using structuredClone if available,
 * with a fallback to JSON parse/stringify.
 */
export function deepClone<T>(obj: T): T {
  // Use structuredClone if available (Node.js 17+, modern browsers)
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }

  // Fallback to JSON serialization
  // Note: This doesn't handle functions, undefined, or circular references
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch (_error) {
    // If JSON serialization fails, return a shallow copy
    return Array.isArray(obj) ? ([...obj] as T) : ({ ...obj } as T);
  }
}

// Re-export toKebabCase from validation for convenience
export { toKebabCase } from './validation';
