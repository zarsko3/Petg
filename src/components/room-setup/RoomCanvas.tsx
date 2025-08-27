'use client'

import { useEffect, useRef, useState, Component, ReactNode } from 'react'
import { useFloorPlan, snapToGrid, GRID_SIZE } from '@/components/context/FloorPlanContext'
import { RoomShape } from './RoomShape'

// Dynamically import Konva components to prevent SSR issues
let Stage: any = null
let Layer: any = null
let Line: any = null
let Circle: any = null

// Error Boundary for Konva components
interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.warn('Konva Error Boundary caught error:', error)
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('Konva Error Boundary details:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

const GRID_ALPHA = 0.1

// React Konva compatibility fix - Enhanced client-side only wrapper
const ReactKonvaWrapper = ({ children, fallback }: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) => {
  const [mounted, setMounted] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    try {
      setMounted(true)
    } catch (error) {
      console.warn('React Konva wrapper error:', error)
      setHasError(true)
    }
  }, [])

  if (hasError) {
    return fallback || <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-sm">Canvas temporarily unavailable</p>
      </div>
    </div>
  }

  if (!mounted) {
    return fallback || <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-sm">Loading canvas...</p>
      </div>
    </div>
  }

  return <>{children}</>
}

export function RoomCanvas() {
  const { state, dispatch } = useFloorPlan()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [konvaLoaded, setKonvaLoaded] = useState(false)

  // Dynamically load Konva components
  useEffect(() => {
    import('react-konva').then((konva) => {
      Stage = konva.Stage
      Layer = konva.Layer
      Line = konva.Line
      Circle = konva.Circle
      setKonvaLoaded(true)
    }).catch((err) => {
      console.warn('Failed to load Konva components:', err)
      setError('Failed to load canvas components')
    })
  }, [])

  useEffect(() => {
    try {
      setMounted(true)
      setError(null)
    } catch (err) {
      console.warn('RoomCanvas mount error:', err)
      setError('Failed to initialize canvas')
    }
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

  // Handle errors
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-50">
            <circle cx="12" cy="12" r="10"/>
            <path d="m15 9-6 6"/>
            <path d="m9 9 6 6"/>
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Wait for Konva components to load
  if (!konvaLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading canvas components...</p>
        </div>
      </div>
    )
  }

  if (!mounted || dimensions.width === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
          <p className="text-sm">Initializing canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
      <ReactKonvaWrapper
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-50">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              <p className="text-sm">Canvas temporarily unavailable</p>
              <p className="text-xs text-gray-500 mt-1">Please refresh the page</p>
            </div>
          </div>
        }
      >
        <ErrorBoundary fallback={
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-red-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-50">
                <circle cx="12" cy="12" r="10"/>
                <path d="m15 9-6 6"/>
                <path d="m9 9 6 6"/>
              </svg>
              <p className="text-sm">Canvas rendering error</p>
              <p className="text-xs text-gray-500 mt-1">Try refreshing the page</p>
            </div>
          </div>
        }>
          {Stage && Layer && Line && Circle ? (
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
                    canvasSize={dimensions}
                    percentToPixels={percentToPixels}
                    pixelsToPercent={pixelsToPercent}
                    onSelect={() => dispatch({ type: 'SELECT_ROOM', id: room.id })}
                    onUpdate={(updates) => dispatch({ type: 'UPDATE_ROOM', id: room.id, updates })}
                    isSelected={state.selectedRoom === room.id}
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
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-50">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                <p className="text-sm">Canvas components unavailable</p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </ReactKonvaWrapper>
    </div>
  )
} 