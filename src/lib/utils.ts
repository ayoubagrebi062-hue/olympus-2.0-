/**
 * OLYMPUS - Client-Safe Utility Functions
 *
 * These utilities are safe to use in client components
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names with Tailwind CSS support */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
