'use client';

import { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Settings, Plus, X, Check, Edit, Trash, Home, AlertTriangle, MapPin, Clock, Signal } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/page-layout';
import { CameraFeeds } from '@/components/camera-feeds';
import { BeaconConfigurationPanel } from '@/components/beacon-configuration-panel';
import type { BeaconConfiguration } from '@/app/api/beacons/route';
import { usePetgStore } from '@/lib/store';

// Legacy beacon item interface for compatibility
interface BeaconItem {
  id: string;
  name: string;
  position: { x: number; y: number };
  batteryLevel: number;
  signalStrength: number;
  lastUpdate: string;
  location: string;
  status: 'online' | 'offline' | 'low-battery';
  isAutoDetected?: boolean;
  address?: string;
  lastSeenTimestamp?: number;
}

// Convert RSSI to distance estimation (matching firmware logic)
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

// Convert RSSI to signal strength percentage
function rssiToSignalStrength(rssi: number): number {
  // RSSI typically ranges from -100 to -30 dBm
  // Convert to percentage where -30 = 100% and -100 = 0%
  const normalized = Math.max(0, Math.min(100, ((rssi + 100) / 70) * 100));
  return Math.round(normalized);
}

// Determine beacon status based on RSSI and last seen time
function getBeaconStatus(rssi: number, lastSeen: number): 'online' | 'offline' | 'low-battery' {
  const now = Date.now();
  const timeSinceLastSeen = now - lastSeen;
  
  // If not seen for more than 30 seconds, consider offline
  if (timeSinceLastSeen > 30000) return 'offline';
  
  // If RSSI is very weak, mark as low-battery (indicating weak signal/low power)
  if (rssi < -85) return 'low-battery';
  
  return 'online';
}

