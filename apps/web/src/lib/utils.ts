import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditionally join class names and resolve Tailwind conflicts.
 * Used by every shadcn/ui component.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
