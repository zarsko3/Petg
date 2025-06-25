'use client'

import { ReactNode } from 'react'
import { ConnectionStatusBadge } from '@/components/connection-status-indicator'

interface MobileHeaderProps {
  title: string
  subtitle?: string
  rightElement?: ReactNode
  className?: string
}

export function MobileHeader({ 
  title, 
  subtitle, 
  rightElement, 
  className = '' 
}: MobileHeaderProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 px-6 py-6 border-b border-gray-200 dark:border-gray-800 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <ConnectionStatusBadge />
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {rightElement && (
          <div className="flex-shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
} 