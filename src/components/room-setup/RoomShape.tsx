'use client'

import { useCallback, useRef } from 'react'
import { Group, Line, Circle, Text } from 'react-konva'
import { Room, snapToGrid } from '@/components/context/FloorPlanContext'

interface RoomShapeProps {
  room: Room
  canvasSize: { width: number; height: number }
  percentToPixels: (percent: number, dimension: 'width' | 'height') => number
  pixelsToPercent: (pixels: number, dimension: 'width' | 'height') => number
  onSelect: () => void
  onUpdate: (updates: Partial<Room>) => void
  isSelected: boolean
}

export function RoomShape({
  room,
  canvasSize,
  percentToPixels,
  pixelsToPercent,
  onSelect,
  onUpdate,
  isSelected
}: RoomShapeProps) {
  const groupRef = useRef<any>(null)

  // Convert room points from percentage to pixels
  const roomPoints = room.points.map(point => ({
    x: percentToPixels(point.x, 'width'),
    y: percentToPixels(point.y, 'height')
  }))

  // Create polygon points array for Konva Line
  const polygonPoints = roomPoints.flatMap(point => [point.x, point.y])

  // Calculate room bounds for handles
  const bounds = roomPoints.reduce(
    (acc, point) => ({
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

  const handleDragEnd = useCallback((e: any) => {
    const node = e.target
    const newX = pixelsToPercent(node.x(), 'width')
    const newY = pixelsToPercent(node.y(), 'height')
    
    // Snap to grid
    const snappedX = snapToGrid(newX)
    const snappedY = snapToGrid(newY)
    
    // Calculate offset
    const offsetX = snappedX - pixelsToPercent(bounds.minX, 'width')
    const offsetY = snappedY - pixelsToPercent(bounds.minY, 'height')
    
    // Update room points
    const newPoints = room.points.map(point => ({
      x: snapToGrid(point.x + offsetX),
      y: snapToGrid(point.y + offsetY)
    }))
    
    onUpdate({ points: newPoints })
    
    // Reset position as we update the points directly
    node.position({ x: 0, y: 0 })
  }, [room.points, bounds, pixelsToPercent, onUpdate])

  const handleResize = useCallback((handleIndex: number, deltaX: number, deltaY: number) => {
    // For now, implement simple rectangular resize
    const deltaXPercent = pixelsToPercent(deltaX, 'width')
    const deltaYPercent = pixelsToPercent(deltaY, 'height')
    
    if (room.type === 'rectangle' && room.points.length === 4) {
      const newPoints = [...room.points]
      
      // Simple rectangular resize based on handle position
      switch (handleIndex) {
        case 0: // Top-left
          newPoints[0] = { x: snapToGrid(newPoints[0].x + deltaXPercent), y: snapToGrid(newPoints[0].y + deltaYPercent) }
          newPoints[1] = { x: newPoints[1].x, y: snapToGrid(newPoints[1].y + deltaYPercent) }
          newPoints[3] = { x: snapToGrid(newPoints[3].x + deltaXPercent), y: newPoints[3].y }
          break
        case 1: // Top-right
          newPoints[1] = { x: snapToGrid(newPoints[1].x + deltaXPercent), y: snapToGrid(newPoints[1].y + deltaYPercent) }
          newPoints[0] = { x: newPoints[0].x, y: snapToGrid(newPoints[0].y + deltaYPercent) }
          newPoints[2] = { x: snapToGrid(newPoints[2].x + deltaXPercent), y: newPoints[2].y }
          break
        case 2: // Bottom-right
          newPoints[2] = { x: snapToGrid(newPoints[2].x + deltaXPercent), y: snapToGrid(newPoints[2].y + deltaYPercent) }
          newPoints[1] = { x: snapToGrid(newPoints[1].x + deltaXPercent), y: newPoints[1].y }
          newPoints[3] = { x: newPoints[3].x, y: snapToGrid(newPoints[3].y + deltaYPercent) }
          break
        case 3: // Bottom-left
          newPoints[3] = { x: snapToGrid(newPoints[3].x + deltaXPercent), y: snapToGrid(newPoints[3].y + deltaYPercent) }
          newPoints[0] = { x: snapToGrid(newPoints[0].x + deltaXPercent), y: newPoints[0].y }
          newPoints[2] = { x: newPoints[2].x, y: snapToGrid(newPoints[2].y + deltaYPercent) }
          break
      }
      
      onUpdate({ points: newPoints })
    }
  }, [room.points, room.type, pixelsToPercent, onUpdate])

  // Generate resize handles for rectangle
  const handles: JSX.Element[] = []
  if (isSelected && room.type === 'rectangle') {
    const handlePositions = [
      { x: bounds.minX, y: bounds.minY }, // Top-left
      { x: bounds.maxX, y: bounds.minY }, // Top-right
      { x: bounds.maxX, y: bounds.maxY }, // Bottom-right
      { x: bounds.minX, y: bounds.maxY }, // Bottom-left
    ]
    
    handlePositions.forEach((pos, index) => {
      handles.push(
        <Circle
          key={`handle-${index}`}
          x={pos.x}
          y={pos.y}
          radius={6}
          fill="#3B82F6"
          stroke="#FFFFFF"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            const deltaX = e.target.x() - pos.x
            const deltaY = e.target.y() - pos.y
            handleResize(index, deltaX, deltaY)
          }}
          onDragEnd={(e) => {
            // Reset handle position after resize
            e.target.position(pos)
          }}
        />
      )
    })
  }

  return (
    <Group
      ref={groupRef}
      draggable
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Room polygon */}
      <Line
        points={polygonPoints}
        closed
        fill={room.color}
        fillOpacity={0.3}
        stroke={room.color}
        strokeWidth={isSelected ? 3 : 2}
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
        offsetX={room.name.length * 4} // Approximate text width for centering
        offsetY={7} // Half font size for vertical centering
        listening={false} // Don't interfere with room selection
      />
      
      {/* Selection outline */}
      {isSelected && (
        <Line
          points={polygonPoints}
          closed
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[8, 4]}
          listening={false}
        />
      )}
      
      {/* Resize handles */}
      {handles}
    </Group>
  )
} 