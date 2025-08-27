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

// Completely client-side only canvas that renders actual Konva components
function ClientSideCanvas() {
  const { state, dispatch } = useFloorPlan()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [KonvaComponents, setKonvaComponents] = useState<{
    Stage: any
    Layer: any
    Line: any
    Circle: any
    Group: any
    Text: any
  } | null>(null)

  // Load Konva components after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        import('react-konva').then((konva) => {
          setKonvaComponents({
            Stage: konva.Stage,
            Layer: konva.Layer,
            Line: konva.Line,
            Circle: konva.Circle,
            Group: konva.Group,
            Text: konva.Text
          })
        }).catch((err) => {
          console.warn('Failed to load Konva for ClientSideCanvas:', err)
        })
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [])

  // Handle canvas sizing
  useEffect(() => {
    if (!containerRef.current) return

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
  }, [])

  // Convert coordinates
  const percentToPixels = (percent: number, dimension: 'width' | 'height') => {
    return (percent / 100) * dimensions[dimension]
  }

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      dispatch({ type: 'SELECT_ROOM', id: null })
    }
  }

  if (!KonvaComponents) {
    return <CanvasPlaceholder message="Loading canvas..." />
  }

  if (dimensions.width === 0) {
    return <CanvasPlaceholder message="Initializing canvas..." />
  }

  const { Stage, Layer, Line, Circle, Group, Text } = KonvaComponents

  // Generate grid lines
  const gridLines = []
  const gridSpacing = (dimensions.width * 2) / 100 // 2% grid

  // Vertical lines
  for (let i = 0; i <= 100; i += 2) {
    const x = (i / 100) * dimensions.width
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[x, 0, x, dimensions.height]}
        stroke="#E5E7EB"
        strokeWidth={0.5}
        opacity={0.5}
      />
    )
  }

  // Horizontal lines
  for (let i = 0; i <= 100; i += 2) {
    const y = (i / 100) * dimensions.height
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, y, dimensions.width, y]}
        stroke="#E5E7EB"
        strokeWidth={0.5}
        opacity={0.5}
      />
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4">
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
          {state.rooms.map((room: any) => {
            // Convert room points from percentage to pixels
            const roomPoints = room.points.map((point: any) => ({
              x: percentToPixels(point.x, 'width'),
              y: percentToPixels(point.y, 'height')
            }))

            // Create polygon points array for Konva Line
            const polygonPoints = roomPoints.flatMap((point: any) => [point.x, point.y])

            // Calculate room bounds for handles
            const bounds = roomPoints.reduce(
              (acc: any, point: any) => ({
                minX: Math.min(acc.minX, point.x),
                maxX: Math.max(acc.maxX, point.x),
                minY: Math.min(acc.minY, point.y),
                maxY: Math.max(acc.maxY, point.y)
              }),
              { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
            )

            // Calculate center for text label
            const centerX = (bounds.minX + bounds.maxX) / 2
            const centerY = (bounds.minY + bounds.maxY) / 2

            return (
              <Group
                key={room.id}
                draggable
                rotation={room.rotation || 0}
              >
                {/* Room polygon */}
                <Line
                  points={polygonPoints}
                  closed
                  fill={room.color}
                  fillOpacity={0.3}
                  stroke={room.color}
                  strokeWidth={state.selectedRoom === room.id ? 3 : 2}
                  strokeOpacity={0.8}
                  shadowColor={room.color}
                  shadowOpacity={0.3}
                  shadowOffsetX={2}
                  shadowOffsetY={2}
                  shadowBlur={8}
                />

                {/* Room label */}
                <Text
                  x={centerX}
                  y={centerY}
                  text={room.name}
                  fontSize={14}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontStyle="600"
                  fill="#1F2937"
                  align="center"
                  verticalAlign="middle"
                  offsetX={room.name.length * 4}
                  offsetY={7}
                  listening={false}
                />

                {/* Rotation indicator */}
                {(room.rotation || 0) !== 0 && (
                  <Text
                    x={centerX}
                    y={centerY + 20}
                    text={`${Math.round(room.rotation || 0)}°`}
                    fontSize={10}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontStyle="400"
                    fill="#6B7280"
                    align="center"
                    verticalAlign="middle"
                    offsetX={15}
                    offsetY={5}
                    listening={false}
                  />
                )}

                {/* Selection outline */}
                {state.selectedRoom === room.id && (
                  <Line
                    points={polygonPoints}
                    closed
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dash={[8, 4]}
                    listening={false}
                  />
                )}

                {/* L-shape corner indicators */}
                {room.type === 'l-shape' && room.points.map((point: any, index: number) => (
                  <Circle
                    key={`corner-${index}`}
                    x={percentToPixels(point.x, 'width')}
                    y={percentToPixels(point.y, 'height')}
                    radius={3}
                    fill="#10B981"
                    opacity={0.7}
                    listening={false}
                  />
                ))}
              </Group>
            )
          })}
        </Layer>
      </Stage>
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