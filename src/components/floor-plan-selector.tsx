'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { MapPin, Trash2, Settings, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedFloorPlan, useFloorPlanCoordinates } from './unified-floor-plan';

// Real beacon data from collar system
interface RealBeacon {
  name: string;
  address: string;
  rssi: number;
  distance: number;
  last_seen: number;
  location: string;
  beaconId: string;
}

// Beacon placement with real data integration - ONLY real beacons allowed
interface BeaconPlacement {
  id: string;
  name: string;
  displayName: string; // User-friendly name (e.g., "Sofa", "Trash Bin")
  position: { x: number; y: number }; // Percentage coordinates (0-100)
  realBeacon?: RealBeacon; // Optional - can be undefined during initialization
  behavior: {
    triggerRadius: number;
    alertDelay: number;
    alertType: 'vibration' | 'sound' | 'both';
  };
  locked?: boolean; // For locking after setup completion
}

interface FloorPlanSelectorProps {
  beacons: BeaconPlacement[];
  onBeaconsChange: (beacons: BeaconPlacement[]) => void;
  className?: string;
  isSetupComplete?: boolean; // New prop to lock beacons after setup
  // Calibration support
  customImage?: string;
  calibrationData?: {
    anchorPoint: { x: number; y: number };
    realWorldSize: { width: number; height: number };
    imageSize: { width: number; height: number };
    pixelsPerMeter: number;
  };
}

