'use client';

import React, { useState } from 'react';
import { BeaconSettingsDrawer } from '@/components/beacon-settings-drawer';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Wifi, Clock } from 'lucide-react';

interface SampleBeacon {
  id: string;
  name: string;
  rssi?: number;
  lastSeen?: number;
  timestamp?: number;
}

export default function BeaconSettingsTestPage() {
  const [selectedBeacon, setSelectedBeacon] = useState<SampleBeacon | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sample beacon data matching your specifications
  const sampleBeacons: SampleBeacon[] = [
    {
      id: 'PetZone-Home-01',
      name: 'PetZone-Home-01',
      rssi: -45,
      lastSeen: Date.now() - 30000, // 30 seconds ago
    },
    {
      id: 'PetZone-Home-02', 
      name: 'PetZone-Home-02',
      rssi: -67,
      lastSeen: Date.now() - 120000, // 2 minutes ago
    },
    {
      id: 'Living-Room-Beacon',
      name: 'Living Room Beacon',
      rssi: -52,
      timestamp: Date.now() - 45000, // 45 seconds ago (using timestamp instead of lastSeen)
    },
    {
      id: 'Kitchen-Beacon',
      name: 'Kitchen Beacon',
      rssi: -78,
      lastSeen: Date.now() - 300000, // 5 minutes ago
    },
    {
      id: 'Ghost-Beacon-AA-BB-CC',
      name: 'Unknown-AA:BB:CC:DD:EE:FF',
      rssi: -89,
      lastSeen: Date.now() - 600000, // 10 minutes ago
    }
  ];

  const handleOpenSettings = (beacon: SampleBeacon) => {
    setSelectedBeacon(beacon);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedBeacon(null);
  };

  const getRSSIColor = (rssi?: number) => {
    if (!rssi) return 'text-gray-500';
    if (rssi > -50) return 'text-green-500';
    if (rssi > -70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🔧 Beacon Settings Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the new per-beacon configuration panel with sample beacon data. 
            Click the Settings button on any beacon to open the configuration drawer.
          </p>
        </div>

        {/* Features Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🎯 Features Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Trigger distance (10-300 cm slider)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Alert mode (Buzzer/Vibration/Both)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Alert intensity (0-255 slider)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Proximity delay toggle + timer</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Cooldown period configuration</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>TEST buttons (Buzzer/Vibration/Both)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Real-time RSSI & last-seen display</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Form validation & error handling</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MQTT Topics Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📡 MQTT API Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-blue-600">Configuration Save:</div>
                <code className="text-xs">pet-collar/001/beacon-config</code>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-green-600">Test Alert:</div>
                <code className="text-xs">pet-collar/001/command</code>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                All MQTT messages are logged to console. Check DevTools for published payloads.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sample Beacons */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📍 Sample Beacons
          </h2>
          
          {sampleBeacons.map((beacon) => (
            <Card key={beacon.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Wifi className={`h-5 w-5 ${getRSSIColor(beacon.rssi)}`} />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {beacon.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline">
                            {beacon.rssi ? `${beacon.rssi} dBm` : 'No Signal'}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatLastSeen(beacon.lastSeen || beacon.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleOpenSettings(beacon)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚀 Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-medium">1.</span>
                <span>Click "Configure" on any beacon above to open the settings drawer</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-medium">2.</span>
                <span>Adjust trigger distance, alert mode, intensity, delay, and cooldown settings</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-medium">3.</span>
                <span>Use TEST buttons to send immediate alert commands (check console logs)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-medium">4.</span>
                <span>Click "Save Configuration" to send beacon config via MQTT (check console)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-medium">5.</span>
                <span>Form validation prevents invalid settings (distance 10-300cm, intensity 0-255)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Beacon Settings Drawer */}
      <BeaconSettingsDrawer
        beacon={selectedBeacon}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        collarId="001"
      />
    </div>
  );
} 