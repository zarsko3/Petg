'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, RotateCcw, Check, MousePointer, Trash2, AlertTriangle } from 'lucide-react'
import { Point2D, normalise, validateFloorPlan, calculatePolygonArea } from '@/lib/floorPlan'

interface FloorPlanCanvasProps {
  onFinish: (points: Point2D[]) => void
  onCancel: () => void
  isVisible: boolean
}

export function FloorPlanCanvas({ onFinish, onCancel, isVisible }: FloorPlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [points, setPoints] = useState<Point2D[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 })

  // Draw the canvas content
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw grid background
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    const gridSize = 20
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Draw border
    ctx.strokeStyle = '#9CA3AF'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, width, height)
    
    if (points.length === 0) {
      // Draw instructions
      ctx.fillStyle = '#6B7280'
      ctx.font = '16px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Tap to add corner points', width / 2, height / 2 - 20)
      ctx.fillText('Create your room outline', width / 2, height / 2 + 10)
      return
    }
    
    // Draw points and lines
    points.forEach((point, index) => {
      const x = (point.x / 100) * width
      const y = (point.y / 100) * height
      
      // Draw line to previous point
      if (index > 0) {
        const prevPoint = points[index - 1]
        const prevX = (prevPoint.x / 100) * width
        const prevY = (prevPoint.y / 100) * height
        
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(prevX, prevY)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      
      // Draw closing line if we have enough points
      if (index === points.length - 1 && points.length > 2) {
        const firstPoint = points[0]
        const firstX = (firstPoint.x / 100) * width
        const firstY = (firstPoint.y / 100) * height
        
        ctx.strokeStyle = '#10B981'
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(firstX, firstY)
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // Draw point
      ctx.fillStyle = index === 0 ? '#10B981' : '#3B82F6'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fill()
      
      // Draw point border
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Draw point number
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText((index + 1).toString(), x, y + 4)
    })
    
    // Show area if we have a valid polygon
    if (points.length >= 3) {
      const area = calculatePolygonArea(points)
      ctx.fillStyle = '#374151'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText(`Area: ${area.toFixed(1)} sq units`, 10, height - 10)
    }
    
  }, [points])

  // Handle canvas click
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isProcessing) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    
    // Snap to grid (optional)
    const gridSnap = 2.5 // Snap to 2.5% grid
    const snappedX = Math.round(x / gridSnap) * gridSnap
    const snappedY = Math.round(y / gridSnap) * gridSnap
    
    setPoints(prev => [...prev, { x: snappedX, y: snappedY }])
    setError(null)
  }, [isProcessing])

  // Handle undo
  const handleUndo = useCallback(() => {
    setPoints(prev => prev.slice(0, -1))
    setError(null)
  }, [])

  // Handle reset
  const handleReset = useCallback(() => {
    setPoints([])
    setError(null)
  }, [])

  // Handle finish
  const handleFinish = useCallback(async () => {
    try {
      setIsProcessing(true)
      setError(null)

      if (points.length < 3) {
        setError('At least 3 points required to create a floor plan')
        return
      }

      // Validate the floor plan
      const validation = validateFloorPlan(points)
      if (!validation.valid) {
        setError(validation.error || 'Invalid floor plan')
        return
      }

      // Normalize and finish
      const normalized = normalise(points)
      console.log('Manual floor plan created:', { points, normalized })
      
      onFinish(points)
    } catch (error) {
      console.error('Error processing manual floor plan:', error)
      setError('Failed to process floor plan. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [points, onFinish])

  // Update canvas size based on screen
  useEffect(() => {
    const updateCanvasSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 500)
      const maxHeight = Math.min(window.innerHeight - 300, 500)
      const size = Math.min(maxWidth, maxHeight)
      setCanvasSize({ width: size, height: size })
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // Redraw canvas when points change
  useEffect(() => {
    drawCanvas()
  }, [points, canvasSize, drawCanvas])

  const canFinish = points.length >= 3 && !isProcessing

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-pet-surface">
      {/* Header */}
      <div className="bg-pet-surface-elevated border-b border-gray-200 dark:border-gray-800 p-4 pt-[env(safe-area-inset-top,16px)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MousePointer className="h-6 w-6 text-teal-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-rounded">
                Draw Your Floor Plan
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tap to add corner points of your room
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        {/* Instructions */}
        <div className="w-full max-w-md mb-4">
          <div className="bg-pet-surface-elevated rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                <MousePointer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  How to draw
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Tap each corner of your room</li>
                  <li>• Points will connect automatically</li>
                  <li>• Need at least 3 points to finish</li>
                  <li>• Green line shows closing edge</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onClick={handleCanvasClick}
            className="border-2 border-gray-200 dark:border-gray-700 rounded-xl cursor-crosshair bg-white dark:bg-gray-800 shadow-lg"
            style={{ 
              width: canvasSize.width, 
              height: canvasSize.height,
              touchAction: 'manipulation'
            }}
          />
          
          {/* Point counter overlay */}
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Points: {points.length}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="w-full max-w-md mb-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-3">
            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              {points.length > 0 && (
                <>
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Undo
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* Primary Action */}
            <button
              onClick={handleFinish}
              disabled={!canFinish}
              className="flex items-center gap-2 px-6 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Finish'}
            </button>
          </div>
        </div>
      </div>

      {/* Safe area bottom padding */}
      <div className="pb-[env(safe-area-inset-bottom,16px)]" />
    </div>
  )
} 