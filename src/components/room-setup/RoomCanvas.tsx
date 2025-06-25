'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle } from 'react-konva'
import { useFloorPlan, snapToGrid, GRID_SIZE } from '@/components/context/FloorPlanContext'
import { RoomShape } from './RoomShape'

const GRID_ALPHA = 0.1

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
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-gray-50 p-4"
    >
      <div className="relative flex-shrink-0">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleStageClick}
          onTouchStart={handleStageClick}
          className="border border-gray-200 rounded-lg shadow-sm bg-white"
        >
          {/* Grid Layer */}
          <Layer>
            {gridLines}
          </Layer>

          {/* Rooms Layer */}
          <Layer>
            {state.rooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                canvasSize={dimensions}
                percentToPixels={percentToPixels}
                pixelsToPercent={pixelsToPercent}
                onSelect={() => dispatch({ type: 'SELECT_ROOM', id: room.id })}
                onUpdate={(updates) => dispatch({ type: 'UPDATE_ROOM', id: room.id, updates })}
                isSelected={state.selectedRoom === room.id}
              />
            ))}
          </Layer>

          {/* Guide dots for grid snapping when editing */}
          {state.isEditing && (
            <Layer>
              {Array.from({ length: Math.floor(100 / GRID_SIZE) + 1 }, (_, i) =>
                Array.from({ length: Math.floor(100 / GRID_SIZE) + 1 }, (_, j) => {
                  const gridSpacing = (dimensions.width * GRID_SIZE) / 100
                  return (
                    <Circle
                      key={`guide-${i}-${j}`}
                      x={i * gridSpacing}
                      y={j * gridSpacing}
                      radius={1}
                      fill="#94A3B8"
                      opacity={0.3}
                    />
                  )
                })
              ).flat()}
            </Layer>
          )}
        </Stage>

        {/* Canvas Instructions */}
        {state.rooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1" 
                className="mx-auto mb-3 opacity-50"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <p className="text-sm">
                Canvas ready for your rooms
              </p>
            </div>
          </div>
        )}

        {/* Canvas size indicator */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {dimensions.width}×{dimensions.height}
        </div>
      </div>
    </div>
  )
} 