'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Circle, Rect, Text, Label, Tag, Group } from 'react-konva'
import Konva from 'konva'
import { cn } from '@/lib/utils'

// Style tokens as CSS variables
const STYLE_TOKENS = {
  roomFill: 'rgba(59, 130, 246, 0.15)', // 15% opacity
  zoneFill: 'rgba(239, 68, 68, 0.25)', // 25% opacity
  beacon: '#10b981',
  collar: '#4cc9c8'
} as const

interface Position {
  x: number
  y: number
}

interface Beacon {
  id: string
  name: string
  position: Position
  connected: boolean
  rssi?: number
  batteryLevel?: number
}

interface PetData {
  name: string
  position: Position
  isActive: boolean
}

interface SafeZone {
  id: string
  name: string
  points: Position[]
  color?: string
}

interface Room {
  id: string
  name: string
  points: Position[]
  color?: string
}

interface Tooltip {
  visible: boolean
  x: number
  y: number
  content: string
  type: 'beacon' | 'collar' | 'zone'
  targetId: string
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected'
  connectedDevices: number
  totalDevices: number
}

interface EnhancedKonvaMapProps {
  className?: string
  beacons?: Beacon[]
  petData?: PetData
  safeZones?: SafeZone[]
  rooms?: Room[]
  connectionState?: ConnectionState
  isLiveMode?: boolean
  onMarkerTap?: (type: 'beacon' | 'collar', id: string) => void
  onZoomChange?: (scale: number) => void
  onPanChange?: (x: number, y: number) => void
}

