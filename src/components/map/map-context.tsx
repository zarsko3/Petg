'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { MapContextType, Position, CurrentSafeZone } from './types';
import { 
  Beacon, 
  LocationLabel, 
  SafeZone, 
  Pet,
  mockLocationLabels,
  mockSafeZones,
  mockPet
} from '@/lib/mock-data';

// Create the context
const MapContext = createContext<MapContextType | null>(null);

// Hook to use the map context
export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}

interface MapProviderProps {
  children: React.ReactNode;
  showBeacons?: boolean;
  floorplanImage?: string;
  onPetPositionChange?: (position: Position) => void;
  realBeacons?: any[];
  petPosition?: { x: number; y: number };
  isLiveTracking?: boolean; // Add flag to indicate if we're using live data
  isTrackingMode?: boolean; // Add flag to indicate if we're in tracking mode (locks beacons)
}

export function MapProvider({
  children,
  showBeacons = true,
  onPetPositionChange,
  realBeacons = [],
  petPosition,
  isLiveTracking = false,
  isTrackingMode = false
}: MapProviderProps) {
  // Map reference and dimensions
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  // Load beacon positions from setup configuration ONLY - no fallback to mock data
  const [beacons, setBeacons] = useState<Beacon[]>(() => {
    if (typeof window !== 'undefined') {
      const setupData = localStorage.getItem('petg-location-setup');
      if (setupData) {
        try {
          const parsed = JSON.parse(setupData);
          if (parsed.beaconPlacements && Array.isArray(parsed.beaconPlacements)) {
            console.log(`🎯 Loading ${parsed.beaconPlacements.length} beacons from setup configuration`);
            return parsed.beaconPlacements.map((beacon: any) => ({
              id: beacon.id,
              name: beacon.displayName || beacon.name,
              position: beacon.position,
              strength: 75, // Default strength
              batteryLevel: 85, // Default battery
              locked: isTrackingMode // Lock beacons in tracking mode
            }));
          }
        } catch (error) {
          console.warn('Failed to load beacon setup data:', error);
        }
      }
    }
    // Return empty array if no setup data found - NO DUMMY BEACONS
    console.log('📍 No beacon setup data found - starting with empty beacon array');
    return [];
  });

  const [locationLabels, setLocationLabels] = useState<LocationLabel[]>(mockLocationLabels);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]); // Start with empty safe zones

  // Track which label is being edited
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  
  // Track which beacon is being dragged
  const [draggingBeaconId, setDraggingBeaconId] = useState<string | null>(null);
  const [beaconDragOffset, setBeaconDragOffset] = useState({ x: 0, y: 0 });
  
  // Track which label is being dragged
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [labelDragOffset, setLabelDragOffset] = useState({ x: 0, y: 0 });
  
  // Safe zone editing state
  const [isCreatingSafeZone, setIsCreatingSafeZone] = useState(false);
  const [currentSafeZone, setCurrentSafeZone] = useState<CurrentSafeZone>({ 
    startPoint: null, 
    endPoint: null 
  });
  const [editingSafeZoneId, setEditingSafeZoneId] = useState<string | null>(null);
  const [safeZoneNameInput, setSafeZoneNameInput] = useState('Safe Zone');
  const [showSafeZones, setShowSafeZones] = useState(!isTrackingMode); // Disable safe zones in tracking mode

  // Mock pet data
  const [pet, setPet] = useState<Pet>(mockPet);

  // Update pet position from props if provided
  useEffect(() => {
    if (petPosition) {
      console.log(`🐕 Pet position updated: (${petPosition.x.toFixed(1)}%, ${petPosition.y.toFixed(1)}%) - Live: ${isLiveTracking}`);
      setPet(prev => ({
        ...prev,
        position: petPosition,
        lastUpdate: new Date().toISOString(),
        isMoving: false // Stop movement when using live data
      }));
    }
  }, [petPosition, isLiveTracking]);

  // Update beacon signal strength from real beacon data
  useEffect(() => {
    if (realBeacons.length > 0) {
      setBeacons(prev => 
        prev.map(configBeacon => {
          // Try to find matching real beacon
          const matchingRealBeacon = realBeacons.find(realBeacon => 
            configBeacon.name === realBeacon.name ||
            (realBeacon.address && configBeacon.name.toLowerCase().includes(realBeacon.address.slice(-4).toLowerCase()))
          );
          
          if (matchingRealBeacon) {
            // Update with real data
            const signalStrength = Math.max(0, Math.min(100, ((matchingRealBeacon.rssi + 100) / 70) * 100));
            return {
              ...configBeacon,
              strength: Math.round(signalStrength),
              batteryLevel: 85 // Default since real beacons don't provide battery info
            };
          }
          
          return configBeacon;
        })
      );
    }
  }, [realBeacons]);
  
  // Pet in safe zone status
  const [isPetInSafeZone, setIsPetInSafeZone] = useState(false);

  // Calculate map dimensions on mount and window resize
  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        setMapSize({
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight,
        });
      }
    };

    updateMapSize();
    window.addEventListener('resize', updateMapSize);
    return () => window.removeEventListener('resize', updateMapSize);
  }, []);

  // Simulate random pet movement (only when NOT using live tracking)
  useEffect(() => {
    // Skip simulation if we're using live tracking data
    if (isLiveTracking) {
      console.log('🔴 Simulation disabled - using live tracking data');
      return;
    }
    
    console.log('🟡 Simulation enabled - no live tracking data');
    
    // Change movement state periodically
    const stateInterval = setInterval(() => {
      // 15% chance to change movement state
      if (Math.random() < 0.15) {
        setPet(prev => ({ ...prev, isMoving: !prev.isMoving }));
      }
    }, 3000); // Check every 3 seconds
    
    // Move pet when in moving state
    const moveInterval = setInterval(() => {
      if (pet.isMoving) {
        setPet(prev => {
          // Random movement in a direction
          const xChange = (Math.random() * 4) - 2; // -2 to 2
          const yChange = (Math.random() * 4) - 2; // -2 to 2
          
          // Ensure pet stays within bounds
          const newX = Math.max(0, Math.min(100, prev.position.x + xChange));
          const newY = Math.max(0, Math.min(100, prev.position.y + yChange));
          
          const newPosition = { x: newX, y: newY };
          
          // Use requestAnimationFrame to schedule the callback outside of React's render cycle
          if (onPetPositionChange) {
            requestAnimationFrame(() => {
              onPetPositionChange(newPosition);
            });
          }
          
          return {
            ...prev,
            position: newPosition,
            lastUpdate: new Date().toISOString(),
          };
        });
      }
    }, 1000); // Update every second

    return () => {
      clearInterval(stateInterval);
      clearInterval(moveInterval);
    };
  }, [pet.isMoving, onPetPositionChange, isLiveTracking]);

  // Check if pet is in any safe zone
  useEffect(() => {
    if (!showSafeZones) {
      setIsPetInSafeZone(false);
      return;
    }

    const isInSafeZone = safeZones.some(zone => {
      return isPointInRectangle(pet.position, zone.startPoint, zone.endPoint);
    });

    setIsPetInSafeZone(isInSafeZone);
  }, [pet.position, safeZones, showSafeZones]);

  // Function to check if a point is inside a rectangle (for safe zones)
  function isPointInRectangle(
    point: Position, 
    startPoint: Position, 
    endPoint: Position
  ): boolean {
    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);
    
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }

  // Label Functions
  const startEditingLabel = (id: string) => {
    const label = locationLabels.find(l => l.id === id);
    if (label) {
      setEditingLabelId(id);
      setNewLabelName(label.name);
    }
  };

  const saveLabel = () => {
    if (editingLabelId) {
      setLocationLabels(prev => 
        prev.map(label => 
          label.id === editingLabelId 
            ? { ...label, name: newLabelName.trim() || label.name } 
            : label
        )
      );
      setEditingLabelId(null);
    }
  };

  const cancelEditing = () => {
    setEditingLabelId(null);
  };

  const deleteLabel = (id: string) => {
    setLocationLabels(prev => prev.filter(label => label.id !== id));
    if (editingLabelId === id) {
      setEditingLabelId(null);
    }
  };

  // Toggle label lock
  const toggleLabelLock = (id: string) => {
    setLocationLabels(prev => 
      prev.map(label => 
        label.id === id 
          ? { ...label, locked: !label.locked } 
          : label
      )
    );
  };

  // Toggle beacon lock
  const toggleBeaconLock = (id: string) => {
    setBeacons(prev => 
      prev.map(beacon => 
        beacon.id === id 
          ? { ...beacon, locked: !beacon.locked } 
          : beacon
      )
    );
  };

  // Handle label dragging
  const startDraggingLabel = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!mapRef.current) return;
    
    const label = locationLabels.find(l => l.id === id);
    if (label && !label.locked) {
      const rect = mapRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - (label.position.x / 100 * rect.width);
      const offsetY = e.clientY - rect.top - (label.position.y / 100 * rect.height);
      
      setDraggingLabelId(id);
      setLabelDragOffset({ x: offsetX, y: offsetY });
    }
  };

  // Handle beacon dragging
  const startDraggingBeacon = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!mapRef.current) return;
    
    const beacon = beacons.find(b => b.id === id);
    if (beacon && !beacon.locked) {
      const rect = mapRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - (beacon.position.x / 100 * rect.width);
      const offsetY = e.clientY - rect.top - (beacon.position.y / 100 * rect.height);
      
      setDraggingBeaconId(id);
      setBeaconDragOffset({ x: offsetX, y: offsetY });
    }
  };

  // Helper function to handle dragging operations
  const handleDrag = (clientX: number, clientY: number) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    
    // Handle beacon dragging (only if not locked)
    if (draggingBeaconId) {
      const beacon = beacons.find(b => b.id === draggingBeaconId);
      if (beacon && !beacon.locked) {
        const x = ((clientX - rect.left - beaconDragOffset.x) / rect.width) * 100;
        const y = ((clientY - rect.top - beaconDragOffset.y) / rect.height) * 100;

        // Ensure x and y are within bounds (0-100)
        const boundedX = Math.max(0, Math.min(100, x));
        const boundedY = Math.max(0, Math.min(100, y));

        setBeacons(prev => 
          prev.map(beacon => 
            beacon.id === draggingBeaconId 
              ? { ...beacon, position: { x: boundedX, y: boundedY } } 
              : beacon
          )
        );
      }
    }

    // Handle label dragging
    if (draggingLabelId) {
      const x = ((clientX - rect.left - labelDragOffset.x) / rect.width) * 100;
      const y = ((clientY - rect.top - labelDragOffset.y) / rect.height) * 100;

      // Ensure x and y are within bounds (0-100)
      const boundedX = Math.max(0, Math.min(100, x));
      const boundedY = Math.max(0, Math.min(100, y));

      setLocationLabels(prev => 
        prev.map(label => 
          label.id === draggingLabelId 
            ? { ...label, position: { x: boundedX, y: boundedY } } 
            : label
        )
      );
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mapRef.current) return;
    
    // Use the common drag handler
    handleDrag(e.clientX, e.clientY);
    
    // Update end point of safe zone when in creation mode
    if (isCreatingSafeZone && currentSafeZone.startPoint) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Update the end point for preview
      setCurrentSafeZone(prev => ({
        ...prev,
        endPoint: { x, y }
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggingBeaconId(null);
    setDraggingLabelId(null);
  };

  // Global mouse event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Use the common drag handler
      handleDrag(e.clientX, e.clientY);
    };

    const handleGlobalMouseUp = () => {
      setDraggingBeaconId(null);
      setDraggingLabelId(null);
    };

    if (draggingBeaconId || draggingLabelId) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingBeaconId, draggingLabelId, beaconDragOffset, labelDragOffset]);

  // Add new label via double-click
  const addNewLabel = (e: React.MouseEvent) => {
    if (!mapRef.current || editingLabelId !== null || draggingBeaconId !== null || isCreatingSafeZone) return;
    
    // Double click to add a new label
    if (e.detail === 2) {
      e.preventDefault();
      
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const newLabel: LocationLabel = {
        id: `label-${Date.now()}`,
        name: 'New Room',
        position: { x, y },
        locked: false
      };
      
      setLocationLabels(prev => [...prev, newLabel]);
      setEditingLabelId(newLabel.id);
      setNewLabelName('New Room');
    }
  };

  // Safe zone functions
  const startCreatingSafeZone = () => {
    if (isTrackingMode) return; // Prevent safe zone creation in tracking mode
    setIsCreatingSafeZone(true);
    setCurrentSafeZone({ startPoint: null, endPoint: null });
  };

  const handleMapClick = (e: React.MouseEvent) => { 
    // If we're creating a safe zone, set start or end point
    if (isCreatingSafeZone && mapRef.current) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      if (!currentSafeZone.startPoint) {
        // Set start point on first click
        setCurrentSafeZone({
          startPoint: { x, y },
          endPoint: { x, y }
        });
      } else {
        // Set end point on second click and finish
        setSafeZoneNameInput('Safe Zone');
        setEditingSafeZoneId('new');
      }
    }
    else {
      // Otherwise, handle normal click behavior (for adding labels etc.)
      addNewLabel(e);
    }
  };

  const finishSafeZone = () => {
    if (currentSafeZone.startPoint && currentSafeZone.endPoint) {
      setSafeZoneNameInput('Safe Zone');
      setEditingSafeZoneId('new');
    }
  };

  const saveSafeZone = () => {
    if (editingSafeZoneId && currentSafeZone.startPoint && currentSafeZone.endPoint) {
      if (editingSafeZoneId === 'new') {
        // Create new safe zone
        const newSafeZone: SafeZone = {
          id: `sz-${Date.now()}`,
          name: safeZoneNameInput.trim() || 'Safe Zone',
          startPoint: currentSafeZone.startPoint,
          endPoint: currentSafeZone.endPoint
        };
        setSafeZones(prev => [...prev, newSafeZone]);
      } else {
        // Update existing safe zone
        setSafeZones(prev => 
          prev.map(zone => 
            zone.id === editingSafeZoneId 
              ? { 
                  ...zone, 
                  name: safeZoneNameInput.trim() || zone.name,
                } 
              : zone
          )
        );
      }
      
      setEditingSafeZoneId(null);
      setCurrentSafeZone({ startPoint: null, endPoint: null });
      setIsCreatingSafeZone(false);
    }
  };

  const cancelSafeZone = () => {
    setEditingSafeZoneId(null);
    setCurrentSafeZone({ startPoint: null, endPoint: null });
    setIsCreatingSafeZone(false);
  };

  const deleteSafeZone = (id: string) => {
    setSafeZones(prev => prev.filter(zone => zone.id !== id));
  };

  // Provide the context value
  const contextValue: MapContextType = {
    mapRef,
    mapSize,
    pet,
    setPet,
    beacons,
    setBeacons,
    realBeacons,
    locationLabels,
    setLocationLabels,
    safeZones,
    setSafeZones,
    showBeacons,
    showSafeZones,
    setShowSafeZones,
    isPetInSafeZone,
    isTrackingMode,
    editingLabelId,
    setEditingLabelId,
    newLabelName,
    setNewLabelName,
    draggingBeaconId,
    setDraggingBeaconId,
    beaconDragOffset,
    setBeaconDragOffset,
    draggingLabelId,
    setDraggingLabelId,
    labelDragOffset,
    setLabelDragOffset,
    isCreatingSafeZone,
    setIsCreatingSafeZone,
    currentSafeZone,
    setCurrentSafeZone,
    editingSafeZoneId,
    setEditingSafeZoneId,
    safeZoneNameInput,
    setSafeZoneNameInput,
    startEditingLabel,
    saveLabel,
    cancelEditing,
    deleteLabel,
    toggleLabelLock,
    toggleBeaconLock,
    startDraggingLabel,
    startDraggingBeacon,
    handleMouseMove,
    handleMouseUp,
    addNewLabel,
    startCreatingSafeZone,
    handleMapClick,
    finishSafeZone,
    saveSafeZone,
    cancelSafeZone,
    deleteSafeZone,
    isPointInRectangle
  };

  return (
    <MapContext.Provider value={contextValue}>
      {children}
    </MapContext.Provider>
  );
} 