'use client';

import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
  background?: string;
  padding?: string;
}

export function PageLayout({
  children,
  className = '',
  maxWidthClass = 'max-w-[1800px]',
  background = 'bg-gray-50 dark:bg-gray-900',
  padding = 'p-6',
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen ${background} ${padding} ${className}`}>
      <div className={`${maxWidthClass} mx-auto`}>
        {children}
      </div>
    </div>
  );
} 