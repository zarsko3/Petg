'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Radio, PawPrint } from 'lucide-react'
import { Point2D } from '@/lib/floorPlan'
import { useCollarConnection } from '@/components/collar-service-provider'

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
  onMapReady?: (mapRef: React.RefObject<L.Map>) => void
}

// Helper to create Google Maps-style marker icons
const createMarkerIcon = (type: 'collar' | 'beacon', zoom: number, connected: boolean = true, isLive: boolean = false) => {
  if (type === 'collar') {
    // Google Maps user location style - small circular marker (20-24px)
    const size = Math.max(20, Math.min(24, 18 + zoom * 2))
    const ringSize = size + 8
    
    return L.divIcon({
      html: `
        <div style="
          width: ${ringSize}px; 
          height: ${ringSize}px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          position: relative;
        ">
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            background: #4285F4; 
            border-radius: 50%; 
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4), 0 1px 3px rgba(0,0,0,0.2);
            position: relative;
            z-index: 1000;
          ">
            ${isLive ? `
              <div style="
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                background: #34A853;
                color: white;
                padding: 1px 4px;
                border-radius: 4px;
                font-size: 8px;
                font-weight: 600;
                white-space: nowrap;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
              ">LIVE</div>` : ''
            }
          </div>
          <div style="
            position: absolute;
            width: ${ringSize}px;
            height: ${ringSize}px;
            border: 2px solid #4285F4;
            border-radius: 50%;
            opacity: 0.3;
            animation: ripple 2s infinite ease-out;
          "></div>
        </div>
        <style>
          @keyframes ripple {
            0% { transform: scale(0.8); opacity: 0.3; }
            100% { transform: scale(1.2); opacity: 0; }
          }
        </style>
      `,
      iconSize: [ringSize, ringSize],
      iconAnchor: [ringSize / 2, ringSize / 2],
      className: 'custom-marker marker-collar',
    })
  } else {
    // Google Maps pin style - standard teardrop marker (40px)
    const pinHeight = Math.max(36, Math.min(44, 32 + zoom * 3))
    const pinWidth = Math.round(pinHeight * 0.6)
    const iconSize = Math.round(pinWidth * 0.5)
    
    const pinColor = connected ? '#EA4335' : '#9AA0A6'
    const iconColor = 'white'
    
    return L.divIcon({
      html: `
        <div style="
          width: ${pinWidth}px; 
          height: ${pinHeight}px; 
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        ">
          <svg width="${pinWidth}" height="${pinHeight}" viewBox="0 0 24 32" style="
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                  fill="${pinColor}" 
                  stroke="white" 
                  stroke-width="1"/>
            <circle cx="12" cy="9" r="3" fill="${iconColor}"/>
          </svg>
          ${connected ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              background: #34A853;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            "></div>` : ''
          }
        </div>
      `,
      iconSize: [pinWidth, pinHeight],
      iconAnchor: [pinWidth / 2, pinHeight - 2],
      className: `custom-marker marker-beacon ${connected ? 'connected' : 'disconnected'}`,
    })
  }
}

// Google Maps uses zoom levels from 1-6 for our use case
const getZoomLevel = (leafletZoom: number): number => {
  // Convert Leaflet zoom (2-6) to our internal zoom (1-6)
  return Math.max(1, Math.min(6, leafletZoom))
}

export function MobileLeafletMap({ 
  beacons, 
  petPosition, 
  petName, 
  className = '',
  customFloorPlan,
  onMapReady
}: MobileLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<{ pet?: L.Marker; beacons: L.Marker[] }>({ beacons: [] })
  const [activePopup, setActivePopup] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const isUnmounting = useRef(false)
  const firstRender = useRef(true)
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
    
    // Prevent multiple map instances
    if (mapInstance.current) {
      console.log('🗺️ Map already exists, skipping initialization')
      return
    }
    
    // Block duplicate initialization during Fast Refresh (dev-only)
    if (process.env.NODE_ENV === 'development' && (window as any).__LEAFLET_MAP__) {
      console.log('🚫 Development: Blocking duplicate map initialization')
      return
    }
    
    // Reset unmounting flag when creating a new map
    isUnmounting.current = false
    
    // Additional validation for container
    const container = mapRef.current
    if (!container || !document.contains(container)) {
      console.error('❌ Map container not properly attached to DOM')
      return
    }

    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
      try {
        if (isUnmounting.current || !mapRef.current) return
        
        // Initialize map with ALL animations disabled to prevent classList errors
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
      // Disable ALL animations to prevent DOM classList errors
      panAnimation: false,      // ← Critical: disable pan animations
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
      // Additional performance optimizations - disable inertia/momentum
      inertia: false,
      inertiaDeceleration: 0,
      // Optimized rendering for stability
      preferCanvas: true,
      renderer: L.canvas({ 
        tolerance: 8,
        padding: 0.1
      })
    } as any)

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
        // Enhanced validation before fitBounds
        if (mapInstance.current && map && map.getContainer && typeof map.fitBounds === 'function') {
          const container = map.getContainer()
          if (container && document.contains(container)) {
            map.fitBounds(bounds, { 
              padding: [20, 20],
              animate: false // Disable animation to prevent timing issues
            })
          } else {
            console.warn('⚠️ Map container not found in DOM, skipping fitBounds')
          }
        } else {
          console.warn('⚠️ Map instance invalid for fitBounds')
        }
      } catch (error) {
        console.warn('⚠️ FitBounds failed, using fallback view:', error)
        // Fallback to setView if fitBounds fails
        try {
          if (map && typeof map.setView === 'function' && map.getContainer && map.getContainer()) {
            const container = map.getContainer()
            if (container && document.contains(container)) {
              map.setView([50, 50], 3, { animate: false })
            } else {
              console.error('❌ Map container invalid for setView fallback')
            }
          } else {
            console.error('❌ Map instance is invalid for setView fallback')
          }
        } catch (fallbackError) {
          console.error('❌ Map view setup failed:', fallbackError)
        }
      }
    })

    // Simplified zoom handlers without animations
    map.on('zoomstart', () => {
      try {
        if (isUnmounting.current) return
        setActivePopup(null)
      } catch (error) {
        console.warn('⚠️ Zoomstart handler error:', error)
      }
    })
    
    map.on('zoomend', () => {
      try {
        if (isUnmounting.current) return
        // Call updateMarkerSizes directly without timeout to avoid race conditions
        updateMarkerSizes()
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
    
    // Aggressively patch Leaflet's internal animation system to prevent classList errors
    try {
      // Force disable pan animations at runtime
      (map as any)._panAnim = null;
      (map as any)._zoomAnim = null;
      
      // Override any internal setView calls to force animate: false
      const originalSetView = map.setView;
      map.setView = function(center: any, zoom?: any, options?: any) {
        return originalSetView.call(this, center, zoom, { ...options, animate: false });
      };
      
      // Override panTo to force animate: false
      if (map.panTo) {
        const originalPanTo = map.panTo;
        map.panTo = function(latlng: any, options?: any) {
          return originalPanTo.call(this, latlng, { ...options, animate: false });
        };
      }
      
      // Override flyTo to force animate: false  
      if (map.flyTo) {
        const originalFlyTo = map.flyTo;
        map.flyTo = function(latlng: any, zoom?: any, options?: any) {
          return originalFlyTo.call(this, latlng, zoom, { ...options, animate: false });
        };
      }
      
      console.log('🔒 Map animations completely disabled with runtime patches');
    } catch (patchError) {
      console.warn('⚠️ Animation patch error:', patchError);
    }
    
    // Set development flag to prevent duplicates
    if (process.env.NODE_ENV === 'development') {
      (window as any).__LEAFLET_MAP__ = true
    }
    
    // Call onMapReady callback if provided
    if (onMapReady) {
      onMapReady({ current: map })
    }
    
    console.log('Map initialization complete')
      } catch (error) {
        console.error('❌ Map initialization failed:', error)
      }
    }, 100) // Small delay to ensure DOM is ready

    return () => {
      isUnmounting.current = true
      
      try {
        if (mapInstance.current) {
          const map = mapInstance.current
          
          // Stop any ongoing animations immediately to prevent race conditions
          try {
            map.stop() // Halt any pan/zoom animations
          } catch (stopError) {
            console.warn('⚠️ Map stop error:', stopError)
          }
          
          // Close all popups to prevent reference issues
          try {
            map.closePopup()
          } catch (popupError) {
            console.warn('⚠️ Popup close error:', popupError)
          }
          
          // Clear all event handlers FIRST to prevent callbacks
          try {
            map.off()
          } catch (offError) {
            console.warn('⚠️ Event handler cleanup error:', offError)
          }
          
          // Remove all layers safely
          map.eachLayer((layer) => {
            try {
              map.removeLayer(layer)
            } catch (layerError) {
              console.warn('⚠️ Failed to remove layer:', layerError)
            }
          })
          
          // Wait a brief moment for any pending DOM operations
          setTimeout(() => {
            try {
              if (mapInstance.current === map) {
                map.remove()
                mapInstance.current = null
                
                // Clear development flag
                if (process.env.NODE_ENV === 'development') {
                  delete (window as any).__LEAFLET_MAP__
                }
                
                console.log('🗺️ Map cleaned up successfully')
              }
            } catch (removeError) {
              console.warn('⚠️ Map removal error:', removeError)
              mapInstance.current = null
              
              // Ensure flag is cleared even on error
              if (process.env.NODE_ENV === 'development') {
                delete (window as any).__LEAFLET_MAP__
              }
            }
          }, 50)
        }
      } catch (error) {
        console.warn('⚠️ Map cleanup error:', error)
        mapInstance.current = null // Ensure it's cleared even if removal fails
      }
    }
  }, [mounted]) // Only depend on mounted to prevent re-initialization

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
      const zoomLevel = getZoomLevel(currentZoom)

      // Update beacon markers with enhanced error handling
      markersRef.current.beacons.forEach((marker, index) => {
        try {
          const beacon = beacons[index]
          if (beacon && marker && marker.getElement()) {
            // Check if marker DOM element still exists
            const markerElement = marker.getElement()
            if (markerElement && document.contains(markerElement)) {
              const newIcon = createMarkerIcon('beacon', zoomLevel, beacon.connected)
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
            const newIcon = createMarkerIcon('collar', zoomLevel, true, isLive)
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

  // Update markers when data changes (with optimization to prevent unnecessary updates)
  useEffect(() => {
    if (!mounted || !mapInstance.current || isUnmounting.current) return

    const map = mapInstance.current
    
    // Validate map container still exists before proceeding
    const container = map.getContainer()
    if (!container || !document.contains(container)) {
      console.warn('⚠️ Map container no longer exists, skipping marker update')
      return
    }
    
    const currentZoom = map.getZoom()
    const zoomLevel = getZoomLevel(currentZoom)

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
      const beaconIcon = createMarkerIcon('beacon', zoomLevel, beacon.connected)

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
          const petIcon = createMarkerIcon('collar', zoomLevel, true, isLive)

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

    // Only center map on first render to prevent race conditions
    if (firstRender.current) {
      map.setView([petPosition.y, petPosition.x], currentZoom, { animate: false })
      firstRender.current = false
      console.log('🎯 Centered map on pet (first render only)')
    }
    
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

  // Show enhanced loading state during SSR and initial mount
  if (!mounted) {
    return (
      <div className={`relative ${className} flex items-center justify-center`}>
        <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl border border-slate-200/50 flex items-center justify-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-teal-400 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-blue-400 rounded-full blur-3xl animate-pulse animation-delay-1000" />
          </div>
          
          <div className="text-center relative z-10">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-teal-200 border-t-teal-500 mx-auto" />
              <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-ping" />
            </div>
            <h3 className="text-slate-700 text-lg font-semibold mb-2">Loading Interactive Map</h3>
            <p className="text-slate-500 text-sm">Preparing your pet's location data...</p>
            <div className="flex items-center justify-center gap-1 mt-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce animation-delay-200" />
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce animation-delay-400" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Full-bleed map container - Google Maps style */}
      <div 
        ref={mapRef} 
        className="w-full h-full mobile-map"
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
        
        /* Make sure every Leaflet pane is allowed to spill out */
        .leaflet-marker-pane,
        .leaflet-overlay-pane,
        .leaflet-popup-pane,
        .leaflet-tooltip-pane {
          overflow: visible !important;
        }
        
        /* Ensure proper z-index layering */
        .leaflet-marker-pane {
          z-index: 400 !important;
        }
        
        .leaflet-container {
          background: #f8f9fa !important;
          font-family: 'Inter', system-ui, sans-serif !important;
          border-radius: 0 !important;
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
        
        /* Google Maps style full-bleed map */
        .mobile-map {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        .mobile-map .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          transform: none !important;
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