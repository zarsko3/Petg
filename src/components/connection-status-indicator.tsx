'use client'

import React from 'react'
import { useConnectionIndicator } from '@/hooks/useSmartCollarData'

export function ConnectionStatusIndicator() {
  const { text, color, textColor, icon, show, status, connectionDuration } = useConnectionIndicator()

  if (!show) {
    return null
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      ${color} ${textColor} shadow-sm border border-white/20
      ${status === 'connecting' ? 'animate-pulse' : ''}
      transition-all duration-300
    `}>
      {/* Status Icon */}
      <span className={`
        ${status === 'connecting' ? 'animate-spin' : ''}
        ${status === 'connected' ? 'animate-pulse' : ''}
      `}>
        {icon}
      </span>
      
      {/* Status Text */}
      <span className="font-bold tracking-wide">
        {text}
      </span>
      
      {/* Connection Duration for Live Mode */}
      {status === 'connected' && connectionDuration > 0 && (
        <span className="text-green-100 opacity-80 text-xs">
          {formatDuration(connectionDuration)}
        </span>
      )}
    </div>
  )
}

// Compact version for mobile
export function ConnectionStatusBadge() {
  const { text, color, textColor, icon, show, status } = useConnectionIndicator()

  if (!show) {
    return null
  }

  return (
    <div className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold
      ${color} ${textColor} shadow-sm
      ${status === 'connecting' ? 'animate-pulse' : ''}
      transition-all duration-300
    `}>
      <span className={status === 'connecting' ? 'animate-spin' : ''}>
        {icon}
      </span>
      <span className="tracking-wide">{text}</span>
    </div>
  )
} 