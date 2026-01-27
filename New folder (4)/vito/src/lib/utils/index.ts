/**
 * OLYMPUS 2.0 - Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names with Tailwind CSS support */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 50X RELIABILITY: Safe JSON utilities
export {
  safeJsonParse,
  safeJsonStringify,
  safeJsonStringifyPretty,
  safeJsonParseValidated,
  safeJsonParseFile,
} from './safe-json';
