'use client'

import { Video } from 'lucide-react'

interface LiveCameraFrameProps {
  className?: string
}

export function LiveCameraFrame({ className = '' }: LiveCameraFrameProps) {
  return (
    <div className={`w-full bg-gray-900 flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <Video className="h-6 w-6" />
        <span className="text-xs font-medium">Camera</span>
      </div>
    </div>
  )
} 