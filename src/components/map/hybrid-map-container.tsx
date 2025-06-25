'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MapProvider, useMapContext } from './map-context';
import { CanvasMap } from './canvas-map';
import { BeaconMarkers } from './beacon-markers';
import { LocationLabels } from './location-labels';
import { SafeZones } from './safe-zones';
import { PetMarker } from './pet-marker';
import { MapControls } from './map-controls';
import { SafeZoneEditor } from './safe-zone-editor';
import { UnifiedFloorPlan } from '../unified-floor-plan';
import { Position } from './types';

interface HybridMapContainerProps {
  className?: string;
  floorplanImage?: string;
  showBeacons?: boolean;
  onPetPositionChange?: (position: Position) => void;
  realBeacons?: any[];
  petPosition?: { x: number; y: number };
  isLiveTracking?: boolean;
  useCanvasMode?: boolean; // New prop to control rendering mode
  isTrackingMode?: boolean; // New prop to lock beacons in tracking mode
}

export function HybridPetLocationMap({
  className,
  floorplanImage = '/floorplan.png',
  showBeacons = true,
  onPetPositionChange,
  realBeacons = [],
  petPosition,
  isLiveTracking = false,
  useCanvasMode = false, // Default to DOM mode for now
  isTrackingMode = false
}: HybridMapContainerProps) {
  return (
    <MapProvider 
      showBeacons={showBeacons} 
      onPetPositionChange={onPetPositionChange}
      realBeacons={realBeacons}
      petPosition={petPosition}
      isLiveTracking={isLiveTracking}
      isTrackingMode={isTrackingMode}
    >
      <HybridMapContainerInner 
        className={className} 
        floorplanImage={floorplanImage}
        useCanvasMode={useCanvasMode}
        isLiveTracking={isLiveTracking}
        isTrackingMode={isTrackingMode}
      />
    </MapProvider>
  );
}

interface HybridMapContainerInnerProps {
  className?: string;
  floorplanImage?: string;
  useCanvasMode?: boolean;
  isLiveTracking?: boolean;
  isTrackingMode?: boolean;
}

function HybridMapContainerInner({
  className,
  floorplanImage,
  useCanvasMode = false,
  isLiveTracking = false,
  isTrackingMode = false
}: HybridMapContainerInnerProps) {
  // Get context values
  const { 
    mapRef, 
    handleMouseMove, 
    handleMouseUp, 
    handleMapClick,
    isCreatingSafeZone,
    editingSafeZoneId,
    showBeacons,
    isTrackingMode: contextIsTrackingMode,
    beacons,
    setBeacons,
    realBeacons,
    safeZones,
    pet,
    setPet
  } = useMapContext();
  
  // Local state for Canvas/DOM mode toggle
  const [canvasMode, setCanvasMode] = useState(useCanvasMode);

  // Use the prop value, fallback to context value
  const effectiveTrackingMode = isTrackingMode || contextIsTrackingMode;

  // Use canvas mode if explicitly requested
  if (canvasMode) {
    return (
      <div className={cn("relative w-full h-full", className)}>
        <CanvasMap
          className="w-full h-full"
          floorplanImage={floorplanImage}
          petPosition={pet.position}
          beacons={beacons}
          realBeacons={realBeacons}
          safeZones={safeZones}
          isLiveTracking={isLiveTracking}
          onPetPositionChange={setPet ? (pos) => setPet({ ...pet, position: pos }) : undefined}
          onBeaconDrag={(id, position) => {
            if (setBeacons) {
              setBeacons(beacons.map(beacon => 
                beacon.id === id ? { ...beacon, position } : beacon
              ));
            }
          }}
        />
        
        {/* Canvas Mode Toggle */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={() => setCanvasMode(!canvasMode)}
            className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <span>🖼️</span>
            <span>Canvas Mode</span>
          </button>
        </div>
      </div>
    );
  }

  // DOM-based rendering with unified floor plan
  return (
    <div className={cn("relative w-full h-full", className)}>
      <UnifiedFloorPlan
        ref={mapRef}
        className="bg-white dark:bg-gray-800"
        style={{ 
          cursor: isCreatingSafeZone ? 'crosshair' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleMapClick}
      >
        {/* Safe Zones */}
        {!effectiveTrackingMode && <SafeZones />}

        {/* Location Labels */}
        <LocationLabels />

        {/* Beacons */}
        {showBeacons && <BeaconMarkers />}
        
        {/* Pet Position */}
        <PetMarker />
      </UnifiedFloorPlan>

      {/* Controls for Safe Zone Drawing */}
      {!effectiveTrackingMode && <SafeZoneEditor />}

      {/* Map Controls with Canvas/DOM toggle */}
      <MapControls />
      
      {/* Canvas Mode Toggle */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-2">
        <button
          onClick={() => setCanvasMode(!canvasMode)}
          className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <span>🖼️</span>
          <span>DOM Mode</span>
        </button>
      </div>
    </div>
  );
} 