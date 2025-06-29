'use client'

import { useState, useEffect } from 'react'
import { LiveCameraFrame } from './live-camera-frame'

interface Beacon {
  connected: boolean
}

interface Position {
  x: number
  y: number
}

interface CameraHeaderProps {
  beacons: Beacon[]
  position: Position | null
}

export function CameraHeader({ beacons, position }: CameraHeaderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 p-4 pt-[calc(16px+env(safe-area-inset-top,20px))] space-y-4 shadow-sm">
      {/* Camera */}
      <div className="w-full max-w-sm mx-auto">
        <LiveCameraFrame className="w-full h-20 rounded-lg overflow-hidden shadow-sm" />
      </div>
      
      {/* Status chips - render consistently but show actual data only after mount */}
      <div className="flex gap-2 overflow-x-auto md:overflow-visible scrollbar-hide justify-center">
        <div className="bg-white/90 backdrop-blur-md border border-[#e0e0e0] rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap">
          {mounted ? `${beacons.filter(b => b.connected).length}/${beacons.length}` : '0/0'} Beacons
        </div>
        {mounted && position && position.x !== undefined && position.y !== undefined && !isNaN(position.x) && !isNaN(position.y) && (
          <div className="bg-[#1565C0]/90 backdrop-blur-md border border-[#1565C0] rounded-full px-3 py-2 text-xs font-medium text-white whitespace-nowrap">
            Buddy Located
          </div>
        )}
      </div>
    </div>
  )
} 