export function EnhancedKonvaMap({
  className,
  beacons = [],
  petData,
  safeZones = [],
  rooms = [],
  connectionState = { status: 'disconnected', connectedDevices: 0, totalDevices: 0 },
  isLiveMode = false,
  onMarkerTap,
  onZoomChange,
  onPanChange
}: EnhancedKonvaMapProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Stage dimensions and transform state
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [stageConfig, setStageConfig] = useState({
    scale: 1,
    x: 0,
    y: 0
  })
  
  // UI state
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    type: 'beacon',
    targetId: ''
  })
  
  const [mounted, setMounted] = useState(false)
  const [lastTouchDistance, setLastTouchDistance] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Responsive sizing with flex layout
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return
      
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      
      // Fill all available space
      setDimensions({ 
        width: rect.width || 800, 
        height: rect.height || 600 
      })
    }

    if (mounted) {
      updateDimensions()
      window.addEventListener('resize', updateDimensions)
      window.addEventListener('orientationchange', updateDimensions)
      
      return () => {
        window.removeEventListener('resize', updateDimensions)
        window.removeEventListener('orientationchange', updateDimensions)
      }
    }
  }, [mounted])

  // Marker size based on zoom level
  const getMarkerSize = useCallback((zoom: number): number => {
    if (zoom <= 0.7) return 18
    if (zoom >= 1.5) return 32
    return 24 // normal
  }, [])

  // Grid redraw logic based on scale
  const shouldShowGrid = useCallback((scale: number): boolean => {
    return Math.abs(scale - 0.5) < 0.1 || Math.abs(scale - 1) < 0.1 || Math.abs(scale - 2) < 0.1
  }, [])

  // Convert percentage to actual coordinates
  const percentToActual = useCallback((percent: Position): Position => {
    return {
      x: (percent.x / 100) * dimensions.width,
      y: (percent.y / 100) * dimensions.height
    }
  }, [dimensions])

  // Clustering logic - markers closer than 20px
  const getClusteredMarkers = useCallback((markers: Beacon[], currentScale: number) => {
    const clustered: Array<{
      id: string
      position: Position
      items: Beacon[]
      type: 'cluster' | 'single'
    }> = []
    
    const processed = new Set<string>()
    const clusterThreshold = 20 / currentScale // Adjust threshold based on zoom
    
    markers.forEach((marker) => {
      if (processed.has(marker.id)) return
      
      const cluster = [marker]
      processed.add(marker.id)
      
      // Find nearby markers for clustering
      markers.forEach((otherMarker) => {
        if (processed.has(otherMarker.id) || marker.id === otherMarker.id) return
        
        const pos1 = percentToActual(marker.position)
        const pos2 = percentToActual(otherMarker.position)
        const distance = Math.sqrt(
          Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
        )
        
        if (distance < clusterThreshold) {
          cluster.push(otherMarker)
          processed.add(otherMarker.id)
        }
      })
      
      if (cluster.length > 1) {
        // Calculate center position for cluster
        const centerX = cluster.reduce((sum, item) => sum + item.position.x, 0) / cluster.length
        const centerY = cluster.reduce((sum, item) => sum + item.position.y, 0) / cluster.length
        
        clustered.push({
          id: `cluster-${marker.id}`,
          position: { x: centerX, y: centerY },
          items: cluster,
          type: 'cluster'
        })
      } else {
        clustered.push({
          id: marker.id,
          position: marker.position,
          items: [marker],
          type: 'single'
        })
      }
    })
    
    return clustered
  }, [percentToActual])

  // Touch/pinch gesture handling
  const getDistance = useCallback((p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }, [])

  const getCenter = useCallback((p1: any, p2: any) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    }
  }, [])

  // Pinch-zoom handler
  const handleTouchMove = useCallback((e: any) => {
    e.evt.preventDefault()
    
    const touch1 = e.evt.touches[0]
    const touch2 = e.evt.touches[1]
    const stage = stageRef.current
    
    if (stage && touch1 && touch2) {
      // Two finger pinch
      const dist = getDistance({
        x: touch1.clientX,
        y: touch1.clientY
      }, {
        x: touch2.clientX,
        y: touch2.clientY
      })
      
      if (lastTouchDistance > 0) {
        const scale = (dist / lastTouchDistance) * stageConfig.scale
        const clampedScale = Math.max(0.3, Math.min(3, scale)) // Limit zoom range
        
        // Get center point between fingers
        const center = getCenter({
          x: touch1.clientX,
          y: touch1.clientY
        }, {
          x: touch2.clientX,
          y: touch2.clientY
        })
        
        // Calculate new position to zoom towards center
        const newX = center.x - (center.x - stageConfig.x) * (clampedScale / stageConfig.scale)
        const newY = center.y - (center.y - stageConfig.y) * (clampedScale / stageConfig.scale)
        
        setStageConfig({
          scale: clampedScale,
          x: newX,
          y: newY
        })
        
        onZoomChange?.(clampedScale)
      }
      
      setLastTouchDistance(dist)
    }
  }, [lastTouchDistance, stageConfig, getDistance, getCenter, onZoomChange])

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(0)
  }, [])

  // Pan handling
  const handleDragEnd = useCallback((e: any) => {
    const newX = e.target.x()
    const newY = e.target.y()
    
    setStageConfig(prev => ({
      ...prev,
      x: newX,
      y: newY
    }))
    
    onPanChange?.(newX, newY)
  }, [onPanChange])

  // Marker tap handler with tooltip positioning
  const handleMarkerTap = useCallback((type: 'beacon' | 'collar', id: string, x: number, y: number, content: string) => {
    // Position tooltip to never leave viewport
    const tooltipWidth = 200
    const tooltipHeight = 80
    
    let tooltipX = x
    let tooltipY = y - tooltipHeight - 10 // Above marker by default
    
    // Adjust if tooltip would go outside viewport
    if (tooltipX + tooltipWidth > dimensions.width) {
      tooltipX = dimensions.width - tooltipWidth - 10
    }
    if (tooltipX < 10) {
      tooltipX = 10
    }
    if (tooltipY < 10) {
      tooltipY = y + 30 // Below marker if no space above
    }
    
    setTooltip({
      visible: true,
      x: tooltipX,
      y: tooltipY,
      content,
      type,
      targetId: id
    })
    
    onMarkerTap?.(type, id)
    
    // Auto-hide tooltip after 3 seconds
    setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }))
    }, 3000)
  }, [onMarkerTap, dimensions])

  // Close tooltip when tapping elsewhere
  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setTooltip(prev => ({ ...prev, visible: false }))
    }
  }, [])

  // Render grid (only at specific zoom levels)
  const renderGrid = useCallback(() => {
    if (!shouldShowGrid(stageConfig.scale)) return null
    
    const gridLines = []
    const spacing = 50
    
    // Vertical lines
    for (let x = 0; x <= dimensions.width; x += spacing) {
      gridLines.push(
        <Rect
          key={`v-${x}`}
          x={x}
          y={0}
          width={1}
          height={dimensions.height}
          fill="rgba(148, 163, 184, 0.2)"
        />
      )
    }
    
    // Horizontal lines
    for (let y = 0; y <= dimensions.height; y += spacing) {
      gridLines.push(
        <Rect
          key={`h-${y}`}
          x={0}
          y={y}
          width={dimensions.width}
          height={1}
          fill="rgba(148, 163, 184, 0.2)"
        />
      )
    }
    
    return gridLines
  }, [stageConfig.scale, dimensions, shouldShowGrid])

  // Render beacons with clustering
  const renderBeacons = useCallback(() => {
    const markerSize = getMarkerSize(stageConfig.scale)
    const clusteredBeacons = getClusteredMarkers(beacons, stageConfig.scale)
    
    return clusteredBeacons.map((cluster) => {
      const actual = percentToActual(cluster.position)
      
      if (cluster.type === 'cluster') {
        // Render cluster
        return (
          <Group key={cluster.id}>
            <Circle
              x={actual.x}
              y={actual.y}
              radius={markerSize + 5}
              fill="#F97316"
              stroke="#FFFFFF"
              strokeWidth={3}
              shadowBlur={8}
              shadowColor="#000000"
              shadowOpacity={0.3}
              onClick={() => {
                const content = `${cluster.items.length} devices`
                handleMarkerTap('beacon', cluster.id, actual.x, actual.y, content)
              }}
            />
            <Text
              x={actual.x}
              y={actual.y}
              text={cluster.items.length.toString()}
              fontSize={12}
              fill="#FFFFFF"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              offsetX={6}
              offsetY={6}
            />
          </Group>
        )
      } else {
        // Render single beacon
        const beacon = cluster.items[0]
        const isConnected = beacon.connected
        
        return (
          <Group key={beacon.id}>
            <Circle
              x={actual.x}
              y={actual.y}
              radius={markerSize}
              fill={STYLE_TOKENS.beacon}
              stroke={isConnected ? "#FFFFFF" : "#EF4444"}
              strokeWidth={3}
              shadowBlur={6}
              shadowColor="#000000"
              shadowOpacity={0.2}
              onClick={() => {
                const content = `${beacon.name}\n${isConnected ? 'Connected' : 'Disconnected'}\n${beacon.rssi ? `${beacon.rssi} dBm` : ''}`
                handleMarkerTap('beacon', beacon.id, actual.x, actual.y, content)
              }}
            />
            {/* Connection indicator */}
            <Circle
              x={actual.x + markerSize * 0.6}
              y={actual.y - markerSize * 0.6}
              radius={4}
              fill={isConnected ? "#22C55E" : "#EF4444"}
            />
          </Group>
        )
      }
    })
  }, [beacons, stageConfig.scale, getMarkerSize, getClusteredMarkers, percentToActual, handleMarkerTap])

  // Render pet collar
  const renderPetCollar = useCallback(() => {
    if (!petData) return null
    
    const markerSize = getMarkerSize(stageConfig.scale)
    const actual = percentToActual(petData.position)
    
    return (
      <Group>
        <Circle
          x={actual.x}
          y={actual.y}
          radius={markerSize}
          fill={STYLE_TOKENS.collar}
          stroke="#FFFFFF"
          strokeWidth={3}
          shadowBlur={8}
          shadowColor="#000000"
          shadowOpacity={0.3}
          onClick={() => {
            const content = `${petData.name}\n${petData.isActive ? 'Active' : 'Inactive'}`
            handleMarkerTap('collar', 'pet', actual.x, actual.y, content)
          }}
        />
        
        {/* Pet icon */}
        <Text
          x={actual.x}
          y={actual.y}
          text="🐕"
          fontSize={markerSize * 0.8}
          align="center"
          verticalAlign="middle"
          offsetX={markerSize * 0.4}
          offsetY={markerSize * 0.4}
        />
      </Group>
    )
  }, [petData, stageConfig.scale, getMarkerSize, percentToActual, handleMarkerTap])

  // Render tooltip (lazy-rendered)
  const renderTooltip = useCallback(() => {
    if (!tooltip.visible) return null
    
    return (
      <Label
        x={tooltip.x}
        y={tooltip.y}
        opacity={0.9}
      >
        <Tag
          fill="#1F2937"
          cornerRadius={8}
          shadowBlur={8}
          shadowColor="#000000"
          shadowOpacity={0.3}
        />
        <Text
          text={tooltip.content}
          fontSize={12}
          padding={12}
          fill="#FFFFFF"
          fontStyle="500"
        />
      </Label>
    )
  }, [tooltip])

  // Live/Demo toggle chip
  const renderLiveChip = useCallback(() => {
    if (connectionState.status !== 'connected' || !isLiveMode) return null
    
    return (
      <Group>
        <Rect
          x={dimensions.width - 100}
          y={20}
          width={80}
          height={30}
          fill="#22C55E"
          cornerRadius={15}
          shadowBlur={4}
          shadowColor="#000000"
          shadowOpacity={0.2}
          opacity={0.9}
        />
        <Text
          x={dimensions.width - 60}
          y={35}
          text="LIVE"
          fontSize={12}
          fill="#FFFFFF"
          fontStyle="bold"
          align="center"
          verticalAlign="middle"
          offsetX={15}
          offsetY={6}
        />
      </Group>
    )
  }, [connectionState.status, isLiveMode, dimensions])

  if (!mounted || dimensions.width === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading enhanced map...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn("w-full h-full flex-1", className)}
      style={{
        // Safe area handling for iPhone notch/bottom bar
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={stageConfig.scale}
        scaleY={stageConfig.scale}
        x={stageConfig.x}
        y={stageConfig.y}
        draggable
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        {/* Grid Layer */}
        <Layer>
          {renderGrid()}
        </Layer>
        
        {/* Beacon Layer */}
        <Layer>
          {renderBeacons()}
        </Layer>
        
        {/* Pet Collar Layer */}
        <Layer>
          {renderPetCollar()}
        </Layer>
        
        {/* UI Layer (tooltips, live chip) */}
        <Layer>
          {renderTooltip()}
          {renderLiveChip()}
        </Layer>
      </Stage>
    </div>
  )
} 