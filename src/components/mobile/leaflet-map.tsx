'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Radio, PawPrint } from 'lucide-react'
import { Point2D } from '@/lib/floorPlan'
import { useCollarConnection } from '@/context/CollarConnectionContext'

// Extend window to include Leaflet globals for defensive patching
declare global {
  interface Window {
    L: typeof L
  }
}

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface Beacon {
  id: number
  name: string
  x: number
  y: number
  connected: boolean
  rssi: number
  distance: number
}

interface PetPosition {
  x: number
  y: number
}

interface MobileLeafletMapProps {
  beacons: Beacon[]
  petPosition: PetPosition
  petName: string
  className?: string
  customFloorPlan?: Point2D[] | null
}

// Helper to create responsive marker icons based on zoom level
const createMarkerIcon = (type: 'collar' | 'beacon', size: number, connected: boolean = true, isLive: boolean = false) => {
  // Increased base sizes for better visibility
  const displaySize = Math.max(size * 1.5, 36) // Minimum 36px for touch targets
  const iconSize = Math.max(displaySize * 0.6, 20) // Icon within the marker
  
  const iconContent = type === 'collar' 
    ? `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
         <circle cx="11" cy="4" r="2"/>
         <circle cx="18" cy="8" r="2"/>
         <circle cx="12" cy="12" r="3"/>
         <circle cx="6" cy="8" r="2"/>
         <path d="m7 21-3-5"/>
         <path d="m17 21 3-5"/>
       </svg>`
    : `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
         <path d="m12 1 3 3-3 3-3-3z"/>
         <path d="M8 11v6"/>
         <path d="M12 11v6"/>
         <path d="M16 11v6"/>
         <circle cx="12" cy="12" r="1"/>
       </svg>`

  // Much more distinct colors and styling
  const ringColor = type === 'collar' ? '#14B8A6' : (connected ? '#10B981' : '#9CA3AF')
  const bgColor = type === 'collar' 
    ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' // Coral gradient for pet
    : connected 
      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' // Green gradient for connected beacons
      : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)' // Gray for disconnected
  
  const shadowColor = type === 'collar' ? 'rgba(255, 107, 107, 0.4)' : 'rgba(16, 185, 129, 0.3)'
  
  return L.divIcon({
    html: `
      <div class="marker-container" style="
        width: ${displaySize + 8}px; 
        height: ${displaySize + 8}px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        position: relative;
      ">
        <div class="marker-content" style="
          width: ${displaySize}px; 
          height: ${displaySize}px; 
          background: ${bgColor}; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          border: 3px solid ${ringColor};
          box-shadow: 0 4px 12px ${shadowColor}, 0 2px 4px rgba(0,0,0,0.1);
          color: white;
          position: relative;
          z-index: ${type === 'collar' ? '1000' : '100'};
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        ">
          ${iconContent}
          ${connected && type === 'beacon' ? 
            `<div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              background: #10B981;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              animation: pulse 2s infinite;
            "></div>` : ''
          }
          ${type === 'collar' && isLive ? 
            `<div style="
              position: absolute;
              top: -6px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(16, 185, 129, 0.95);
              color: white;
              padding: 2px 6px;
              border-radius: 8px;
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              pointer-events: none;
              animation: pulse 2s infinite;
            ">LIVE</div>` : ''
          }
        </div>
      </div>
      <style>
        .marker-content:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px ${shadowColor}, 0 4px 8px rgba(0,0,0,0.15);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      </style>
    `,
    iconSize: [displaySize + 8, displaySize + 8], // Account for padding
    iconAnchor: [(displaySize + 8) / 2, (displaySize + 8) / 2],
    className: `custom-marker marker-${type} ${connected ? 'connected' : 'disconnected'}`,
  })
}

// Get marker size based on zoom level - increased sizes
const getSizeForZoom = (zoom: number): number => {
  if (zoom >= 6) return 42       // Large when zoomed in
  if (zoom >= 4) return 36       // Medium for normal view
  if (zoom >= 2) return 30       // Minimum readable size
  return 28                      // Very zoomed out
}

export function MobileLeafletMap({ 
  beacons, 
  petPosition, 
  petName, 
  className = '',
  customFloorPlan
}: MobileLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<{ pet?: L.Marker; beacons: L.Marker[] }>({ beacons: [] })
  const [activePopup, setActivePopup] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const isUnmounting = useRef(false)
  const { isLive } = useCollarConnection()

  // Only run on client side
  useEffect(() => {
    // Defensive patch for Leaflet DOM classList error
    if (typeof window !== 'undefined' && window.L && window.L.DomUtil) {
      const originalRemoveClass = window.L.DomUtil.removeClass
      const originalAddClass = window.L.DomUtil.addClass
      
      // Patch removeClass to handle undefined elements
      window.L.DomUtil.removeClass = function(el: any, name: string) {
        try {
          if (el && el.classList && typeof el.classList.remove === 'function') {
            return originalRemoveClass.call(this, el, name)
          }
        } catch (error) {
          console.warn('⚠️ Leaflet removeClass error prevented:', error)
        }
      }
      
      // Patch addClass for consistency
      window.L.DomUtil.addClass = function(el: any, name: string) {
        try {
          if (el && el.classList && typeof el.classList.add === 'function') {
            return originalAddClass.call(this, el, name)
          }
        } catch (error) {
          console.warn('⚠️ Leaflet addClass error prevented:', error)
        }
      }
    }
    
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !mapRef.current) return
    
    // Reset unmounting flag when creating a new map
    isUnmounting.current = false
    
    // Clean up existing map instance first
    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }

    // Initialize map with optimized settings for mobile performance
    const map = L.map(mapRef.current, {
      center: [petPosition.y, petPosition.x],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      maxZoom: 6,
      minZoom: 2,
      // Optimized rendering for stability and performance
      preferCanvas: true,
      renderer: L.canvas({ 
        tolerance: 8, // Better touch handling
        padding: 0.1 // Reduced padding for better performance
      }),
      // Disable all animations for stability
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
      // Additional performance optimizations
      inertia: false,
      inertiaDeceleration: 3000
    })

    // Set pixel ratio for high-DPI displays with performance optimization
    if (window.devicePixelRatio > 1) {
      const container = map.getContainer()
      container.style.imageRendering = 'crisp-edges'
      container.style.imageRendering = '-webkit-optimize-contrast'
      // Remove problematic scale transform - let the map fill naturally
    }

    // Add a simple, static background layer instead of complex SVG grid
    const SimpleBackgroundLayer = L.GridLayer.extend({
      createTile: function() {
        const tile = document.createElement('div')
        tile.style.width = '256px'
        tile.style.height = '256px'
        tile.style.backgroundColor = '#F8FAFC'
        tile.style.backgroundImage = 'linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)'
        tile.style.backgroundSize = '20px 20px'
        tile.style.pointerEvents = 'none' // Prevent interaction
        return tile
      }
    })

    const backgroundLayer = new SimpleBackgroundLayer()
    backgroundLayer.addTo(map)
    
    console.log('🗺️ Map initialized with enhanced performance and cleaner layout')

    // Set bounds with more generous padding - use defensive timing
    const bounds = L.latLngBounds(
      L.latLng(-5, -5),
      L.latLng(105, 105)
    )
    map.setMaxBounds(bounds)
    
    // Use requestAnimationFrame to ensure map is fully ready before fitBounds
    requestAnimationFrame(() => {
      try {
        if (mapInstance.current && map.getContainer()) {
          map.fitBounds(bounds, { 
            padding: [20, 20],
            animate: false // Disable animation to prevent timing issues
          })
        }
      } catch (error) {
        console.warn('⚠️ FitBounds failed, using fallback view:', error)
        // Fallback to setView if fitBounds fails
        try {
          map.setView([50, 50], 3)
        } catch (fallbackError) {
          console.error('❌ Map view setup failed:', fallbackError)
        }
      }
    })

    // Throttled zoom handler for better performance
    let zoomTimeout: ReturnType<typeof setTimeout>
    map.on('zoomstart', () => {
      try {
        // Hide popups during zoom for performance
        setActivePopup(null)
      } catch (error) {
        console.warn('⚠️ Zoomstart handler error:', error)
      }
    })
    
    map.on('zoomend', () => {
      try {
        if (isUnmounting.current) return
        clearTimeout(zoomTimeout)
        zoomTimeout = setTimeout(() => {
          if (!isUnmounting.current) {
            updateMarkerSizes()
          }
        }, 100) // Debounce marker updates
      } catch (error) {
        console.warn('⚠️ Zoomend handler error:', error)
      }
    })

    // Handle map clicks to close popups
    map.on('click', () => {
      try {
        setActivePopup(null)
      } catch (error) {
        console.warn('⚠️ Map click handler error:', error)
      }
    })

    mapInstance.current = map
    console.log('Map initialization complete')

    return () => {
      isUnmounting.current = true
      
      try {
        if (mapInstance.current) {
          // Clear any pending timeouts
          clearTimeout(zoomTimeout)
          
          // Stop all animations before cleanup
          mapInstance.current.stop()
          
          // Close all popups to prevent reference issues
          mapInstance.current.closePopup()
          
          // Remove all layers safely
          mapInstance.current.eachLayer((layer) => {
            try {
              mapInstance.current?.removeLayer(layer)
            } catch (layerError) {
              console.warn('⚠️ Failed to remove layer:', layerError)
            }
          })
          
          // Clear event handlers
          mapInstance.current.off()
          
          // Finally remove the map
          mapInstance.current.remove()
          mapInstance.current = null
        }
      } catch (error) {
        console.warn('⚠️ Map cleanup error:', error)
        mapInstance.current = null // Ensure it's cleared even if removal fails
      }
    }
  }, [mounted, petPosition.x, petPosition.y])

  // Function to update marker sizes based on current zoom
  const updateMarkerSizes = () => {
    if (!mapInstance.current || isUnmounting.current) return

    try {
      const map = mapInstance.current
      
      // Enhanced validation - check if map and DOM container still exist
      const container = map.getContainer()
      if (!container || !document.contains(container)) {
        console.warn('⚠️ Map container no longer exists, skipping marker update')
        return
      }
      
      const currentZoom = map.getZoom()
      const newSize = getSizeForZoom(currentZoom)

      // Update beacon markers with enhanced error handling
      markersRef.current.beacons.forEach((marker, index) => {
        try {
          const beacon = beacons[index]
          if (beacon && marker && marker.getElement()) {
            // Check if marker DOM element still exists
            const markerElement = marker.getElement()
            if (markerElement && document.contains(markerElement)) {
              const newIcon = createMarkerIcon('beacon', newSize, beacon.connected)
              marker.setIcon(newIcon)
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to update beacon marker ${index}:`, error)
        }
      })

      // Update pet marker with enhanced error handling
      if (markersRef.current.pet) {
        try {
          const petMarker = markersRef.current.pet
          const markerElement = petMarker.getElement()
          if (markerElement && document.contains(markerElement)) {
            const newIcon = createMarkerIcon('collar', newSize, true, isLive)
            petMarker.setIcon(newIcon)
          }
        } catch (error) {
          console.warn('⚠️ Failed to update pet marker:', error)
        }
      }
    } catch (error) {
      console.warn('⚠️ updateMarkerSizes failed:', error)
    }
  }

  // Update markers when data changes
  useEffect(() => {
    if (!mounted || !mapInstance.current) return

    const map = mapInstance.current
    const currentZoom = map.getZoom()
    const markerSize = getSizeForZoom(currentZoom)

    // Clear existing markers
    markersRef.current.beacons.forEach(marker => map.removeLayer(marker))
    if (markersRef.current.pet) {
      map.removeLayer(markersRef.current.pet)
    }
    markersRef.current.beacons = []

    console.log(`🎯 Adding ${beacons.length} beacon markers and 1 collar marker`)

    // Add custom floor plan overlay if available
    if (customFloorPlan && customFloorPlan.length >= 3) {
      console.log('🏠 Rendering custom floor plan with', customFloorPlan.length, 'points')
      
      // Convert normalized points (0-100) to map coordinates
      const floorPlanCoords = customFloorPlan.map(point => [
        point.y, // Latitude (Y coordinate) 
        point.x  // Longitude (X coordinate)
      ] as [number, number])
      
      // Create custom floor plan polygon
      const floorPlanPolygon = L.polygon(floorPlanCoords, {
        color: '#3B82F6',
        weight: 3,
        opacity: 0.8,
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        dashArray: '10, 5'
      }).addTo(map)
      
      // Add popup to floor plan
      floorPlanPolygon.bindPopup(`
        <div class="text-center">
          <strong>Custom Room Layout</strong><br/>
          <small>Scanned via AR/Manual drawing</small><br/>
          <small>${customFloorPlan.length} corner points</small>
        </div>
      `, {
        className: 'custom-popup'
      })
      
      // Store reference for cleanup (you might want to add this to a separate ref)
      // floorPlanRef.current = floorPlanPolygon
    }

    // Add beacon markers
    beacons.forEach((beacon, index) => {
      const beaconIcon = createMarkerIcon('beacon', markerSize, beacon.connected)

      const marker = L.marker([beacon.y, beacon.x], { 
        icon: beaconIcon,
        zIndexOffset: 100 // Beacons below collar
      })

      console.log(`📍 Added beacon ${index + 1}: ${beacon.name} at (${beacon.x}, ${beacon.y})`)

      // Add click handler for info popup with smart positioning
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        
        if (activePopup === `beacon-${beacon.id}`) {
          setActivePopup(null)
        } else {
          setActivePopup(`beacon-${beacon.id}`)
          
          // Create custom popup content with better layout
          const popupContent = `
            <div class="marker-popup" style="
              min-width: 160px;
              padding: 12px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.15);
              border: 1px solid rgba(0,0,0,0.1);
              font-family: system-ui, -apple-system, sans-serif;
            ">
              <div class="popup-header" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(0,0,0,0.1);
              ">
                <strong style="
                  font-size: 14px;
                  font-weight: 600;
                  color: #1F2937;
                ">${beacon.name}</strong>
                <span class="status-badge" style="
                  padding: 2px 8px;
                  border-radius: 6px;
                  font-size: 10px;
                  font-weight: 600;
                  background: ${beacon.connected ? '#D1FAE5' : '#FEE2E2'};
                  color: ${beacon.connected ? '#065F46' : '#991B1B'};
                ">
                  ${beacon.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              ${beacon.connected ? `
                <div class="popup-stats" style="
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 8px;
                  font-size: 12px;
                ">
                  <div class="stat" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 6px;
                    background: #F9FAFB;
                    border-radius: 6px;
                  ">
                    <span style="
                      color: #6B7280;
                      font-weight: 500;
                      margin-bottom: 2px;
                    ">Signal</span>
                    <span style="
                      color: #1F2937;
                      font-weight: 600;
                    ">${beacon.rssi || -65} dBm</span>
                  </div>
                  <div class="stat" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 6px;
                    background: #F9FAFB;
                    border-radius: 6px;
                  ">
                    <span style="
                      color: #6B7280;
                      font-weight: 500;
                      margin-bottom: 2px;
                    ">Distance</span>
                    <span style="
                      color: #1F2937;
                      font-weight: 600;
                    ">${beacon.distance || Math.floor(Math.random() * 10 + 1)}m</span>
                  </div>
                </div>
              ` : `
                <div style="
                  text-align: center;
                  color: #6B7280;
                  font-size: 12px;
                  padding: 8px;
                ">
                  Beacon is offline
                </div>
              `}
            </div>
          `
          
          // Smart popup positioning to avoid overlaps
          const mapSize = map.getSize()
          const markerPoint = map.latLngToLayerPoint([beacon.y, beacon.x])
          
          let popupOptions = {
            offset: [0, -35] as [number, number], // Default offset above marker
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: 'custom-popup',
            maxWidth: 200,
            autoPan: true,
            autoPanPadding: [20, 20] as [number, number]
          }
          
          // Adjust popup position if near edges
          if (markerPoint.x > mapSize.x * 0.7) {
            popupOptions.offset = [-80, -10] as [number, number] // Position to the left
          } else if (markerPoint.x < mapSize.x * 0.3) {
            popupOptions.offset = [80, -10] as [number, number] // Position to the right
          } else if (markerPoint.y < mapSize.y * 0.3) {
            popupOptions.offset = [0, 25] as [number, number] // Position below
          }
          
          marker.bindPopup(popupContent, popupOptions).openPopup()
          
          // Bring marker to front
          marker.setZIndexOffset(500)
        }
      })

      marker.addTo(map)
      markersRef.current.beacons.push(marker)
    })

    // Add pet marker (always on top)
    const petIcon = createMarkerIcon('collar', markerSize, true, isLive)

    const petMarker = L.marker([petPosition.y, petPosition.x], { 
      icon: petIcon,
      zIndexOffset: 1000 // Always on top
    })

    // Add click handler for pet marker
    petMarker.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      
      if (activePopup === 'pet') {
        setActivePopup(null)
      } else {
        setActivePopup('pet')
        
        const popupContent = `
          <div class="marker-popup">
            <div class="popup-header">
              <strong>${petName}</strong>
              <span class="status-badge connected">Live</span>
            </div>
            <div class="popup-stats">
              <div class="stat">
                <span class="label">Status:</span>
                <span class="value">Active</span>
              </div>
              <div class="stat">
                <span class="label">Battery:</span>
                <span class="value">87%</span>
              </div>
              <div class="stat">
                <span class="label">Last Update:</span>
                <span class="value">Just now</span>
              </div>
            </div>
          </div>
        `
        
        petMarker.bindPopup(popupContent, {
          offset: [0, -22],
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: 'custom-popup'
        }).openPopup()
      }
    })

    petMarker.addTo(map)
    markersRef.current.pet = petMarker

    console.log(`🐾 Added collar marker for ${petName} at (${petPosition.x}, ${petPosition.y})`)

    // Center map on pet
    map.setView([petPosition.y, petPosition.x], currentZoom)
    
    console.log(`🗺️ Map updated with ${markersRef.current.beacons.length} beacons + 1 collar marker`)

  }, [mounted, beacons, petPosition, petName, activePopup, customFloorPlan, isLive])

  // Close popup when activePopup changes to null
  useEffect(() => {
    if (!activePopup && mapInstance.current) {
      mapInstance.current.closePopup()
      
      // Reset z-index for all markers
      markersRef.current.beacons.forEach(marker => {
        marker.setZIndexOffset(100)
      })
    }
  }, [activePopup])

  // Handle resize events
  useEffect(() => {
    if (!mapInstance.current) return

    const handleResize = () => {
      if (mapInstance.current) {
        // Small delay to ensure container has updated
        setTimeout(() => {
          mapInstance.current?.invalidateSize()
        }, 100)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Show loading state during SSR and initial mount
  if (!mounted) {
    return (
      <div className={`relative ${className} flex items-center justify-center`}>
        <div className="w-full h-full min-h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-200 border-t-teal-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Loading map...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map container with optimized layout */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-xl overflow-hidden mobile-map"
      />
      
      {/* Enhanced CSS for markers and popups */}
      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
          cursor: pointer;
        }
        
        .marker-collar {
          z-index: 1000 !important;
        }
        
        .marker-beacon {
          z-index: 100 !important;
        }
        
        .leaflet-container {
          background: #f8f9fa !important;
          font-family: 'Inter', system-ui, sans-serif !important;
          border-radius: 12px !important;
        }
        
        .custom-popup .leaflet-popup-content-wrapper {
          background: hsl(var(--pet-surface-elevated)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
          padding: 0 !important;
          min-width: 200px;
        }
        
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
        
        .custom-popup .leaflet-popup-tip {
          background: hsl(var(--pet-surface-elevated)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .marker-popup {
          padding: 16px;
          color: hsl(var(--foreground));
        }
        
        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 16px;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.connected {
          background: hsl(var(--pet-primary) / 0.1);
          color: hsl(var(--pet-primary));
        }
        
        .status-badge.disconnected {
          background: hsl(var(--destructive) / 0.1);
          color: hsl(var(--destructive));
        }
        
        .popup-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .stat .label {
          color: hsl(var(--muted-foreground));
          font-size: 12px;
        }
        
        .stat .value {
          font-weight: 500;
          font-size: 12px;
        }
        
        /* Pulse animation for beacon status indicators */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        
        /* Ensure map fills available space correctly */
        .mobile-map {
          min-height: 300px !important;
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        .mobile-map .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          min-height: 300px !important;
          position: relative !important;
          transform: none !important; /* Remove any transform overrides */
        }
        
        /* Touch optimization */
        .custom-marker {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Responsive marker adjustments */
        @media (max-width: 480px) {
          .marker-popup {
            padding: 12px;
          }
          
          .popup-header {
            font-size: 14px;
            margin-bottom: 8px;
          }
          
          .custom-popup .leaflet-popup-content-wrapper {
            min-width: 180px;
          }
        }
      `}</style>
    </div>
  )
} 