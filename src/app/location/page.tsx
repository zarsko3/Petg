'use client';

import { useState, useEffect } from 'react';
import { MapPin, Bell, Activity, LayoutDashboard, History, User, Settings, Wifi, BatteryMedium, Grid, Home, Plus, Camera, AlertCircle } from 'lucide-react';
import { HybridPetLocationMap } from '@/components/map/hybrid-map-container';
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
    <PageLayout>
      {/* Connection Status Banner */}
      <div className={cn(
        "mb-6 p-4 rounded-xl border",
        isConnected ? "bg-green-50 border-green-200 text-green-800" : "bg-orange-50 border-orange-200 text-orange-800"
      )}>
        <div className="flex items-center gap-2">
          <Wifi className={cn("h-4 w-4", isConnected ? "text-green-600" : "text-orange-600")} />
          <span className="font-medium">
            {isConnected ? "Live tracking active" : "Collar disconnected - showing demo data"}
          </span>
          {lastUpdate && (
            <span className="text-sm">
              • Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-8">
          {/* Header and Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md border-l-4 border-purple-500 dark:border-purple-400">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Location Tracking</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Track {petName}'s real-time position and movement
                {realBeacons.length > 0 && ` • ${realBeacons.length} beacons detected`}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Setup Button */}
              <Link 
                href="/location-setup"
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Setup Tracking</span>
              </Link>

              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
              
              <div className="relative map-selector-container">
                <button 
                  onClick={() => setShowMapSelector(!showMapSelector)}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm"
                >
                  <Grid className="h-4 w-4 text-purple-500" />
                  <span>Floor Plan Info</span>
                </button>
                
                {showMapSelector && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-30 w-72">
                    <h3 className="text-sm font-medium mb-3">Current Floor Plan</h3>
                    <div className="space-y-3">
                      {/* Current unified floor plan */}
                      <div className="rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
                        <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 relative">
                          <img 
                            src="/floorplan.png" 
                            alt="Unified Floor Plan"
                            className="w-full h-full object-contain" 
                          />
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Unified Floor Plan</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            Configured in Location Setup • {realBeacons.length} beacons detected
                          </div>
                        </div>
                      </div>
                      
                      {/* Setup link */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Link 
                          href="/location-setup"
                          className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                          onClick={() => setShowMapSelector(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Modify Floor Plan & Beacons
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real Position Data (if available) */}
          {collarPosition?.valid && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Live Position Data
              </h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">X Position:</span>
                  <span className="font-mono ml-2">{collarPosition.x.toFixed(2)}m</span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Y Position:</span>
                  <span className="font-mono ml-2">{collarPosition.y.toFixed(2)}m</span>
                </div>
                {collarPosition.confidence !== undefined && (
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Confidence:</span>
                    <span className={cn(
                      "font-mono ml-2",
                      collarPosition.confidence >= 80 ? "text-green-600 dark:text-green-400" :
                      collarPosition.confidence >= 60 ? "text-orange-600 dark:text-orange-400" :
                      "text-red-600 dark:text-red-400"
                    )}>{collarPosition.confidence}%</span>
                  </div>
                )}
              </div>
              {collarPosition.confidence !== undefined && collarPosition.confidence < 70 && (
                <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    ⚠️ Low positioning confidence. Consider adding more beacons or checking signal strength.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Location Map */}
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
            <div className="h-[600px]">
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
          </div>
          
          {/* Beacons Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Wifi className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Beacons Status</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {realBeacons.length > 0 
                      ? `${realBeacons.length} live beacons detected • Signal strength and battery levels`
                      : "Signal strength and battery levels of your beacons (Demo Mode)"
                    }
                  </p>
                </div>
              </div>
              <Link 
                href="/beacons" 
                className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                Manage Beacons
              </Link>
            </div>

            {/* Live Beacon Detection */}
            {realBeacons.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Live Beacon Detection ({realBeacons.length})
                  </h3>
                  <button
                    onClick={() => setRealBeacons([])}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {realBeacons.map((beacon, index) => {
                    const distance = beacon.distance || 0;
                    const signalStrength = Math.max(0, Math.min(100, ((beacon.rssi + 100) / 70) * 100));
                    const status = beacon.rssi > -50 ? 'excellent' : beacon.rssi > -70 ? 'good' : beacon.rssi > -85 ? 'fair' : 'poor';
                    
                    return (
                      <div 
                        key={index} 
                        className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-700 relative group"
                      >
                        {/* Delete button */}
                        <button
                          onClick={() => setRealBeacons(prev => prev.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all"
                          title="Remove this beacon"
                        >
                          ×
                        </button>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                            {beacon.name || `Unknown Beacon`}
                          </h3>
                          <div className={cn(
                            "h-2 w-2 rounded-full animate-pulse",
                            status === 'excellent' ? "bg-green-500" :
                            status === 'good' ? "bg-green-400" :
                            status === 'fair' ? "bg-yellow-500" : "bg-red-500"
                          )}></div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-blue-700 dark:text-blue-300">Signal</span>
                              <span className={cn(
                                "text-xs font-medium",
                                signalStrength > 70 ? "text-green-600 dark:text-green-400" :
                                signalStrength > 40 ? "text-orange-500 dark:text-orange-400" :
                                "text-red-500 dark:text-red-400"
                              )}>
                                {Math.round(signalStrength)}%
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  signalStrength > 70 ? "bg-green-500" :
                                  signalStrength > 40 ? "bg-orange-500" :
                                  "bg-red-500"
                                )}
                                style={{ width: `${signalStrength}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-blue-700 dark:text-blue-300">RSSI:</span>
                              <span className="font-mono">{beacon.rssi} dBm</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700 dark:text-blue-300">Distance:</span>
                              <span className="font-mono">{distance.toFixed(1)} m</span>
                            </div>
                            {beacon.address && (
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">MAC:</span>
                                <span className="font-mono">{beacon.address.slice(-8)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                {isConnected ? (
                  <div className="text-gray-500 dark:text-gray-400">
                    <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No Beacons Detected</h3>
                    <p className="text-sm">Your collar is connected but no beacons are in range.</p>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">Collar Disconnected</h3>
                    <p className="text-sm">Connect your collar to see live beacon detection.</p>
                    
                    {/* Demo Mode Controls */}
                    {beacons.length > 0 && (
                      <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                          Demo Mode Active
                        </h4>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                          Showing {beacons.length} mock beacons for demonstration
                        </p>
                        <button
                          onClick={() => setBeacons([])}
                          className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                        >
                          Clear Demo Beacons
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Pet Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">{petName.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{petName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isConnected ? `Connected • ${lastConnected}` : 'Offline'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Battery</span>
                <div className="flex items-center gap-2">
                  <BatteryMedium className={cn(
                    "h-4 w-4",
                    batteryLevel > 50 ? "text-green-500" : 
                    batteryLevel > 20 ? "text-orange-500" : 
                    "text-red-500"
                  )} />
                  <span className="text-sm font-medium">{batteryLevel}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={cn(
                  "text-sm font-medium",
                  alertActive ? "text-red-600" : "text-green-600"
                )}>
                  {alertActive ? 'Alert Active' : 'Normal'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Activity</span>
                <span className="text-sm font-medium capitalize">{petActivity}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                href="/beacons"
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Wifi className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Manage Beacons</span>
              </Link>
              
              <Link 
                href="/settings"
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Collar Settings</span>
              </Link>
              
              <button className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                <Camera className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">View Cameras</span>
              </button>
            </div>
          </div>

          {/* Location History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              <History className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {locationHistory.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                    item.type === 'movement' ? "bg-blue-500" :
                    item.type === 'alert' ? "bg-red-500" :
                    "bg-green-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{item.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Live Tracking</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  {isConnected 
                    ? "Your pet collar is connected and transmitting location data in real-time."
                    : "Connect your pet collar to see live location tracking. Demo data is currently shown."
                  }
                </p>
                {(realBeacons.length > 0 || beacons.length > 0) && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    💡 <strong>Tip:</strong> Hover over beacons to see delete options, or use "Clear All" buttons to remove them.
                  </p>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </PageLayout>
  );
} 