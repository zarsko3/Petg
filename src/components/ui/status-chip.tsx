'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      },
      size: {
        default: 'text-sm',
        lg: 'text-base px-4 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface StatusChipProps extends VariantProps<typeof chipVariants> {
  label: string;
  value?: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatusChip({ label, value, icon, variant, size, className }: StatusChipProps) {
  return (
    <div className={cn(chipVariants({ variant, size }), className)}>
      {icon && <span className="mr-1.5">{icon}</span>}
      <span className="font-medium">{label}</span>
      {value && <span className="ml-1.5 opacity-90">{value}</span>}
    </div>
  );
} 