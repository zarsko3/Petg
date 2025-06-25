import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names into a single string, with proper Tailwind CSS conflict resolution
 */
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

/**
 * Format a timestamp into a relative "time ago" string
 */
export function formatTimeAgo(timestamp: string | Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Format last seen timestamp
 */
export function formatLastSeen(timestamp: string | Date): string {
  return formatTimeAgo(timestamp);
}

/**
 * Get battery color based on level
 */
export function getBatteryColor(level: number): string {
  if (level > 50) {
    return 'text-green-500';
  } else if (level > 20) {
    return 'text-yellow-500';
  } else {
    return 'text-red-500';
  }
}

/**
 * Get battery gradient for visual indicators
 */
export function getBatteryGradient(level: number): string {
  if (level > 50) {
    return 'from-green-400 to-green-600';
  } else if (level > 20) {
    return 'from-yellow-400 to-yellow-600';
  } else {
    return 'from-red-400 to-red-600';
  }
}

/**
 * Get signal strength text
 */
export function getSignalStrengthText(strength: number): string {
  if (strength > 80) {
    return 'Excellent';
  } else if (strength > 60) {
    return 'Good';
  } else if (strength > 40) {
    return 'Fair';
  } else {
    return 'Poor';
  }
}

/**
 * Get signal color based on strength
 */
export function getSignalColor(strength: number): string {
  if (strength > 80) {
    return 'text-green-500';
  } else if (strength > 60) {
    return 'text-blue-500';
  } else if (strength > 40) {
    return 'text-yellow-500';
  } else {
    return 'text-red-500';
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'connected':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'inactive':
    case 'disconnected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'sleeping':
    case 'rest':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    return `${Math.round((temp * 9/5) + 32)}°F`;
  }
  return `${Math.round(temp)}°C`;
}

/**
 * Get activity level text description
 */
export function getActivityLevelText(level: number): string {
  if (level >= 80) {
    return 'Very Active';
  } else if (level >= 60) {
    return 'Active';
  } else if (level >= 40) {
    return 'Moderate';
  } else if (level >= 20) {
    return 'Low Activity';
  } else {
    return 'Resting';
  }
}

/**
 * Get activity color based on level
 */
export function getActivityColor(level: number): string {
  if (level >= 80) {
    return 'text-red-500';
  } else if (level >= 60) {
    return 'text-orange-500';
  } else if (level >= 40) {
    return 'text-yellow-500';
  } else if (level >= 20) {
    return 'text-green-500';
  } else {
    return 'text-blue-500';
  }
}
