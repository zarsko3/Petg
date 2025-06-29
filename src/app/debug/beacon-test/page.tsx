'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePetgStore } from '@/lib/store';

export default function BeaconTestPage() {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  
  // Get beacon state
  const beacons = usePetgStore((state) => state.beacons);
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const demoMode = usePetgStore((state) => state.demoMode);
  
  // Get store functions
  const addOrUpdateBeacon = usePetgStore((state) => state.addOrUpdateBeacon);
  const clearBeacons = usePetgStore((state) => state.clearBeacons);
  const setDemoMode = usePetgStore((state) => state.setDemoMode);
  
  const addLogMessage = (message: string) => {
    setLogMessages(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const testAddBeacon = () => {
    const testBeacon = {
      id: `test-${Date.now()}`,
      name: `PetZone-Home-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
      rssi: Math.floor(Math.random() * 40) - 80, // -80 to -40
      distance: Math.random() * 500, // 0 to 500cm
      confidence: Math.random(),
      timestamp: Date.now(),
      address: `aa:bb:cc:dd:ee:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`,
      collarId: '001'
    };
    
    addOrUpdateBeacon(testBeacon);
    addLogMessage(`Added test beacon: ${testBeacon.name} (${testBeacon.rssi}dBm)`);
  };

  const testUpdateBeacon = () => {
    if (beacons.length === 0) {
      addLogMessage('No beacons to update - add some first');
      return;
    }
    
    const randomBeacon = beacons[Math.floor(Math.random() * beacons.length)];
    const updatedBeacon = {
      ...randomBeacon,
      rssi: Math.floor(Math.random() * 40) - 80,
      distance: Math.random() * 500,
      timestamp: Date.now()
    };
    
    addOrUpdateBeacon(updatedBeacon);
    addLogMessage(`Updated beacon: ${updatedBeacon.name} (${updatedBeacon.rssi}dBm)`);
  };

  const inspectStoreState = () => {
    const storeState = {
      beacons: beacons,
      demoMode: demoMode,
      isConnected: usePetgStore.getState().isCollarConnected,
      connectionStatus: usePetgStore.getState().connectionStatus,
      lastDataReceived: usePetgStore.getState().lastDataReceived
    };
    
    console.log('🔍 Current Store State:', storeState);
    addLogMessage(`Store state: ${beacons.length} beacons, demoMode: ${demoMode}, connected: ${usePetgStore.getState().isCollarConnected}`);
    
    beacons.forEach((beacon, index) => {
      addLogMessage(`Beacon ${index + 1}: ${beacon.name} (${beacon.rssi}dBm) - ID: ${beacon.id}`);
    });
  };

  const simulateMQTTBeacon = () => {
    // Simulate what the MQTT handler would receive
    const mqttBeacon = {
      device_id: "001",
      timestamp: Date.now(),
      beacon_name: "PetZone-Home-Kitchen",
      rssi: -65,
      distance: 243.84,
      confidence: 0.6,
      address: "08:d1:f9:53:9c:82"
    };
    
    const storeBeacon = {
      id: mqttBeacon.address || mqttBeacon.beacon_name,
      name: mqttBeacon.beacon_name,
      rssi: mqttBeacon.rssi,
      distance: mqttBeacon.distance,
      confidence: mqttBeacon.confidence,
      timestamp: mqttBeacon.timestamp,
      address: mqttBeacon.address,
      collarId: "001"
    };
    
    addOrUpdateBeacon(storeBeacon);
    addLogMessage(`Simulated MQTT beacon: ${mqttBeacon.beacon_name}`);
    
    // Exit demo mode
    if (demoMode) {
      setDemoMode(false);
      addLogMessage('Demo mode automatically disabled');
    }
  };

  const clearAllBeacons = () => {
    clearBeacons();
    addLogMessage('Cleared all beacons');
  };

  const toggleDemoMode = () => {
    setDemoMode(!demoMode);
    addLogMessage(`Demo mode ${!demoMode ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Beacon Store Debug</h1>
        <div className="flex gap-2">
          <div className={`px-3 py-1 rounded text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`px-3 py-1 rounded text-sm ${demoMode ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
            {demoMode ? 'Demo Mode' : 'Live Mode'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Controls */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="space-y-3">
            <Button onClick={testAddBeacon} className="w-full">
              Add Random Test Beacon
            </Button>
            <Button onClick={testUpdateBeacon} className="w-full" disabled={beacons.length === 0}>
              Update Random Beacon
            </Button>
            <Button onClick={simulateMQTTBeacon} className="w-full bg-blue-600 hover:bg-blue-700">
              Simulate MQTT Beacon Detection
            </Button>
            <Button onClick={clearAllBeacons} variant="destructive" className="w-full">
              Clear All Beacons
            </Button>
            <Button onClick={toggleDemoMode} variant="outline" className="w-full">
              Toggle Demo Mode
            </Button>
            <Button onClick={inspectStoreState} className="w-full bg-gray-600 hover:bg-gray-700">
              Inspect Store State
            </Button>
          </div>
        </Card>

        {/* Store State Inspector */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Store State Inspector
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Connection Status</h3>
              <div className="text-sm space-y-1">
                <div>Is Connected: <span className="font-mono">{usePetgStore.getState().isCollarConnected ? 'true' : 'false'}</span></div>
                <div>Demo Mode: <span className="font-mono">{demoMode ? 'true' : 'false'}</span></div>
                <div>Connection Status: <span className="font-mono">{usePetgStore.getState().connectionStatus}</span></div>
                <div>Last Data Received: <span className="font-mono">{new Date(usePetgStore.getState().lastDataReceived).toLocaleTimeString()}</span></div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Raw Store Data</h3>
              <div className="text-sm">
                <div>Beacons in Store: <span className="font-mono font-bold">{beacons.length}</span></div>
                <div className="mt-2">
                  {beacons.length > 0 ? (
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
{JSON.stringify(beacons.map(b => ({
  name: b.name,
  rssi: b.rssi,
  id: b.id,
  timestamp: new Date(b.timestamp).toLocaleTimeString()
})), null, 2)}
                    </pre>
                  ) : (
                    <span className="text-gray-500 italic">No beacons in store</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Beacon List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Live Beacons ({beacons.length})
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {beacons.length === 0 ? (
              <p className="text-gray-500 italic">No beacons detected</p>
            ) : (
              beacons.map((beacon) => (
                <div key={beacon.id} className="border rounded p-3 text-sm">
                  <div className="font-medium">{beacon.name}</div>
                  <div className="text-gray-600">
                    RSSI: {beacon.rssi}dBm | Distance: {beacon.distance.toFixed(1)}cm
                    <br />
                    Collar: {beacon.collarId} | Age: {Math.floor((Date.now() - beacon.timestamp) / 1000)}s
                  </div>
                  {beacon.address && (
                    <div className="text-xs text-gray-500">
                      MAC: {beacon.address}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Debug Log */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
        <div className="bg-gray-50 p-4 rounded max-h-48 overflow-y-auto font-mono text-sm">
          {logMessages.length === 0 ? (
            <p className="text-gray-500">No log messages yet</p>
          ) : (
            logMessages.map((message, index) => (
              <div key={index} className="py-1">
                {message}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50">
        <h2 className="text-xl font-semibold mb-4">How to Test</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Use "Simulate MQTT Beacon Detection" to test the beacon store functionality</li>
          <li>Check the beacon list to see if beacons are added/updated properly</li>
          <li>Go to /beacons page to see if beacons appear in the UI</li>
          <li>Watch the debug log for confirmation messages</li>
          <li>Check if demo mode automatically switches to live mode when device 001 sends data</li>
        </ol>
      </Card>
    </div>
  );
} 