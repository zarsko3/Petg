'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { X, MapPin, Save, Undo, Square, Pentagon, Circle } from 'lucide-react'
import { Zone, ZoneCreate, ZONE_TYPES } from '@/lib/types'

interface Point {
  x: number
  y: number
}

interface ZoneCanvasEditorProps {
  zone?: Zone | null
  onSave: (zone: Zone) => void
  onCancel: () => void
  existingZones?: Zone[]
}

export function ZoneCanvasEditor({ zone, onSave, onCancel, existingZones = [] }: ZoneCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [name, setName] = useState(zone?.name || '')
  const [type, setType] = useState(zone?.type || 'SAFE')
  const [color, setColor] = useState(zone?.color || '#10B981')
  const [points, setPoints] = useState<Point[]>(zone?.polygon_json || [])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState<'polygon' | 'rectangle' | 'circle'>('polygon')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<Point | null>(null)

  const CANVAS_WIDTH = 400
  const CANVAS_HEIGHT = 300
  const GRID_SIZE = 8

  // Color palette
  const colors = [
    '#10B981', '#3B82F6', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ]

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT

    redrawCanvas()
  }, [points, existingZones, color, type])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }

    // Draw existing zones (with collision detection)
    existingZones.forEach(existingZone => {
      if (existingZone.id === zone?.id) return // Skip current zone being edited

      const zonePoints = existingZone.polygon_json || []
      if (zonePoints.length < 3) return

      // Convert percentage to canvas coordinates
      const canvasPoints = zonePoints.map(p => ({
        x: (p.x / 100) * CANVAS_WIDTH,
        y: (p.y / 100) * CANVAS_HEIGHT
      }))

      // Check for overlap with current zone
      const hasOverlap = checkPolygonOverlap(points.map(p => ({
        x: (p.x / 100) * CANVAS_WIDTH,
        y: (p.y / 100) * CANVAS_HEIGHT
      })), canvasPoints)

      ctx.fillStyle = hasOverlap ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.15)'
      ctx.strokeStyle = existingZone.color || '#9CA3AF'
      ctx.lineWidth = 2

      ctx.beginPath()
      canvasPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Draw zone label
      const center = getPolygonCenter(canvasPoints)
      ctx.fillStyle = existingZone.color || '#9CA3AF'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'center'
      ctx.shadowBlur = 4
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(existingZone.name, center.x, center.y)
      ctx.shadowBlur = 0
    })

    // Draw current zone being created/edited
    if (points.length > 0) {
      // Convert percentage to canvas coordinates
      const canvasPoints = points.map(p => ({
        x: (p.x / 100) * CANVAS_WIDTH,
        y: (p.y / 100) * CANVAS_HEIGHT
      }))

      ctx.fillStyle = hexToRgba(color, 0.15)
      ctx.strokeStyle = color
      ctx.lineWidth = 2

      if (points.length >= 3) {
        // Draw filled polygon
        ctx.beginPath()
        canvasPoints.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Draw zone label
        const center = getPolygonCenter(canvasPoints)
        ctx.fillStyle = color
        ctx.font = 'bold 14px system-ui'
        ctx.textAlign = 'center'
        ctx.shadowBlur = 4
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
        ctx.fillText(name || 'New Zone', center.x, center.y)
        ctx.shadowBlur = 0
      } else {
        // Draw lines for incomplete polygon
        ctx.beginPath()
        canvasPoints.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })
        ctx.stroke()
      }

      // Draw points
      canvasPoints.forEach((point, index) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw point number
        ctx.fillStyle = 'white'
        ctx.font = '10px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText((index + 1).toString(), point.x, point.y + 3)
      })
    }
  }, [points, existingZones, color, name, zone?.id])

  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = snapToGrid(event.clientX - rect.left)
    const y = snapToGrid(event.clientY - rect.top)

    // Convert to percentage coordinates
    return {
      x: (x / CANVAS_WIDTH) * 100,
      y: (y / CANVAS_HEIGHT) * 100
    }
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'polygon') {
      const point = getCanvasPoint(event)
      setPoints(prev => [...prev, point])
    }
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'rectangle' || drawingMode === 'circle') {
      const point = getCanvasPoint(event)
      setDragStart(point)
      setIsDrawing(true)
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !dragStart) return

    const currentPoint = getCanvasPoint(event)
    
    if (drawingMode === 'rectangle') {
      const rect = [
        dragStart,
        { x: currentPoint.x, y: dragStart.y },
        currentPoint,
        { x: dragStart.x, y: currentPoint.y }
      ]
      setPoints(rect)
    } else if (drawingMode === 'circle') {
      const center = dragStart
      const radius = Math.sqrt(
        Math.pow(currentPoint.x - center.x, 2) + Math.pow(currentPoint.y - center.y, 2)
      )
      
      // Generate circle points
      const circlePoints: Point[] = []
      const numPoints = 16
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI
        circlePoints.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        })
      }
      setPoints(circlePoints)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setDragStart(null)
  }

  const checkPolygonOverlap = (poly1: Point[], poly2: Point[]): boolean => {
    if (poly1.length < 3 || poly2.length < 3) return false
    
    // Simple overlap check - check if any point of poly1 is inside poly2
    return poly1.some(point => isPointInPolygon(point, poly2)) ||
           poly2.some(point => isPointInPolygon(point, poly1))
  }

  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside
      }
    }
    return inside
  }

  const getPolygonCenter = (polygon: Point[]): Point => {
    const sum = polygon.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 })

    return {
      x: sum.x / polygon.length,
      y: sum.y / polygon.length
    }
  }

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const clearPoints = () => {
    setPoints([])
  }

  const undoLastPoint = () => {
    setPoints(prev => prev.slice(0, -1))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Zone name is required')
      return
    }

    if (points.length < 3) {
      setError('Zone must have at least 3 points')
      return
    }

    // Check for zero area
    const area = calculatePolygonArea(points)
    if (area < 1) { // Minimum 1% area
      setError('Zone area is too small')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const zoneData: ZoneCreate = {
        name: name.trim(),
        type: type as any,
        polygon_json: points,
        color,
        alert_settings: {
          entry_alert: type === 'RESTRICTED',
          exit_alert: type === 'SAFE',
          sound_enabled: true,
          notification_enabled: true,
        }
      }

      const url = zone ? `/api/zones/${zone.id}` : '/api/zones'
      const method = zone ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneData),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${zone ? 'update' : 'create'} zone: ${response.status}`)
      }

      const savedZone: Zone = await response.json()
      console.log(`✅ Zone ${zone ? 'updated' : 'created'} successfully:`, savedZone)

      // Broadcast zone update via WebSocket (simulated)
      broadcastZoneUpdate(savedZone)

      onSave(savedZone)

    } catch (error: any) {
      console.error(`❌ Failed to ${zone ? 'update' : 'create'} zone:`, error)
      setError(error.message || `Failed to ${zone ? 'update' : 'create'} zone`)
    } finally {
      setIsSaving(false)
    }
  }

  const broadcastZoneUpdate = (zone: Zone) => {
    // This would normally broadcast via WebSocket
    console.log('📡 Broadcasting zone update:', zone)
    window.dispatchEvent(new CustomEvent('zoneUpdated', { detail: zone }))
  }

  const calculatePolygonArea = (polygon: Point[]): number => {
    if (polygon.length < 3) return 0
    
    let area = 0
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      area += polygon[i].x * polygon[j].y
      area -= polygon[j].x * polygon[i].y
    }
    return Math.abs(area) / 2
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {zone ? 'Edit Zone' : 'Create Safety Zone'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Draw a zone on the canvas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Zone Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zone Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Zone Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Living Room, Backyard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                className="w-full"
                maxLength={50}
              />
            </div>

            {/* Zone Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Zone Type
              </Label>
              <div className="flex gap-2">
                {ZONE_TYPES.map((zoneType) => (
                  <button
                    key={zoneType}
                    onClick={() => setType(zoneType)}
                    disabled={isSaving}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${type === zoneType 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                      ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {zoneType}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zone Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zone Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  disabled={isSaving}
                  className={`
                    w-8 h-8 rounded-full transition-all
                    ${color === colorOption ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                  `}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {/* Drawing Tools */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drawing Mode
            </Label>
            <div className="flex gap-2">
              <Button
                variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDrawingMode('polygon')}
                disabled={isSaving}
              >
                <Pentagon className="h-4 w-4 mr-2" />
                Polygon
              </Button>
              <Button
                variant={drawingMode === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDrawingMode('rectangle')}
                disabled={isSaving}
              >
                <Square className="h-4 w-4 mr-2" />
                Rectangle
              </Button>
              <Button
                variant={drawingMode === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDrawingMode('circle')}
                disabled={isSaving}
              >
                <Circle className="h-4 w-4 mr-2" />
                Circle
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Zone Area ({points.length} points)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLastPoint}
                  disabled={points.length === 0 || isSaving}
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearPoints}
                  disabled={points.length === 0 || isSaving}
                >
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block cursor-crosshair bg-white"
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {drawingMode === 'polygon' 
                ? 'Click to add points. Need at least 3 points to create a zone.'
                : drawingMode === 'rectangle'
                ? 'Click and drag to draw a rectangle.'
                : 'Click and drag to draw a circle.'
              }
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-200">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!name.trim() || points.length < 3 || isSaving}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {zone ? 'Update' : 'Create'} Zone
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
} 