export default function BeaconsPage() {
  // Real beacon data from live store and collar
  const [realBeacons, setRealBeacons] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [scanStats, setScanStats] = useState<any>(null);
  
  // Get connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);
  const connectionMessage = usePetgStore((state) => state.connectionMessage);
  const rawCollarData = usePetgStore((state) => state.lastCollarData);
  
  // Get live beacon detections from the store
  const liveBeacons = usePetgStore((state) => state.beacons);
  const demoMode = usePetgStore((state) => state.demoMode);
  
  // Configuration beacons (for management purposes)
  const [configuredBeacons, setConfiguredBeacons] = useState<BeaconItem[]>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('petg-configured-beacons');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [editingBeaconId, setEditingBeaconId] = useState<string | null>(null);
  const [newBeaconName, setNewBeaconName] = useState('');
  const [newBeaconLocation, setNewBeaconLocation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Save configured beacons to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('petg-configured-beacons', JSON.stringify(configuredBeacons));
    }
  }, [configuredBeacons]);

  // Process beacon data from live beacon store and legacy rawCollarData
  useEffect(() => {
    if (isConnected && !demoMode) {
      // Primary source: Live beacon detections from MQTT
      if (liveBeacons && liveBeacons.length > 0) {
        // Convert live beacons to the expected format
        const formattedBeacons = liveBeacons
          .filter(beacon => beacon.name && beacon.name.startsWith("PetZone-Home-"))
          .map(beacon => ({
            name: beacon.name,
            rssi: beacon.rssi,
            distance: beacon.distance,
            address: beacon.address,
            last_seen: beacon.timestamp,
            confidence: beacon.confidence
          }));
        
        setRealBeacons(formattedBeacons);
        setLastUpdate(new Date());
        
        if (formattedBeacons.length > 0) {
          console.log(`✅ Beacons Page: ${formattedBeacons.length} live MQTT beacons detected`);
        }
        
        // Auto-add to configured beacons
        updateConfiguredBeacons(formattedBeacons);
        
      } 
      // Fallback: Legacy rawCollarData beacons (for backward compatibility)
      else if (rawCollarData && rawCollarData.beacons) {
        console.log('📡 Beacons Page: Using fallback rawCollarData.beacons');
        
        let beaconArray;
        if (Array.isArray(rawCollarData.beacons)) {
          beaconArray = rawCollarData.beacons;
        } else {
          beaconArray = Object.values(rawCollarData.beacons);
        }
        
        const filteredBeacons = beaconArray.filter((beacon: any) => 
          beacon && typeof beacon === 'object' && beacon.name && beacon.name.startsWith("PetZone-Home-")
        );
        
        setRealBeacons(filteredBeacons);
        setLastUpdate(new Date());
        
        if (filteredBeacons.length > 0) {
          console.log(`✅ Beacon Page: ${filteredBeacons.length} legacy beacons detected`);
        }
        
        // Auto-add to configured beacons
        updateConfiguredBeacons(filteredBeacons.length > 0 ? filteredBeacons : beaconArray);
        
      } else {
        // No beacon data received - clear real beacons
        setRealBeacons([]);
        setLastUpdate(new Date());
        
        setConfiguredBeacons(prev => 
          prev.map(beacon => 
            beacon.isAutoDetected ? { ...beacon, status: 'offline' as const } : beacon
          )
        );
      }
      
      // Extract scanner statistics from legacy data
      if (rawCollarData && rawCollarData.scanner) {
        setScanStats(rawCollarData.scanner);
      } else {
        setScanStats(null);
      }
      
    } else if (!isConnected || demoMode) {
      // Clear real beacon data when disconnected or in demo mode
      setRealBeacons([]);
      setLastUpdate(null);
      setScanStats(null);
      
      // Mark all auto-detected beacons as offline when disconnected
      setConfiguredBeacons(prev => 
        prev.map(beacon => 
          beacon.isAutoDetected ? { ...beacon, status: 'offline' as const } : beacon
        )
      );
      console.log('📡 Beacons: Cleared data due to disconnection or demo mode');
    }
  }, [isConnected, liveBeacons, rawCollarData, demoMode]);

  // Helper function to update configured beacons
  const updateConfiguredBeacons = (detectedBeacons: any[]) => {
    const currentTime = Date.now();
    
    setConfiguredBeacons(prevBeacons => {
      let updatedBeacons = [...prevBeacons];
      
      detectedBeacons.forEach((detectedBeacon: any) => {
        // Only process PetZone-Home-XX beacons
        if (!detectedBeacon.name || !detectedBeacon.name.startsWith("PetZone-Home-")) {
          return;
        }
        
        const existingBeaconIndex = updatedBeacons.findIndex(
          beacon => beacon.name === detectedBeacon.name || 
                   (detectedBeacon.address && beacon.id.includes(detectedBeacon.address))
        );
        
        if (existingBeaconIndex === -1) {
          // Create new beacon entry for detected PetZone beacon
          const newBeacon: BeaconItem = {
            id: `detected-${detectedBeacon.address || detectedBeacon.name || Date.now()}`,
            name: detectedBeacon.name,
            location: 'Auto-detected',
            position: { x: 50, y: 50 },
            batteryLevel: 100,
            signalStrength: rssiToSignalStrength(detectedBeacon.rssi),
            lastUpdate: 'Just now',
            status: getBeaconStatus(detectedBeacon.rssi, detectedBeacon.last_seen),
            isAutoDetected: true,
            address: detectedBeacon.address,
            lastSeenTimestamp: currentTime
          };
          
          console.log(`✅ Auto-adding PetZone beacon: ${newBeacon.name}`);
          updatedBeacons.push(newBeacon);
        } else {
          // Update existing beacon with real-time data
          updatedBeacons[existingBeaconIndex] = {
            ...updatedBeacons[existingBeaconIndex],
            signalStrength: rssiToSignalStrength(detectedBeacon.rssi),
            lastUpdate: 'Just now',
            status: getBeaconStatus(detectedBeacon.rssi, detectedBeacon.last_seen),
            address: detectedBeacon.address || updatedBeacons[existingBeaconIndex].address,
            lastSeenTimestamp: currentTime
          };
        }
      });
      
      return updatedBeacons;
    });
    
    // Mark beacons as offline if they haven't been seen recently
    const activeBeaconNames = detectedBeacons.map((b: any) => b.name);
    const activeBeaconAddresses = detectedBeacons.map((b: any) => b.address).filter(Boolean);
    
    setConfiguredBeacons(prev => 
      prev.map(beacon => {
        const isCurrentlyActive = activeBeaconNames.includes(beacon.name) ||
                                (beacon.address && activeBeaconAddresses.includes(beacon.address));
        
        if (!isCurrentlyActive && beacon.isAutoDetected) {
          return {
            ...beacon,
            status: 'offline' as const,
            lastUpdate: `Last seen ${Math.floor((currentTime - (beacon.lastSeenTimestamp || currentTime)) / 1000)}s ago`
          };
        }
        return beacon;
      })
    );
  };

  // Function to handle starting to edit a beacon
  const startEditingBeacon = (id: string) => {
    const beacon = configuredBeacons.find(b => b.id === id);
    if (beacon) {
      setEditingBeaconId(id);
      setNewBeaconName(beacon.name);
      setNewBeaconLocation(beacon.location);
    }
  };

  // Function to save the edited beacon
  const saveBeacon = () => {
    if (editingBeaconId) {
      setConfiguredBeacons(prev => 
        prev.map(beacon => 
          beacon.id === editingBeaconId 
            ? { 
                ...beacon, 
                name: newBeaconName.trim() || beacon.name,
                location: newBeaconLocation.trim() || beacon.location
              } 
            : beacon
        )
      );
      setEditingBeaconId(null);
      setNewBeaconName('');
      setNewBeaconLocation('');
    }
  };

  // Function to delete a beacon
  const deleteBeacon = (id: string) => {
    setConfiguredBeacons(prev => prev.filter(beacon => beacon.id !== id));
    if (editingBeaconId === id) {
      setEditingBeaconId(null);
    }
  };

  // Function to add a new beacon
  const addBeacon = () => {
    if (newBeaconName.trim() && newBeaconLocation.trim()) {
      const newBeacon: BeaconItem = {
        id: `beacon-${Date.now()}`,
        name: newBeaconName,
        location: newBeaconLocation,
        position: { x: 50, y: 50 }, // Default position
        batteryLevel: 100, // Default for configured beacons
        signalStrength: 0, // Will be updated by real data
        lastUpdate: 'Never',
        status: 'offline'
      };
      
      setConfiguredBeacons(prev => [...prev, newBeacon]);
      setNewBeaconName('');
      setNewBeaconLocation('');
      setShowAddForm(false);
    }
  };

  // Function to associate real beacon with configured beacon
  const associateBeacon = (realBeacon: any, configuredBeaconId: string) => {
    setConfiguredBeacons(prev => 
      prev.map(beacon => 
        beacon.id === configuredBeaconId 
          ? { 
              ...beacon,
              signalStrength: rssiToSignalStrength(realBeacon.rssi),
              lastUpdate: 'Just now',
              status: getBeaconStatus(realBeacon.rssi, realBeacon.last_seen)
            } 
          : beacon
      )
    );
  };

  return (
    <PageLayout>
      {/* Connection Status Banner */}
      <div className={cn(
        "mb-4 p-4 rounded-xl border",
        isConnected 
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" 
          : connectionStatus === 'Connecting'
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
            : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200"
      )}>
        <div className="flex items-center gap-2">
          <Wifi className={cn(
            "h-4 w-4", 
            isConnected ? "text-green-600 dark:text-green-400" : 
            connectionStatus === 'Connecting' ? "text-yellow-600 dark:text-yellow-400 animate-pulse" :
            "text-orange-600 dark:text-orange-400"
          )} />
          <span className="font-medium">
            {isConnected 
              ? "✅ Collar Connected - Real-time data active" 
              : connectionStatus === 'Connecting'
                ? "🔄 Connecting to collar..."
                : "❌ Collar Disconnected - Using demo data"
            }
          </span>
          {isConnected && lastUpdate && (
            <span className="text-sm">
              • Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {isConnected && scanStats && (
            <span className="text-sm">
              • Scans: {scanStats.successful_scans}/{scanStats.total_scans}
            </span>
          )}
          {!isConnected && connectionMessage && (
            <span className="text-sm">
              • {connectionMessage}
            </span>
          )}
        </div>
      </div>

      {/* Live Beacon Detection Section */}
      {realBeacons.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Signal className="h-5 w-5" />
            Live Beacon Detection ({realBeacons.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realBeacons.map((beacon, index) => {
              const distance = beacon.distance || calculateDistance(beacon.rssi);
              const signalStrength = rssiToSignalStrength(beacon.rssi);
              const status = getBeaconStatus(beacon.rssi, beacon.last_seen);
              
              return (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {beacon.name || `Unknown Beacon`}
                    </h3>
                                         <div className={cn(
                       "h-2 w-2 rounded-full",
                       status === 'online' ? "bg-green-500" : 
                       status === 'low-battery' ? "bg-yellow-500" : "bg-red-500"
                     )}></div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>RSSI:</span>
                      <span className="font-mono">{beacon.rssi} dBm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span className="font-mono">{distance.toFixed(1)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signal:</span>
                      <span className="font-mono">{signalStrength}%</span>
                    </div>
                    {beacon.address && (
                      <div className="flex justify-between">
                        <span>MAC:</span>
                        <span className="font-mono text-xs">{beacon.address.slice(-8)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>First seen:</span>
                      <span className="text-xs">{new Date(beacon.first_seen).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Beacons Detected Message */}
      {isConnected && realBeacons.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 mb-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-900 dark:text-yellow-100">No Beacons Currently Detected</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Your collar is connected and scanning, but no beacons are in range right now.
              </p>
              {scanStats && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  Scanner Status: {scanStats.ble_active ? '🟢 Active' : '🔴 Inactive'} • 
                  Last scan: {scanStats.last_scan ? new Date(scanStats.last_scan).toLocaleTimeString() : 'Never'} • 
                  Total scans: {scanStats.total_scans || 0}
                </p>
              )}
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                💡 Make sure your beacons are powered on and broadcasting. The collar scans every few seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Beacon Configuration Panel */}
      <BeaconConfigurationPanel 
        realBeacons={realBeacons}
        isConnected={isConnected}
        onConfigurationUpdate={(configs) => {
          // Update the configured beacons state if needed for legacy compatibility
          const legacyBeacons = configs.map(config => ({
            id: config.id,
            name: config.name,
            location: config.location,
            position: config.position,
            batteryLevel: config.batteryLevel || 100,
            signalStrength: config.signalStrength || 0,
            lastUpdate: config.lastSeen ? new Date(config.lastSeen).toLocaleTimeString() : 'Never',
            status: config.status,
            isAutoDetected: config.isAutoDetected,
            address: config.macAddress,
            lastSeenTimestamp: config.lastSeen ? new Date(config.lastSeen).getTime() : Date.now()
          }));
          setConfiguredBeacons(legacyBeacons);
        }}
      />

      {/* Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            href="/location" 
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span>View Location Map</span>
          </Link>
          
          <Link 
            href="/location-setup" 
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Zone Setup</span>
          </Link>
        </div>
        
        {isConnected && (
          <div className="text-sm text-green-600 dark:text-green-400">
            ✅ Live configuration sync enabled
          </div>
        )}
      </div>

      {/* Info Message */}


      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">About Beacon Management</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              {isConnected 
                ? "Beacons detected by your collar are automatically added to the list above and will remain visible until they go offline. You can edit their names and locations or manually add beacons for future detection."
                : "Connect your pet collar to see live beacon detection. You can pre-configure beacon settings that will be applied when beacons are detected."
              }
            </p>
            {isConnected && configuredBeacons.some(b => b.isAutoDetected) && (
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                <strong>Auto-detected beacons</strong> are shown with blue badges and will update their status in real-time based on collar scanning.
              </p>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 