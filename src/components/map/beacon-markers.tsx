'use client';

import React from 'react';
import { Wifi, Lock, Unlock, Zap, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapContext } from './map-context';
import { getBeaconMapPosition, findMatchingBeacon } from './coordinate-system';

// Convert RSSI to signal strength percentage (same logic as in beacons page)
function rssiToSignalStrength(rssi: number): number {
  const normalized = Math.max(0, Math.min(100, ((rssi + 100) / 70) * 100));
  return Math.round(normalized);
}

// Convert RSSI to distance estimation
function calculateDistance(rssi: number, txPower: number = -59): number {
  if (rssi === 0) return -1.0;
  
  const ratio = rssi * 1.0 / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  } else {
    const accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    return accuracy;
  }
}

export function BeaconMarkers() {
  const { 
    beacons, 
    setBeacons,
    realBeacons, 
    draggingBeaconId, 
    toggleBeaconLock, 
    startDraggingBeacon 
  } = useMapContext();

  // Function to delete a beacon
  const deleteBeacon = (beaconId: string) => {
    setBeacons(beacons.filter(beacon => beacon.id !== beaconId));
  };

  return (
    <>
      {/* Configured Beacons */}
      {beacons.map(beacon => (
        <div 
          key={beacon.id} 
          className={cn(
            "absolute",
            draggingBeaconId === beacon.id && "z-50"
          )}
          style={{
            left: `${beacon.position.x}%`,
            top: `${beacon.position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Signal Strength Indicator */}
          <div 
            className="absolute rounded-full bg-blue-500/10 animate-pulse"
            style={{
              width: `${beacon.strength * 0.8}px`,
              height: `${beacon.strength * 0.8}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          
          {/* Beacon Icon */}
          <div 
            className={cn(
              "relative flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/60 rounded-full border-2 border-blue-500 z-10 group",
              beacon.locked ? "cursor-default" : "cursor-move"
            )}
            onMouseDown={(e) => startDraggingBeacon(e, beacon.id)}
            title={`${beacon.name} - Configured Beacon`}
          >
            <Wifi className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
            
            {/* Control buttons that appear on hover */}
            <div className="absolute -top-2.5 -right-2.5 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              {/* Lock/Unlock button */}
              <button 
                onClick={(e) => { e.stopPropagation(); toggleBeaconLock(beacon.id); }}
                className="p-0.5 rounded-full bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 shadow"
                title={beacon.locked ? "Unlock beacon" : "Lock beacon"}
              >
                {beacon.locked ? (
                  <Lock className="h-2.5 w-2.5 text-blue-500" />
                ) : (
                  <Unlock className="h-2.5 w-2.5 text-blue-500" />
                )}
              </button>
              
              {/* Delete button */}
              <button 
                onClick={(e) => { e.stopPropagation(); deleteBeacon(beacon.id); }}
                className="p-0.5 rounded-full bg-red-50/90 dark:bg-red-900/90 border border-red-200 dark:border-red-600 shadow hover:bg-red-100 dark:hover:bg-red-800"
                title="Delete beacon"
              >
                <span className="text-red-500 text-xs font-bold leading-none">×</span>
              </button>
            </div>
          </div>
          
          {/* Beacon Label */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 shadow-sm rounded-md px-2 py-0.5 text-xs whitespace-nowrap">
            {beacon.name}
          </div>
        </div>
      ))}

      {/* Real Beacons from Collar */}
      {realBeacons.map((realBeacon, index) => {
        // Try to find a matching configured beacon
        const matchedConfiguredBeacon = beacons.find(configBeacon => 
          configBeacon.name === realBeacon.name || 
          (realBeacon.address && configBeacon.name.toLowerCase().includes(realBeacon.address.slice(-4).toLowerCase()))
        );

        // If there's a matched configured beacon, don't show the real beacon separately
        if (matchedConfiguredBeacon) {
          return null;
        }

        const signalStrength = rssiToSignalStrength(realBeacon.rssi);
        const distance = realBeacon.distance || calculateDistance(realBeacon.rssi);
        
        // Try to get the real position for this beacon
        const matchingBeaconName = findMatchingBeacon(realBeacon.name || '');
        const realPosition = matchingBeaconName ? getBeaconMapPosition(matchingBeaconName) : null;
        
        // Use real position if available, otherwise fallback to default positioning
        const position = realPosition || {
          x: 80 + (index * 3) % 15, // Spread them on the right side as fallback
          y: 20 + (index * 15) % 60
        };
        
        // Debug logging for beacon positioning
        if (realPosition) {
          console.log(`📡 Beacon ${realBeacon.name}: Found real position (${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%)`);
        } else {
          console.log(`📡 Beacon ${realBeacon.name}: Using fallback position (${position.x.toFixed(1)}%, ${position.y.toFixed(1)}%)`);
        }

        const status = realBeacon.rssi > -50 ? 'excellent' : 
                     realBeacon.rssi > -70 ? 'good' : 
                     realBeacon.rssi > -85 ? 'fair' : 'poor';

        return (
          <div 
            key={`real-${index}`}
            className="absolute"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Signal Strength Indicator */}
            <div 
              className={cn(
                "absolute rounded-full animate-pulse",
                status === 'excellent' ? "bg-green-500/20" :
                status === 'good' ? "bg-green-400/20" :
                status === 'fair' ? "bg-yellow-500/20" : "bg-red-500/20"
              )}
              style={{
                width: `${Math.max(20, signalStrength * 0.6)}px`,
                height: `${Math.max(20, signalStrength * 0.6)}px`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            
            {/* Real Beacon Icon */}
            <div 
              className={cn(
                "relative flex items-center justify-center w-6 h-6 rounded-full border-2 z-10 shadow-lg",
                status === 'excellent' ? "bg-green-100 dark:bg-green-900/60 border-green-500" :
                status === 'good' ? "bg-green-100 dark:bg-green-900/60 border-green-400" :
                status === 'fair' ? "bg-yellow-100 dark:bg-yellow-900/60 border-yellow-500" :
                "bg-red-100 dark:bg-red-900/60 border-red-500"
              )}
              title={`Live Beacon - ${realBeacon.name || 'Unknown'} 
RSSI: ${realBeacon.rssi} dBm
Distance: ${distance.toFixed(1)}m
Signal: ${signalStrength}%`}
            >
              <Zap className={cn(
                "h-3 w-3",
                status === 'excellent' ? "text-green-600 dark:text-green-300" :
                status === 'good' ? "text-green-500 dark:text-green-400" :
                status === 'fair' ? "text-yellow-600 dark:text-yellow-300" :
                "text-red-600 dark:text-red-300"
              )} />
              
              {/* Live indicator */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Real Beacon Info */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-green-50/95 dark:bg-green-900/80 shadow-sm rounded-md px-2 py-1 text-xs whitespace-nowrap">
              <div className="font-medium text-green-800 dark:text-green-200">
                {realBeacon.name || 'Live Beacon'}
              </div>
              <div className="text-green-600 dark:text-green-300">
                {distance.toFixed(1)}m • {signalStrength}%
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
} 