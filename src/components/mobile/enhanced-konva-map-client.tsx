'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Style tokens as CSS variables
const STYLE_TOKENS = {
  roomFill: 'rgba(59, 130, 246, 0.15)', // 15% opacity
  zoneFill: 'rgba(239, 68, 68, 0.25)', // 25% opacity
  beacon: '#10b981',
  beaconSelected: '#059669',
  beaconHover: '#34d399',
  collar: '#4cc9c8',
  collarSelected: '#0891b2',
  collarHover: '#67e8f9',
  disconnectedBeacon: '#ef4444',
  mixedCluster: '#f97316',
  selection: '#8b5cf6',
  selectionRing: 'rgba(139, 92, 246, 0.3)'
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
  type: 'beacon' | 'collar' | 'zone' | 'cluster'
  targetId: string
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected'
  connectedDevices: number
  totalDevices: number
}

interface EnhancedKonvaMapProps {
  className?: string
  floorplanImage?: string
  beacons?: Beacon[]
  petData?: PetData
  safeZones?: SafeZone[]
  rooms?: Room[]
  connectionState?: ConnectionState
  isLiveMode?: boolean
  onMarkerTap?: (type: 'beacon' | 'collar', id: string) => void
  onZoomChange?: (scale: number) => void
  onPanChange?: (x: number, y: number) => void
  selectedMarker?: { type: 'beacon' | 'collar' | 'cluster', id: string }
  centerOnPetRef?: React.RefObject<() => void>
}

