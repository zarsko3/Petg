'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MapProvider, useMapContext } from './map-context';
import { BeaconMarkers } from './beacon-markers';
import { LocationLabels } from './location-labels';
import { SafeZones } from './safe-zones';
import { PetMarker } from './pet-marker';
import { MapControls } from './map-controls';
import { SafeZoneEditor } from './safe-zone-editor';
import { UnifiedFloorPlan } from '../unified-floor-plan';
import { Position } from './types';

interface MapContainerProps {
  className?: string;
  floorplanImage?: string;
  showBeacons?: boolean;
  onPetPositionChange?: (position: Position) => void;
  realBeacons?: any[];
  petPosition?: { x: number; y: number };
  isLiveTracking?: boolean;
  isTrackingMode?: boolean;
}

export function PetLocationMap({
  className,
  floorplanImage = '/floorplan.png',
  showBeacons = true,
  onPetPositionChange,
  realBeacons = [],
  petPosition,
  isLiveTracking = false,
  isTrackingMode = false
}: MapContainerProps) {
  return (
    <MapProvider 
      showBeacons={showBeacons} 
      onPetPositionChange={onPetPositionChange}
      realBeacons={realBeacons}
      petPosition={petPosition}
      isLiveTracking={isLiveTracking}
      isTrackingMode={isTrackingMode}
    >
      <MapContainerInner 
        className={className} 
        floorplanImage={floorplanImage} 
      />
    </MapProvider>
  );
}

interface MapContainerInnerProps {
  className?: string;
  floorplanImage: string;
}

function MapContainerInner({
  className,
  floorplanImage
}: MapContainerInnerProps) {
  const { 
    mapRef, 
    handleMouseMove, 
    handleMouseUp, 
    handleMapClick,
    isCreatingSafeZone,
    editingSafeZoneId,
    showBeacons
  } = useMapContext();

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
        <SafeZones />

        {/* Location Labels */}
        <LocationLabels />

        {/* Beacons */}
        {showBeacons && <BeaconMarkers />}
        
        {/* Pet Position */}
        <PetMarker />
      </UnifiedFloorPlan>

      {/* Controls for Safe Zone Drawing */}
      <SafeZoneEditor />

      {/* Map Controls */}
      <MapControls />
    </div>
  );
} 