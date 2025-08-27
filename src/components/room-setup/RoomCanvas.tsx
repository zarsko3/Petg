'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle } from 'react-konva'
import { useFloorPlan, snapToGrid, GRID_SIZE } from '@/components/context/FloorPlanContext'
import { RoomShape } from './RoomShape'

const GRID_ALPHA = 0.1

// React Konva compatibility fix
const ReactKonvaWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return <>{children}</>
}

export function RoomCanvas() {
  const { state, dispatch } = useFloorPlan()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Responsive canvas sizing - always square, fitting within container
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return
      
      const container = containerRef.current
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      // Make canvas square, fitting within container with some padding
      const availableSize = Math.min(containerWidth, containerHeight) - 32 // 16px padding on each side
      const size = Math.max(availableSize, 200) // Minimum 200px for usability
      
      setDimensions({ width: size, height: size })
    }

    if (mounted) {
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      window.addEventListener('orientationchange', updateDimensions)
      
      // Initial update after a short delay to ensure container is sized
      setTimeout(updateDimensions, 100)
      
      return () => {
        window.removeEventListener('resize', updateDimensions)
        window.removeEventListener('orientationchange', updateDimensions)
      }
    }
  }, [mounted])

  // Generate grid lines based on current dimensions
  const gridLines = []
  if (dimensions.width > 0 && dimensions.height > 0) {
    const gridSpacing = (dimensions.width * GRID_SIZE) / 100 // Convert percentage to pixels

    // Vertical lines
    for (let i = 0; i <= 100 / GRID_SIZE; i++) {
      const x = i * gridSpacing
      gridLines.push(
        <Line
          key={`v-${i}`}
          points={[x, 0, x, dimensions.height]}
          stroke="#94A3B8"
          strokeWidth={0.5}
          opacity={GRID_ALPHA}
        />
      )
    }

    // Horizontal lines
    for (let i = 0; i <= 100 / GRID_SIZE; i++) {
      const y = i * gridSpacing
      gridLines.push(
        <Line
          key={`h-${i}`}
          points={[0, y, dimensions.width, y]}
          stroke="#94A3B8"
          strokeWidth={0.5}
          opacity={GRID_ALPHA}
        />
      )
    }
  }

  // Convert percentage coordinates to pixels
  const percentToPixels = (percent: number, dimension: 'width' | 'height') => {
    return (percent / 100) * dimensions[dimension]
  }

  // Convert pixels to percentage coordinates
  const pixelsToPercent = (pixels: number, dimension: 'width' | 'height') => {
    return (pixels / dimensions[dimension]) * 100
  }

  const handleStageClick = (e: any) => {
    // Deselect room if clicking on empty area
    if (e.target === e.target.getStage()) {
      dispatch({ type: 'SELECT_ROOM', id: null })
    }
  }

  if (!mounted || dimensions.width === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-500">Loading canvas...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
      <ReactKonvaWrapper>
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onClick={handleStageClick}
          className="border border-gray-200 rounded-lg shadow-sm bg-white"
        >
          <Layer>
            {/* Grid */}
            {gridLines}
            
            {/* Rooms */}
            {state.rooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                dimensions={dimensions}
                percentToPixels={percentToPixels}
                pixelsToPercent={pixelsToPercent}
                isSelected={state.selectedRoomId === room.id}
              />
            ))}
            
            {/* Snap indicators */}
            {state.snapPoints.map((point, index) => (
              <Circle
                key={`snap-${index}`}
                x={percentToPixels(point.x, 'width')}
                y={percentToPixels(point.y, 'height')}
                radius={3}
                fill="#3B82F6"
                opacity={0.6}
              />
            ))}
          </Layer>
        </Stage>
      </ReactKonvaWrapper>
    </div>
  )
} 