// Client-only Konva component
function KonvaMapComponent(props: EnhancedKonvaMapProps) {
  // All hooks need to be at the top of the component to maintain consistent order
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Map pan and zoom state - moved to top to avoid React Hook violations
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [mapScale, setMapScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Loading effect
  useEffect(() => {
    // When component mounts, set loading to false after a brief delay
    // This approach avoids the dynamic import that's causing issues
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Register event listeners for pan/zoom
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);
  
  // Handle touch and mouse events for panning
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - mapPosition.x, y: clientY - mapPosition.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    // Get coordinates without calling preventDefault (which causes issues with passive listeners)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setMapPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Center map on pet location
  const handleCenterOnPet = () => {
    if (props.petData) {
      // Calculate position to center the pet in the viewport
      const containerWidth = mapContainerRef.current?.clientWidth || 0;
      const containerHeight = mapContainerRef.current?.clientHeight || 0;

      // Convert percentage to pixels for the fixed size map
      const petXInPixels = (props.petData.position.x / 100) * 1000; // 1000px is the map width
      const petYInPixels = (props.petData.position.y / 100) * 700;  // 700px is the map height

      // Calculate the position to center the pet
      const newX = (containerWidth / 2) - (petXInPixels * mapScale);
      const newY = (containerHeight / 2) - (petYInPixels * mapScale);

      setMapPosition({ x: newX, y: newY });
    } else {
      // Reset to default view if no pet data available
      setMapPosition({ x: 0, y: 0 });
      setMapScale(1);
    }
  };

  // Expose center function to parent component via ref
  useEffect(() => {
    if (props.centerOnPetRef) {
      props.centerOnPetRef.current = handleCenterOnPet;
    }
  }, [props.centerOnPetRef, handleCenterOnPet]);
  
  // Adjust zoom level
  const handleZoom = (factor: number) => {
    setMapScale(prev => {
      const newScale = Math.max(0.5, Math.min(3, prev * factor));
      return newScale;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading enhanced map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">
          <p className="text-sm">Error loading map: {error}</p>
        </div>
      </div>
    );
  }
  
  // Use a fixed-size map with pan/zoom capabilities
  return (
    <div className="w-full h-full bg-white rounded-2xl relative overflow-hidden">
      <div className="w-full h-full overflow-hidden relative" ref={mapContainerRef}>
        {/* Fixed size map container with transform for pan/zoom */}
        <div 
          style={{
            width: '1000px', // Fixed width for calibration
            height: '700px', // Fixed height for calibration
            position: 'absolute',
            transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapScale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s',
            touchAction: 'none' // Prevent browser handling of touch gestures
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          className="touch-none"
        >
          {/* Static floorplan image */}
          <img 
            src="/images/floorplan.png" 
            alt="Floor Plan" 
            className="w-full h-full object-contain"
            draggable={false}
          />
      
      {/* Pet location marker overlay */}
      {props.petData && (() => {
        const isSelected = props.selectedMarker?.type === 'collar' && props.selectedMarker.id === 'pet';
        return (
          <div 
            className={`absolute ${isSelected ? 'w-8 h-8' : 'w-6 h-6'} rounded-full bg-cyan-500 border-2 ${isSelected ? 'border-violet-500' : 'border-white'} shadow-lg transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all duration-150`}
            style={{
              left: `${props.petData.position.x}%`,
              top: `${props.petData.position.y}%`,
              zIndex: isSelected ? 20 : 10,
              boxShadow: isSelected ? '0 0 0 4px rgba(139, 92, 246, 0.5)' : undefined
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent map drag when clicking marker
              props.onMarkerTap?.('collar', 'pet');
            }}
          >
            <span className="text-xs text-white">🐕</span>
            {isSelected && (
              <div className="absolute -bottom-6 bg-white px-2 py-1 rounded-md shadow-md text-xs whitespace-nowrap">
                {props.petData.name || 'Pet'}
              </div>
            )}
          </div>
        );
      })()}
      
      {/* Beacon markers overlay */}
      {props.beacons?.map(beacon => {
        const isSelected = props.selectedMarker?.type === 'beacon' && props.selectedMarker.id === beacon.id;
        return (
          <div
            key={beacon.id}
            className={`absolute w-5 h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
              beacon.connected ? 'bg-green-500' : 'bg-red-500'
            } border-2 ${isSelected ? 'border-violet-500 w-6 h-6' : 'border-white'} shadow-md transition-all duration-150 cursor-pointer`}
            style={{
              left: `${beacon.position.x}%`,
              top: `${beacon.position.y}%`,
              zIndex: isSelected ? 15 : 5,
              opacity: 0.9,
              boxShadow: isSelected ? '0 0 0 3px rgba(139, 92, 246, 0.5)' : undefined
            }}
            title={beacon.name}
            onClick={(e) => {
              e.stopPropagation(); // Prevent map drag when clicking marker
              props.onMarkerTap?.('beacon', beacon.id);
            }}
          >
            <span className="text-[8px] text-white font-bold">{isSelected ? '✓' : 'B'}</span>
            
            {/* Connection indicator */}
            {!isSelected && (
              <span 
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  beacon.connected ? 'bg-green-300' : 'bg-red-300'
                } border border-white`}
              ></span>
            )}
          </div>
        );
      })}
      
        </div>
            </div>
            {/* Calibration info */}
      <div className="absolute bottom-4 right-4 z-50 bg-white/70 rounded px-2 py-1 text-[10px] text-gray-600">
        Map Size: 1000×700 px
      </div>
      
      {/* Info overlay - fixed to screen */}
      <div
        className="absolute top-2 right-2 bg-white/90 rounded-lg p-3 text-xs shadow-lg max-w-[180px] z-50"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Selected item details */}
        {props.selectedMarker ? (
          <>
            {props.selectedMarker.type === 'beacon' && (() => {
              const beacon = props.beacons?.find(b => b.id === props.selectedMarker?.id);
              return beacon ? (
                <>
                  <div className="font-medium text-sm text-violet-900 mb-1 border-b pb-1 flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${beacon.connected ? 'bg-green-500' : 'bg-red-500'} mr-1.5`}></span>
                    {beacon.name}
                  </div>
                  <p className="text-gray-700 mb-1">
                    Status: {beacon.connected ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className="text-gray-700 mb-1">
                    Position: X: {beacon.position.x.toFixed(1)}%, Y: {beacon.position.y.toFixed(1)}%
                  </p>
                  {beacon.rssi && (
                    <p className="text-gray-700 mb-1">
                      Signal: {beacon.rssi} dBm 
                      ({beacon.rssi > -70 ? 'Strong' : beacon.rssi > -85 ? 'Medium' : 'Weak'})
                    </p>
                  )}
                  {beacon.batteryLevel && (
                    <p className="text-gray-700">Battery: {beacon.batteryLevel}%</p>
                  )}
                </>
              ) : <p className="text-red-500">Beacon not found</p>;
            })()}
            
            {props.selectedMarker.type === 'collar' && props.petData && (
              <>
                <div className="font-medium text-sm text-cyan-800 mb-1 border-b pb-1">
                  {props.petData.name || 'Pet'} Location
                </div>
                <p className="text-gray-700 mb-1">
                  Status: {props.petData.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-gray-700">
                  Position: X: {props.petData.position.x.toFixed(1)}%, Y: {props.petData.position.y.toFixed(1)}%
                </p>
              </>
            )}
            
            <button
              className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-[10px] w-full transition-colors cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={() => props.onMarkerTap?.(undefined as any, "")}
            >
              Clear Selection
            </button>
          </>
        ) : (
          <>
            <p className="font-medium">Beacons: {props.beacons?.length || 0}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">
              {props.beacons?.filter(b => b.connected).length || 0} connected
            </p>
            {props.petData && (
              <p className="text-gray-600 text-[10px] mt-1">
                Pet: {props.petData.name || 'Unknown'} 
                {props.petData.isActive ? ' (Active)' : ' (Inactive)'}
              </p>
            )}
            <p className="text-[9px] text-gray-500 mt-1.5">Drag to pan • Pinch to zoom</p>
          </>
        )}
      </div>
    </div>
  );
}

// The actual Konva rendering component
function KonvaMapRenderer({
  className,
  floorplanImage = '/floorplan.png',
  beacons = [],
  petData,
  safeZones = [],
  rooms = [],
  connectionState = { status: 'disconnected', connectedDevices: 0, totalDevices: 0 },
  isLiveMode = false,
  onMarkerTap,
  onZoomChange,
  onPanChange,
  selectedMarker,
  components
}: EnhancedKonvaMapProps & { components: any }) {
  const { Stage, Layer, Circle, Rect, Text, Label, Tag, Group, Image, Konva } = components
  const stageRef = useRef<any>(null)
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
  
  // Hover state for interactive elements
  const [hoveredMarker, setHoveredMarker] = useState<{type: 'beacon' | 'collar' | 'cluster', id: string} | null>(null)
  
  const [mounted, setMounted] = useState(false)
  const [lastTouchDistance, setLastTouchDistance] = useState(0)
  const [floorplanImageRef, setFloorplanImageRef] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load floorplan image
  useEffect(() => {
    if (floorplanImage) {
      const img = new window.Image()
      img.onload = () => {
        setFloorplanImageRef(img)
      }
      img.src = floorplanImage
    }
  }, [floorplanImage])

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

  // Enhanced clustering logic with grid-based optimization
  const getClusteredMarkers = useCallback((markers: Beacon[], currentScale: number) => {
    const clustered: Array<{
      id: string
      position: Position
      items: Beacon[]
      type: 'cluster' | 'single'
      categoryColors?: string[] // Store different marker categories in cluster
    }> = []
    
    // Skip clustering if we have very few markers or high zoom
    if (markers.length <= 3 || currentScale > 1.8) {
      return markers.map(marker => ({
        id: marker.id,
        position: marker.position,
        items: [marker],
        type: 'single'
      }))
    }
    
    // Adaptive threshold based on zoom and marker density
    const baseThreshold = Math.min(30, Math.max(15, 50 / Math.sqrt(markers.length)))
    const clusterThreshold = baseThreshold / currentScale
    
    // Grid-based spatial partitioning for better performance
    const gridSize = clusterThreshold
    const grid: Record<string, Beacon[]> = {}
    
    // Assign markers to grid cells
    markers.forEach(marker => {
      const pos = percentToActual(marker.position)
      const gridX = Math.floor(pos.x / gridSize)
      const gridY = Math.floor(pos.y / gridSize)
      const cellKey = `${gridX}:${gridY}`
      
      if (!grid[cellKey]) {
        grid[cellKey] = []
      }
      grid[cellKey].push(marker)
    })
    
    // Process grid cells to form clusters
    const processed = new Set<string>()
    
    Object.values(grid).forEach(cellMarkers => {
      // Skip empty cells
      if (cellMarkers.length === 0) return
      
      // Process each marker in the cell
      cellMarkers.forEach(marker => {
      if (processed.has(marker.id)) return
      
        const pos1 = percentToActual(marker.position)
      const cluster = [marker]
      processed.add(marker.id)
      
        // Check only neighboring grid cells (9 total) for better performance
        const markerGridX = Math.floor(pos1.x / gridSize)
        const markerGridY = Math.floor(pos1.y / gridSize)
        
        // Collect markers from current and neighboring cells
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const neighborCellKey = `${markerGridX + i}:${markerGridY + j}`
            const neighborMarkers = grid[neighborCellKey] || []
            
            // Check each neighboring marker
            neighborMarkers.forEach(otherMarker => {
        if (processed.has(otherMarker.id) || marker.id === otherMarker.id) return
        
        const pos2 = percentToActual(otherMarker.position)
        const distance = Math.sqrt(
          Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
        )
        
        if (distance < clusterThreshold) {
          cluster.push(otherMarker)
          processed.add(otherMarker.id)
        }
      })
          }
        }
      
      if (cluster.length > 1) {
          // Calculate weighted center position for cluster
          // Give more weight to markers with stronger signal or more importance
          let totalWeight = 0
          let weightedX = 0
          let weightedY = 0
          
          cluster.forEach(item => {
            // Weight by signal strength if available, otherwise use 1
            const weight = item.rssi ? Math.min(1.5, Math.max(0.5, (100 + item.rssi) / 100)) : 1
            totalWeight += weight
            weightedX += item.position.x * weight
            weightedY += item.position.y * weight
          })
          
          // Get unique categories/types in the cluster for visual representation
          const categoryColors = Array.from(new Set(cluster.map(item => 
            item.connected ? STYLE_TOKENS.beacon : '#EF4444'
          )))
        
        clustered.push({
          id: `cluster-${marker.id}`,
            position: { 
              x: weightedX / totalWeight, 
              y: weightedY / totalWeight 
            },
          items: cluster,
            type: 'cluster',
            categoryColors
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

  // Marker tap handler with tooltip positioning and selection
  const handleMarkerTap = useCallback((type: 'beacon' | 'collar' | 'cluster', id: string, x: number, y: number, content: string) => {
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
    
    // Trigger parent callback
    if (type !== 'cluster') { // Only trigger for non-clusters
    onMarkerTap?.(type, id)
    }
    
    // Auto-hide tooltip after 3 seconds
    setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }))
    }, 3000)
  }, [onMarkerTap, dimensions])

  // Handle stage interactions (clicks and hovers)
  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setTooltip(prev => ({ ...prev, visible: false }))
      setHoveredMarker(null)
    }
  }, [])
  
  // Hover handling for markers
  const handleMarkerHover = useCallback((type: 'beacon' | 'collar' | 'cluster', id: string, isEnter: boolean) => {
    if (isEnter) {
      setHoveredMarker({ type, id })
    } else if (hoveredMarker?.id === id && hoveredMarker?.type === type) {
      setHoveredMarker(null)
    }
  }, [hoveredMarker])

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

  // Render beacons with enhanced clustering visualization, selection and hover effects
  const renderBeacons = useCallback(() => {
    const markerSize = getMarkerSize(stageConfig.scale)
    const clusteredBeacons = getClusteredMarkers(beacons, stageConfig.scale)
    
    return clusteredBeacons.map((cluster) => {
      const actual = percentToActual(cluster.position)
      
      if (cluster.type === 'cluster') {
        // Enhanced cluster visualization
        const clusterSize = cluster.items.length
        const clusterId = cluster.id
        // Scale cluster size visually (not linearly)
        const sizeMultiplier = Math.log10(clusterSize + 1) * 0.5 + 1
        const clusterRadius = markerSize * sizeMultiplier
        
        // Determine if cluster has mixed states (connected/disconnected)
        const hasConnected = cluster.items.some(item => item.connected)
        const hasDisconnected = cluster.items.some(item => !item.connected)
        const isMixed = hasConnected && hasDisconnected
        
        // Selection and hover state
        const isSelected = selectedMarker?.type === 'cluster' && selectedMarker?.id === clusterId
        const isHovered = hoveredMarker?.type === 'cluster' && hoveredMarker?.id === clusterId
        
        // Select color based on content and state
        let fillColor: string = STYLE_TOKENS.mixedCluster // Default orange
        let strokeColor = "#FFFFFF"
        
        if (!hasConnected && hasDisconnected) {
          // All disconnected
          fillColor = STYLE_TOKENS.disconnectedBeacon
        } else if (hasConnected && !hasDisconnected) {
          // All connected
          fillColor = STYLE_TOKENS.beacon
        }
        
        // Apply selection color override
        if (isSelected) {
          strokeColor = STYLE_TOKENS.selection
          if (fillColor === STYLE_TOKENS.mixedCluster) {
            fillColor = "#E97016" // Darker orange
          } else if (fillColor === STYLE_TOKENS.disconnectedBeacon) {
            fillColor = "#DC2626" // Darker red
          } else {
            fillColor = "#059669" // Darker green
          }
        } else if (isHovered) {
          strokeColor = STYLE_TOKENS.selection
        }
        
        return (
          <Group key={cluster.id}>
            {/* Selection indicator ring */}
            {isSelected && (
            <Circle
              x={actual.x}
              y={actual.y}
                radius={clusterRadius + 8}
                fill="transparent"
                stroke={STYLE_TOKENS.selection}
                strokeWidth={2}
                dash={[5, 2]}
              />
            )}
            
            {/* Main circle */}
            <Circle
              x={actual.x}
              y={actual.y}
              radius={clusterRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isSelected || isHovered ? 4 : 3}
              shadowBlur={8}
              shadowColor="#000000"
              shadowOpacity={0.3}
              onClick={() => {
                // Enhanced tooltip content
                let content
                if (isMixed) {
                  const connectedCount = cluster.items.filter(item => item.connected).length
                  content = `${clusterSize} beacons\n${connectedCount} connected\n${clusterSize - connectedCount} disconnected`
                } else {
                  content = `${clusterSize} beacons\n${hasConnected ? 'All connected' : 'All disconnected'}`
                }
                handleMarkerTap('cluster', clusterId, actual.x, actual.y, content)
              }}
              onMouseEnter={() => handleMarkerHover('cluster', clusterId, true)}
              onMouseLeave={() => handleMarkerHover('cluster', clusterId, false)}
              onTouchStart={() => handleMarkerHover('cluster', clusterId, true)}
            />
            
            {/* Count text */}
            <Text
              x={actual.x}
              y={actual.y}
              text={clusterSize.toString()}
              fontSize={Math.max(10, Math.min(16, 10 + clusterSize / 5))}
              fill="#FFFFFF"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              offsetX={6}
              offsetY={6}
            />
            
            {/* Status indicator for mixed clusters */}
            {isMixed && (
              <Circle
                x={actual.x + clusterRadius * 0.6}
                y={actual.y - clusterRadius * 0.6}
                radius={clusterRadius / 4}
                fill="#FCD34D" // Yellow for mixed state
                stroke="#FFFFFF"
                strokeWidth={1}
              />
            )}
            
            {/* Hover effect animation */}
            {isHovered && !isSelected && (
              <Circle
                x={actual.x}
                y={actual.y}
                radius={clusterRadius + 4}
                stroke={STYLE_TOKENS.selectionRing}
                strokeWidth={2}
                opacity={0.7}
              />
            )}
            
            {/* Subtle animation effect for active clusters (5+ items) */}
            {clusterSize >= 5 && !isSelected && !isHovered && (
              <Circle
                x={actual.x}
                y={actual.y}
                radius={clusterRadius + 4}
                stroke={fillColor}
                strokeWidth={2}
                opacity={0.5}
              />
            )}
          </Group>
        )
      } else {
        // Enhanced single beacon rendering with selection and hover states
        const beacon = cluster.items[0]
        const isConnected = beacon.connected
        const signalStrength = beacon.rssi ? Math.min(1, Math.max(0.2, (100 + beacon.rssi) / 100)) : 0.8
        
        // Selection and hover states
        const isSelected = selectedMarker?.type === 'beacon' && selectedMarker?.id === beacon.id
        const isHovered = hoveredMarker?.type === 'beacon' && hoveredMarker?.id === beacon.id
        
        // Color based on state
        let fillColor = isConnected ? 
          (isSelected ? STYLE_TOKENS.beaconSelected : 
           isHovered ? STYLE_TOKENS.beaconHover : 
           STYLE_TOKENS.beacon) : 
          STYLE_TOKENS.disconnectedBeacon
          
        let strokeColor = isSelected || isHovered ? 
          STYLE_TOKENS.selection : 
          (isConnected ? "#FFFFFF" : "#EF4444")
        
        return (
          <Group key={beacon.id}>
            {/* Selection indicator ring */}
            {isSelected && (
              <Circle
                x={actual.x}
                y={actual.y}
                radius={markerSize + 8}
                fill="transparent"
                stroke={STYLE_TOKENS.selection}
                strokeWidth={2}
                dash={[5, 2]}
              />
            )}
            
            {/* Main beacon circle */}
            <Circle
              x={actual.x}
              y={actual.y}
              radius={markerSize}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isSelected || isHovered ? 4 : 3}
              shadowBlur={6}
              shadowColor="#000000"
              shadowOpacity={0.2}
              opacity={signalStrength * 0.5 + 0.5} // Dim beacons with weak signal
              onClick={() => {
                const signalText = beacon.rssi ? 
                  `Signal: ${beacon.rssi < -80 ? 'Weak' : beacon.rssi < -60 ? 'Medium' : 'Strong'} (${beacon.rssi} dBm)` : ''
                const content = `${beacon.name}\n${isConnected ? 'Connected' : 'Disconnected'}\n${signalText}`
                handleMarkerTap('beacon', beacon.id, actual.x, actual.y, content)
              }}
              onMouseEnter={() => handleMarkerHover('beacon', beacon.id, true)}
              onMouseLeave={() => handleMarkerHover('beacon', beacon.id, false)}
              onTouchStart={() => handleMarkerHover('beacon', beacon.id, true)}
            />
            
            {/* Connection indicator with improved visuals */}
            <Circle
              x={actual.x + markerSize * 0.6}
              y={actual.y - markerSize * 0.6}
              radius={markerSize / 5}
              fill={isConnected ? "#22C55E" : "#EF4444"}
              stroke="#FFFFFF"
              strokeWidth={1}
              shadowBlur={3}
              shadowColor="#000000"
              shadowOpacity={0.2}
            />
            
            {/* Hover effect animation */}
            {isHovered && !isSelected && (
              <Circle
                x={actual.x}
                y={actual.y}
                radius={markerSize + 4}
                fill="transparent"
                stroke={STYLE_TOKENS.selectionRing}
                strokeWidth={2}
                opacity={0.7}
              />
            )}
            
            {/* Add signal strength ring for connected beacons */}
            {isConnected && beacon.rssi && !isSelected && !isHovered && (
              <Circle
                x={actual.x}
                y={actual.y}
                radius={markerSize + (signalStrength * 5)}
                stroke={STYLE_TOKENS.beacon}
                strokeWidth={1}
                opacity={signalStrength * 0.3}
              />
            )}
          </Group>
        )
      }
    })
  }, [beacons, stageConfig.scale, getMarkerSize, getClusteredMarkers, percentToActual, handleMarkerTap, selectedMarker, hoveredMarker, handleMarkerHover])

  // Render pet collar with enhanced selection and hover states
  const renderPetCollar = useCallback(() => {
    if (!petData) return null
    
    const markerSize = getMarkerSize(stageConfig.scale)
    const actual = percentToActual(petData.position)
    
    const isSelected = selectedMarker?.type === 'collar' && selectedMarker?.id === 'pet'
    const isHovered = hoveredMarker?.type === 'collar' && hoveredMarker?.id === 'pet'
    
    const fillColor = isSelected ? STYLE_TOKENS.collarSelected : 
                     isHovered ? STYLE_TOKENS.collarHover : 
                     STYLE_TOKENS.collar
    
    return (
      <Group>
        {/* Selection indicator ring (only when selected) */}
        {isSelected && (
          <Circle
            x={actual.x}
            y={actual.y}
            radius={markerSize + 8}
            fill="transparent"
            stroke={STYLE_TOKENS.selection}
            strokeWidth={2}
            dash={[5, 2]}
          />
        )}
        
        {/* Main circle */}
        <Circle
          x={actual.x}
          y={actual.y}
          radius={markerSize}
          fill={fillColor}
          stroke="#FFFFFF"
          strokeWidth={3}
          shadowBlur={8}
          shadowColor="#000000"
          shadowOpacity={0.3}
          onClick={() => {
            const content = `${petData.name}\n${petData.isActive ? 'Active' : 'Inactive'}`
            handleMarkerTap('collar', 'pet', actual.x, actual.y, content)
          }}
          onMouseEnter={() => handleMarkerHover('collar', 'pet', true)}
          onMouseLeave={() => handleMarkerHover('collar', 'pet', false)}
          onTouchStart={() => handleMarkerHover('collar', 'pet', true)}
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
        
        {/* Hover effect animation (would need real Konva.Animation in production) */}
        {isHovered && !isSelected && (
          <Circle
            x={actual.x}
            y={actual.y}
            radius={markerSize + 4}
            fill="transparent"
            stroke={STYLE_TOKENS.collarHover}
            strokeWidth={1.5}
            opacity={0.6}
          />
        )}
      </Group>
    )
  }, [petData, stageConfig.scale, getMarkerSize, percentToActual, handleMarkerTap, selectedMarker, hoveredMarker, handleMarkerHover])

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
        paddingRight: 'env(safe-area-inset-right)',
        pointerEvents: 'auto'
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
        style={{ pointerEvents: 'auto' }}
      >
        {/* Floorplan Layer */}
        <Layer>
          {floorplanImageRef && (
            <Image
              image={floorplanImageRef}
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              opacity={0.8}
            />
          )}
        </Layer>
        
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

// Export the main component
export function EnhancedKonvaMap(props: EnhancedKonvaMapProps) {
  return <KonvaMapComponent {...props} />
}

// Note: We've temporarily disabled the Konva map rendering due to compatibility issues.
// The KonvaMapRenderer function is preserved for reference but not currently used.
/* End of active code */
