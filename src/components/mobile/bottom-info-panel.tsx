'use client'

import { useState, useEffect } from 'react'

interface Position {
  x: number
  y: number
}

interface BottomInfoPanelProps {
  position: Position | null
}

export function BottomInfoPanel({ position }: BottomInfoPanelProps) {
  const [currentTime, setCurrentTime] = useState('')

  // Optimized time updates - only update every 30 seconds to reduce performance impact
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
      setCurrentTime(timeString)
    }
    
    updateTime() // Set initial time
    const interval = setInterval(updateTime, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="bg-[#F8F8F8]/95 backdrop-blur-md rounded-t-3xl shadow-[0_-4px_16px_rgba(0,0,0,0.1)] p-4 pt-4 mx-2 mb-2"
      role="dialog"
      aria-modal="false"
      aria-label="Live activity information"
    >
      <div className="w-12 h-1.5 bg-[#D0D0D0] rounded-full mx-auto mb-4"></div>
      <h3 className="font-semibold text-lg text-gray-900 mb-3">Live Activity</h3>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
          <span>{currentTime || '--:--'} • Buddy is active in the living room</span>
        </div>
        {position && position.x !== undefined && position.y !== undefined && !isNaN(position.x) && !isNaN(position.y) ? (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true"></div>
            <span>Current position: X: {position.x.toFixed(1)}, Y: {position.y.toFixed(1)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-400 rounded-full" aria-hidden="true"></div>
            <span>Position: —</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-orange-500 rounded-full" aria-hidden="true"></div>
          <span>10:22 • Movement detected near restricted zone</span>
        </div>
      </div>
    </div>
  )
} 