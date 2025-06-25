'use client';

import React from 'react';
import { Settings, Plus, Home, Eye, EyeOff, Info, Zap, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapContext } from './map-context';

export function MapControls() {
  const {
    showSafeZones,
    setShowSafeZones,
    showBeacons,
    realBeacons,
    beacons,
    startCreatingSafeZone,
    isCreatingSafeZone,
    isTrackingMode
  } = useMapContext();
  
  const [showBeaconInfo, setShowBeaconInfo] = React.useState(false);

  return (
    <>
      {/* Main Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Safe Zones Toggle - Hidden in tracking mode */}
        {!isTrackingMode && (
          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={cn(
              "p-2 rounded-lg shadow-md transition-colors",
              showSafeZones 
                ? "bg-purple-500 text-white" 
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
            title={showSafeZones ? "Hide Safe Zones" : "Show Safe Zones"}
          >
            <Home className="h-4 w-4" />
          </button>
        )}

        {/* Create Safe Zone - Hidden in tracking mode */}
        {!isTrackingMode && (
          <button
            onClick={startCreatingSafeZone}
            disabled={isCreatingSafeZone}
            className={cn(
              "p-2 rounded-lg shadow-md transition-colors",
              isCreatingSafeZone
                ? "bg-purple-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
            title="Create Safe Zone"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Beacon Info Toggle */}
        <button
          onClick={() => setShowBeaconInfo(!showBeaconInfo)}
          className={cn(
            "p-2 rounded-lg shadow-md transition-colors",
            showBeaconInfo 
              ? "bg-blue-500 text-white" 
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
          title="Beacon Information"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Safe Zone Creation Instructions */}
      {isCreatingSafeZone && (
        <div className="absolute top-4 left-4 bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 shadow-lg max-w-sm">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Creating Safe Zone</h3>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Click two points on the map to define the safe zone area. The first click sets the starting corner, 
            the second click completes the zone.
          </p>
        </div>
      )}

      {/* Beacon Information Panel */}
      {showBeaconInfo && (
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg max-w-sm backdrop-blur-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Beacon Legend
          </h3>
          
          <div className="space-y-3 text-sm">
            {/* Configured Beacons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/60 rounded-full border-2 border-blue-500">
                <Wifi className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Configured Beacons</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Pre-configured locations ({beacons.length} total)
                </div>
              </div>
            </div>

            {/* Live Beacons */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/60 rounded-full border-2 border-green-500">
                <Zap className="h-3 w-3 text-green-600 dark:text-green-300" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Live Beacons</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Real-time detection ({realBeacons.length} detected)
                </div>
              </div>
            </div>

            {/* Signal Quality */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="font-medium text-gray-900 dark:text-white mb-2">Signal Quality</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Excellent (-30 to -50 dBm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Good (-50 to -70 dBm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Fair (-70 to -85 dBm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Poor (below -85 dBm)</span>
                </div>
              </div>
            </div>

            {realBeacons.length === 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-orange-600 dark:text-orange-400 text-xs">
                  Connect your collar to see live beacon detection
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 