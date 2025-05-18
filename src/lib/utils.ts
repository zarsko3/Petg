import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const roomColors = {
  'Living': 'bg-neutral-50 dark:bg-neutral-950/30',
  'Kitchen': 'bg-gray-50 dark:bg-gray-950/30',
  'Dining': 'bg-stone-50 dark:bg-stone-950/30',
  'Bedroom-1': 'bg-blue-50 dark:bg-blue-950/30',
  'Bedroom-2': 'bg-purple-50 dark:bg-purple-950/30',
  'Bath-1': 'bg-teal-50 dark:bg-teal-950/30',
  'Bath-2': 'bg-emerald-50 dark:bg-emerald-950/30',
  'Balcony': 'bg-amber-50/50 dark:bg-amber-950/20',
} as const;