export function FloorPlanSelector({ 
  beacons, 
  onBeaconsChange, 
  className,
  isSetupComplete = false,
  // Calibration support
  customImage,
  calibrationData
}: FloorPlanSelectorProps) {
  const [draggedBeacon, setDraggedBeacon] = useState<string | null>(null);
  const [selectedBeacon, setSelectedBeacon] = useState<string | null>(null);
  const floorPlanRef = React.useRef<HTMLDivElement>(null);

  // Use unified coordinate system
  const { mouseEventToPercent } = useFloorPlanCoordinates(floorPlanRef);

  // Remove a beacon (only if setup not complete)
  const handleRemoveBeacon = (beaconId: string) => {
    if (isSetupComplete) return; // Prevent removal after setup
    
    onBeaconsChange(beacons.filter(beacon => beacon.id !== beaconId));
    if (selectedBeacon === beaconId) {
      setSelectedBeacon(null);
    }
  };

  // Update beacon display name (only if setup not complete)
  const handleBeaconDisplayNameChange = (beaconId: string, newDisplayName: string) => {
    if (isSetupComplete) return; // Prevent editing after setup
    
    onBeaconsChange(beacons.map(beacon =>
      beacon.id === beaconId ? { ...beacon, displayName: newDisplayName } : beacon
    ));
  };

  // Handle mouse down on beacon (start dragging only if setup not complete)
  const handleBeaconMouseDown = (e: React.MouseEvent, beaconId: string) => {
    if (isSetupComplete) return; // Prevent dragging after setup
    
    e.preventDefault();
    setDraggedBeacon(beaconId);
    setSelectedBeacon(beaconId);
  };

  // Handle mouse move (dragging only if setup not complete)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedBeacon || isSetupComplete) return; // Prevent dragging after setup

    const position = mouseEventToPercent(e);
    
    // Constrain to bounds with margin
    const constrainedX = Math.max(2, Math.min(98, position.x));
    const constrainedY = Math.max(2, Math.min(98, position.y));

    onBeaconsChange(beacons.map(beacon =>
      beacon.id === draggedBeacon 
        ? { ...beacon, position: { x: constrainedX, y: constrainedY } }
        : beacon
    ));
  }, [draggedBeacon, beacons, onBeaconsChange, mouseEventToPercent, isSetupComplete]);

  // Handle mouse up (stop dragging)
  const handleMouseUp = useCallback(() => {
    setDraggedBeacon(null);
  }, []);

  // NO manual beacon creation - removed handleFloorPlanClick

  const selectedBeaconData = beacons.find(b => b.id === selectedBeacon);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Beacon Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-purple-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Beacon Placement
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {beacons.length} beacon{beacons.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {beacons.length} Real Beacons
          </p>
          {isSetupComplete && (
            <p className="text-xs text-orange-500 dark:text-orange-400">
              🔒 Setup Complete - Positions Locked
            </p>
          )}
        </div>
      </div>

      {/* Setup Complete Warning */}
      {isSetupComplete && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-medium text-orange-900 dark:text-orange-100">
              Beacon Setup Complete
            </p>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Beacon positions are locked. To make changes, restart the setup process.
            </p>
          </div>
        </div>
      )}

      {/* Floor Plan with Unified Scaling */}
      <div className="relative">
        <UnifiedFloorPlan
          ref={floorPlanRef}
          className={cn(
            "border-2 border-gray-200 dark:border-gray-700",
            isSetupComplete ? "cursor-default" : "cursor-crosshair"
          )}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          customImage={customImage}
          calibrationData={calibrationData}
          // Removed onClick for manual beacon creation
        >
          {/* Beacon Markers */}
          {beacons.map((beacon) => (
            <div
              key={beacon.id}
              className={cn(
                "absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
                isSetupComplete 
                  ? "cursor-default" 
                  : "cursor-move hover:scale-110",
                selectedBeacon === beacon.id 
                  ? "scale-125 z-20" 
                  : "z-10",
                draggedBeacon === beacon.id && "scale-125 z-30"
              )}
              style={{
                left: `${beacon.position.x}%`,
                top: `${beacon.position.y}%`,
              }}
              onMouseDown={(e) => handleBeaconMouseDown(e, beacon.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBeacon(beacon.id);
              }}
            >
              {/* Beacon Icon */}
              <div className={cn(
                "w-full h-full rounded-full border-2 flex items-center justify-center text-white text-xs font-bold shadow-lg",
                "bg-purple-500 border-purple-600", // Only real beacons now
                selectedBeacon === beacon.id && "ring-2 ring-white ring-offset-2",
                isSetupComplete && "opacity-90" // Slightly dimmed when locked
              )}>
                📡
              </div>
              
              {/* Beacon Label */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-black/75 text-white text-xs rounded whitespace-nowrap pointer-events-none">
                {beacon.displayName}
                {isSetupComplete && " 🔒"}
              </div>
            </div>
          ))}
        </UnifiedFloorPlan>
      </div>

      {/* Real Beacons Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Real Beacons ({beacons.length})
          </h3>
        </div>

        {beacons.length > 0 ? (
          <div className="space-y-3">
            {beacons.map((beacon) => (
              <div
                key={beacon.id}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all cursor-pointer",
                  selectedBeacon === beacon.id
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600",
                  isSetupComplete && "opacity-75"
                )}
                onClick={() => setSelectedBeacon(beacon.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      {!isSetupComplete ? (
                        <input
                          type="text"
                          value={beacon.displayName}
                          onChange={(e) => handleBeaconDisplayNameChange(beacon.id, e.target.value)}
                          className="font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-1"
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Enter friendly name (e.g., Sofa, Kitchen)"
                        />
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-white">
                          {beacon.displayName} 🔒
                        </span>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {beacon.name} • RSSI: {beacon.realBeacon?.rssi ?? 'N/A'}dBm • {beacon.realBeacon?.distance?.toFixed(1) ?? 'N/A'}m
                        {!beacon.realBeacon && (
                          <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                            DATA MISSING
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Position: {beacon.position.x.toFixed(1)}%, {beacon.position.y.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBeacon(beacon.id);
                      }}
                      className="p-2 text-gray-500 hover:text-purple-500 transition-colors"
                      title="Configure beacon"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    {!isSetupComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBeacon(beacon.id);
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        title="Remove beacon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              No Beacons Available
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Make sure your beacons are powered on and detected by the collar
            </p>
          </div>
        )}

        {/* Selected Beacon Configuration */}
        {selectedBeaconData && (
          <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <h4 className="font-medium mb-3 text-purple-900 dark:text-purple-100">
              Configure {selectedBeaconData.displayName}
              <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded">REAL</span>
              {isSetupComplete && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-1 rounded">LOCKED</span>}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-purple-800 dark:text-purple-200">
                  Trigger Radius (cm)
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={selectedBeaconData.behavior.triggerRadius}
                  onChange={(e) => {
                    if (isSetupComplete) return; // Prevent changes after setup
                    const updatedBeacons = beacons.map(beacon =>
                      beacon.id === selectedBeacon
                        ? { ...beacon, behavior: { ...beacon.behavior, triggerRadius: parseInt(e.target.value) } }
                        : beacon
                    );
                    onBeaconsChange(updatedBeacons);
                  }}
                  className="w-full"
                  disabled={isSetupComplete}
                />
                <div className="flex justify-between text-xs mt-1 text-purple-600 dark:text-purple-400">
                  <span>1cm</span>
                  <span>{selectedBeaconData.behavior.triggerRadius}cm</span>
                  <span>20cm</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-purple-800 dark:text-purple-200">
                  Alert Delay (seconds)
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={selectedBeaconData.behavior.alertDelay}
                  onChange={(e) => {
                    if (isSetupComplete) return; // Prevent changes after setup
                    const updatedBeacons = beacons.map(beacon =>
                      beacon.id === selectedBeacon
                        ? { ...beacon, behavior: { ...beacon.behavior, alertDelay: parseInt(e.target.value) } }
                        : beacon
                    );
                    onBeaconsChange(updatedBeacons);
                  }}
                  className="w-full"
                  disabled={isSetupComplete}
                />
                <div className="flex justify-between text-xs mt-1 text-purple-600 dark:text-purple-400">
                  <span>Instant</span>
                  <span>{selectedBeaconData.behavior.alertDelay}s</span>
                  <span>10s</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-purple-800 dark:text-purple-200">
                  Alert Type
                </label>
                <div className="flex gap-2">
                  {(['vibration', 'sound', 'both'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        if (isSetupComplete) return; // Prevent changes after setup
                        const updatedBeacons = beacons.map(beacon =>
                          beacon.id === selectedBeacon
                            ? { ...beacon, behavior: { ...beacon.behavior, alertType: type } }
                            : beacon
                        );
                        onBeaconsChange(updatedBeacons);
                      }}
                      className={cn(
                        "px-3 py-1 rounded text-sm font-medium transition-colors",
                        selectedBeaconData.behavior.alertType === type
                          ? "bg-purple-500 text-white"
                          : "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-600",
                        isSetupComplete && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={isSetupComplete}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placement Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Real Beacon System
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>Only real beacons</strong> detected by your collar are shown</li>
            <li>• <strong>No manual beacons</strong> - all beacons must be physically present</li>
            <li>• Drag beacons to match their real-world position on the floor plan</li>
            <li>• Rename beacons with friendly names like "Sofa", "Kitchen", "Trash Bin"</li>
            <li>• {isSetupComplete ? "Positions are locked after setup completion" : "Complete setup to lock beacon positions"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 