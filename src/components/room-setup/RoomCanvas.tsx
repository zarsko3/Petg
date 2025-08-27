'use client'

import { useEffect, useRef, useState } from 'react'
import { useFloorPlan, GRID_SIZE } from '@/components/context/FloorPlanContext'

// Simple loading component that doesn't use any Konva
function CanvasPlaceholder({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}

// Completely client-side only canvas that never renders on server
function ClientSideCanvas() {
  const { state, dispatch } = useFloorPlan()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasLoaded, setCanvasLoaded] = useState(false)

  // Load canvas after component mounts and we're definitely on client
  useEffect(() => {
    // Use multiple checks to ensure we're really on the client
    if (typeof window !== 'undefined' && window.document) {
      // Small delay to ensure React is fully ready
      const timer = setTimeout(() => {
        setCanvasLoaded(true)
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [])

  // Handle canvas sizing
  useEffect(() => {
    if (!canvasLoaded || !containerRef.current) return

    const updateDimensions = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      // Make canvas square, fitting within container with some padding
      const availableSize = Math.min(containerWidth, containerHeight) - 32
      const size = Math.max(availableSize, 200)

      setDimensions({ width: size, height: size })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    window.addEventListener('orientationchange', updateDimensions)

    return () => {
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('orientationchange', updateDimensions)
    }
  }, [canvasLoaded])

  // Convert coordinates
  const percentToPixels = (percent: number, dimension: 'width' | 'height') => {
    return (percent / 100) * dimensions[dimension]
  }

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      dispatch({ type: 'SELECT_ROOM', id: null })
    }
  }

  if (!canvasLoaded) {
    return <CanvasPlaceholder message="Loading canvas..." />
  }

  if (dimensions.width === 0) {
    return <CanvasPlaceholder message="Initializing canvas..." />
  }

  // This should never render until Konva is loaded
  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-50">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <p className="text-sm">Canvas ready</p>
          <p className="text-xs text-gray-500 mt-1">Konva components will load here</p>
        </div>
      </div>
    </div>
  )
}

export function RoomCanvas() {
  const [isClient, setIsClient] = useState(false)

  // Only render on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <CanvasPlaceholder message="Loading canvas..." />
  }

  return <ClientSideCanvas />
}