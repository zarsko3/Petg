'use client'

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Circle } from 'react-konva'
import { useFloorPlan, snapToGrid } from '@/components/context/FloorPlanContext'
import { RoomShape } from './RoomShape'

export function BeaconCanvas() {
  const { state, dispatch } = useFloorPlan()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Responsive canvas sizing - same as RoomCanvas
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

  // Convert percentage coordinates to pixels
  const percentToPixels = (percent: number, dimension: 'width' | 'height') => {
    return (percent / 100) * dimensions[dimension]
  }

  // Convert pixels to percentage coordinates
  const pixelsToPercent = (pixels: number, dimension: 'width' | 'height') => {
    return (pixels / dimensions[dimension]) * 100
  }

  const handleStageClick = (e: any) => {
    // Don't place beacons when clicking rooms - only on empty space
    if (e.target === e.target.getStage()) {
      // For now, just deselect
      dispatch({ type: 'SELECT_ROOM', id: null })
    }
  }

  const handleStageDrop = (e: any) => {
    // Handle beacon drop from external drag
    e.preventDefault()
    
    const stage = e.target.getStage()
    const pointerPosition = stage.getPointerPosition()
    
    if (pointerPosition) {
      const x = pixelsToPercent(pointerPosition.x, 'width')
      const y = pixelsToPercent(pointerPosition.y, 'height')
      
      // Get beacon ID from drag data (would be set during drag start)
      const beaconId = e.dataTransfer?.getData('beacon-id')
      if (beaconId) {
        dispatch({ 
          type: 'PLACE_BEACON', 
          beacon_id: beaconId, 
          x: snapToGrid(x), 
          y: snapToGrid(y) 
        })
      }
    }
  }

  if (!mounted || dimensions.width === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading beacon placement...</p>
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
          onDrop={handleStageDrop}
          onDragOver={(e: any) => e.preventDefault()}
          className="border border-gray-200 rounded-lg shadow-sm bg-white"
        >
          {/* Rooms Layer (read-only) */}
          <Layer>
            {state.rooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                canvasSize={dimensions}
                percentToPixels={percentToPixels}
                pixelsToPercent={pixelsToPercent}
                onSelect={() => dispatch({ type: 'SELECT_ROOM', id: room.id })}
                onUpdate={() => {}} // Read-only in beacon mode
                isSelected={state.selectedRoom === room.id}
              />
            ))}
          </Layer>

          {/* Beacons Layer */}
          <Layer>
            {state.beacons.map((beacon) => {
              // Scale beacon size based on canvas size
              const beaconRadius = Math.max(dimensions.width * 0.03, 8) // 3% of canvas width, minimum 8px
              
              return (
                <Circle
                  key={beacon.beacon_id}
                  x={percentToPixels(beacon.x, 'width')}
                  y={percentToPixels(beacon.y, 'height')}
                  radius={beaconRadius}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  shadowColor="#10B981"
                  shadowOpacity={0.5}
                  shadowOffsetX={2}
                  shadowOffsetY={2}
                  shadowBlur={6}
                  draggable
                  onDragEnd={(e) => {
                    const newX = pixelsToPercent(e.target.x(), 'width')
                    const newY = pixelsToPercent(e.target.y(), 'height')
                    dispatch({
                      type: 'PLACE_BEACON',
                      beacon_id: beacon.beacon_id,
                      x: snapToGrid(newX),
                      y: snapToGrid(newY)
                    })
                  }}
                />
              )
            })}
          </Layer>
        </Stage>

        {/* Instructions */}
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
                No rooms found. Please go back and create rooms first.
              </p>
            </div>
          </div>
        )}

        {state.rooms.length > 0 && state.beacons.length === 0 && (
          <div className="absolute top-4 left-4 right-4 bg-blue-100 border border-blue-200 rounded-lg p-3 pointer-events-none">
            <p className="text-sm text-blue-800 text-center">
              Drag beacons from the left panel into your rooms
            </p>
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