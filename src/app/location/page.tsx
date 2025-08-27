'use client';

import { useState, useEffect } from 'react';
import { MapPin, Bell, Activity, LayoutDashboard, History, User, Settings, Wifi, BatteryMedium, Grid, Home, Plus, Camera, AlertCircle } from 'lucide-react';
import { HybridPetLocationMap } from '@/components/map/hybrid-map-container';
import { LocationLayout } from '@/components/location/layout';
import { LocationList } from '@/components/location/location-list';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  BeaconStatus, 
  LocationHistoryItem, 
  MapOption,
  mockBeaconStatus,
  mockLocationHistory, 
  mockMapOptions 
} from '@/lib/mock-data';
import { PageLayout } from '@/components/page-layout';
import { triangulationToMap } from '@/components/map/coordinate-system';
import { PositionSmoothingFilter } from '@/components/map/position-filter';
import { usePetgStore } from '@/lib/store';


export default function LocationPage() {
  const [petName, setPetName] = useState('Max');
  const [lastConnected, setLastConnected] = useState('Just now');
  const [petActivity, setPetActivity] = useState<'active' | 'resting' | 'sleeping'>('active');
  const [petPosition, setPetPosition] = useState({ x: 50, y: 50 });
  const [selectedMap, setSelectedMap] = useState<string>('home');
  const [showMapSelector, setShowMapSelector] = useState(false);

  // Real collar data
  const [realBeacons, setRealBeacons] = useState<any[]>([]);
  const [collarPosition, setCollarPosition] = useState<{ x: number; y: number; valid: boolean; confidence?: number; timestamp?: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Get connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const rawCollarData = usePetgStore((state) => state.lastCollarData);
  const lastDataReceived = usePetgStore((state) => state.lastDataReceived);
  
  // Extract specific data from collar data
  const systemState = rawCollarData?.system_state || 'normal';
  const batteryLevel = rawCollarData?.battery_level || rawCollarData?.battery || 100;
  const alertActive = rawCollarData?.alert_active || rawCollarData?.alerts?.active || false;

  // Position smoothing filter
  const [positionFilter] = useState(() => new PositionSmoothingFilter(5, 0.4, 3.0));

  // Fallback to mock data for UI demonstration
  const [beacons, setBeacons] = useState<BeaconStatus[]>(mockBeaconStatus);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>(mockLocationHistory);
  
  // Various map options user could select
  const mapOptions: MapOption[] = mockMapOptions;

  // Process collar data from global store
  useEffect(() => {
    if (!isConnected || !rawCollarData) {
      setLastUpdate(null);
      return;
    }
    
    // Update beacon data
    if (rawCollarData.beacons && Array.isArray(rawCollarData.beacons)) {
      setRealBeacons(rawCollarData.beacons);
      console.log(`📡 Location: Using ${rawCollarData.beacons.length} beacons from global store`);
    }
    
    // Update position data if available
    if (rawCollarData.position) {
      setCollarPosition(rawCollarData.position);
      if (rawCollarData.position.valid) {
        // Apply smoothing filter to reduce noise
        const smoothedPosition = positionFilter.addPosition({
          x: rawCollarData.position.x,
          y: rawCollarData.position.y,
          timestamp: rawCollarData.position.timestamp || Date.now(),
          confidence: rawCollarData.position.confidence
        });
        
        // Convert smoothed triangulation coordinates to map coordinates
        const mapPosition = triangulationToMap(smoothedPosition);
        setPetPosition(mapPosition);
        console.log(`📍 Position: Raw (${rawCollarData.position.x.toFixed(2)}, ${rawCollarData.position.y.toFixed(2)}) → Smoothed (${smoothedPosition.x.toFixed(2)}, ${smoothedPosition.y.toFixed(2)}) → Map (${mapPosition.x.toFixed(1)}%, ${mapPosition.y.toFixed(1)}%)`);
      }
    }
    
    // Update activity based on system state
    if (rawCollarData.system_state) {
      switch (rawCollarData.system_state) {
        case 'alert':
          setPetActivity('active');
          break;
        case 'lowBattery':
          setPetActivity('resting');
          break;
        default:
          setPetActivity('resting');
      }
    }
    
    // Update last update time
    if (lastDataReceived > 0) {
      setLastUpdate(new Date(lastDataReceived));
    }
    
  }, [isConnected, rawCollarData, lastDataReceived]);

  // Update pet position when it changes in the map component
  const handlePetPositionChange = (position: { x: number; y: number }) => {
    // Use functional update to prevent stale state issues
    setPetPosition(prevPosition => ({ ...position }));
    
    // Simulated activity change based on position using functional updates
    setPetActivity(prevActivity => {
      // This would normally be determined by actual movement data
      if (position.x < 30 && position.y < 30) {
        return 'sleeping';
      } else if (position.x > 70 || position.y > 70) {
        return 'active';
      } else {
        return 'resting';
      }
    });
  };

  // Close map selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMapSelector) {
        const target = e.target as HTMLElement;
        if (!target.closest('.map-selector-container')) {
          setShowMapSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMapSelector]);

  return (
    <LocationLayout
      mapComponent={
        <div className="h-full relative">
          <HybridPetLocationMap 
            floorplanImage="/floorplan.png"
            onPetPositionChange={handlePetPositionChange}
            showBeacons={true}
            realBeacons={realBeacons}
            petPosition={petPosition}
            isLiveTracking={isConnected && collarPosition?.valid}
            isTrackingMode={true}
          />
        </div>
      }
      listComponent={<LocationList />}
      actionBar={
        <div className="p-4">
          {/* Connection Status Banner */}
          <div className={cn(
            "mb-4 p-3 rounded-lg border",
            isConnected ? "bg-green-50 border-green-200 text-green-800" : "bg-orange-50 border-orange-200 text-orange-800"
          )}>
            <div className="flex items-center gap-2">
              <Wifi className={cn("h-4 w-4", isConnected ? "text-green-600" : "text-orange-600")} />
              <span className="font-medium text-sm">
                {isConnected ? "Live tracking active" : "Collar disconnected - showing demo data"}
              </span>
              {lastUpdate && (
                <span className="text-xs">
                  • Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Header and Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Location Tracking</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Track {petName}'s real-time position and movement
                {realBeacons.length > 0 && ` • ${realBeacons.length} beacons detected`}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Setup Button */}
              <Link 
                href="/location-setup"
                className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Setup</span>
              </Link>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className={cn(
                  "h-3 w-3 rounded-full", 
                  alertActive ? "bg-red-500 animate-pulse" :
                  petActivity === 'active' ? "bg-green-500 animate-pulse" : 
                  petActivity === 'resting' ? "bg-orange-500" : 
                  "bg-blue-500"
                )} />
                <span className="text-sm font-medium capitalize">
                  {alertActive ? 'Alert' : petActivity}
                </span>
              </div>

              {/* Battery indicator */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <BatteryMedium className={cn(
                  "h-4 w-4", 
                  batteryLevel > 50 ? "text-green-500" : 
                  batteryLevel > 20 ? "text-orange-500" : 
                  "text-red-500"
                )} />
                <span className="text-sm font-medium">{batteryLevel}%</span>
              </div>
            </div>
          </div>

          {/* Real Position Data (if available) */}
          {collarPosition?.valid && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Live Position Data
              </h2>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">X:</span>
                  <span className="font-mono ml-1">{collarPosition.x.toFixed(2)}m</span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Y:</span>
                  <span className="font-mono ml-1">{collarPosition.y.toFixed(2)}m</span>
                </div>
                {collarPosition.confidence !== undefined && (
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Conf:</span>
                    <span className={cn(
                      "font-mono ml-1",
                      collarPosition.confidence >= 80 ? "text-green-600 dark:text-green-400" :
                      collarPosition.confidence >= 60 ? "text-orange-600 dark:text-orange-400" :
                      "text-red-600 dark:text-red-400"
                    )}>{collarPosition.confidence}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      }
    >
      {/* Additional modals and overlays can go here */}
    </LocationLayout>
  );
} 