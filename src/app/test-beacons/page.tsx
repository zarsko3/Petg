'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePetgStore } from '@/lib/store';

interface TestBeacon {
  name: string;
  rssi: number;
  distance: number;
  address: string;
  first_seen: number;
  last_seen: number;
}

export default function TestBeaconsPage() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [testBeacons, setTestBeacons] = useState<TestBeacon[]>([]);
  
  // Get store functions
  const store = usePetgStore();

  const simulatedBeacons: TestBeacon[] = [
    {
      name: "PetZone-Home-01",
      rssi: -71,
      distance: 3.2,
      address: "08:d1:f9:53:9c:82",
      first_seen: Date.now() - 30000,
      last_seen: Date.now()
    },
    {
      name: "PET_BEACON_KITCHEN",
      rssi: -55,
      distance: 1.8,
      address: "aa:bb:cc:dd:ee:ff",
      first_seen: Date.now() - 15000,
      last_seen: Date.now()
    },
    {
      name: "ESP32-Yard-Beacon",
      rssi: -89,
      distance: 8.5,
      address: "12:34:56:78:90:ab",
      first_seen: Date.now() - 45000,
      last_seen: Date.now() - 5000
    }
  ];

  const startSimulation = () => {
    setIsSimulating(true);
    setTestBeacons(simulatedBeacons);
    
    // Update the global store with test data
    const testCollarData = {
      device_id: 'PETCOLLAR001-TEST',
      battery_level: 85,
      alert_active: false,
      wifi_connected: true,
      system_state: 'normal' as const,
      timestamp: Date.now(),
      uptime: 1200,
      status: 'Connected (Test Mode)',
      beacons: simulatedBeacons,
      scanner: {
        ble_active: true,
        beacons_detected: simulatedBeacons.length,
        last_scan: Date.now(),
        successful_scans: 15,
        total_scans: 15
      }
    };

    // Update store with test data
    store.setLastCollarData(testCollarData);
    store.setCollarConnected(true);
    store.setConnectionStatus('Connected');
    store.setConnectionMessage('Test beacon simulation active');
    
    console.log('🧪 Test beacon simulation started with data:', testCollarData);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setTestBeacons([]);
    
    // Clear test data from store
    const emptyCollarData = {
      device_id: 'PETCOLLAR001',
      battery_level: 80,
      alert_active: false,
      wifi_connected: true,
      system_state: 'normal' as const,
      timestamp: Date.now(),
      uptime: 1200,
      status: 'Connected',
      beacons: [],
      scanner: {
        ble_active: true,
        beacons_detected: 0,
        last_scan: Date.now(),
        successful_scans: 1,
        total_scans: 1
      }
    };

    store.setLastCollarData(emptyCollarData);
    console.log('🧪 Test beacon simulation stopped');
  };

  // Auto-update beacon timestamps to simulate real-time data
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTestBeacons(prev => prev.map(beacon => ({
        ...beacon,
        last_seen: Date.now(),
        rssi: beacon.rssi + (Math.random() - 0.5) * 4 // Slight RSSI variation
      })));

      // Update store with fresh timestamps
      const updatedCollarData = {
        device_id: 'PETCOLLAR001-TEST',
        battery_level: 85,
        alert_active: false,
        wifi_connected: true,
        system_state: 'normal' as const,
        timestamp: Date.now(),
        uptime: 1200,
        status: 'Connected (Test Mode)',
        beacons: testBeacons.map(beacon => ({
          ...beacon,
          last_seen: Date.now()
        })),
        scanner: {
          ble_active: true,
          beacons_detected: testBeacons.length,
          last_scan: Date.now(),
          successful_scans: 15,
          total_scans: 15
        }
      };

      store.setLastCollarData(updatedCollarData);
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [isSimulating, testBeacons, store]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Beacon Test Simulator
          </h1>
          <p className="text-gray-600">
            Test the beacon detection system with simulated data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Simulation Control</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isSimulating ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
              }`}>
                {isSimulating ? "Running" : "Stopped"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={startSimulation}
                disabled={isSimulating}
                className="flex-1"
              >
                Start Beacon Simulation
              </Button>
              <Button 
                onClick={stopSimulation}
                disabled={!isSimulating}
                variant="outline"
                className="flex-1"
              >
                Stop Simulation
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              This will simulate 3 test beacons and update the global store so you can test 
              the beacon page functionality. Navigate to the Beacon Configuration page to see the results.
            </div>
          </CardContent>
        </Card>

        {isSimulating && (
          <Card>
            <CardHeader>
              <CardTitle>Simulated Beacons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testBeacons.map((beacon, index) => (
                  <div key={beacon.address} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{beacon.name}</h3>
                      <span className="px-2 py-1 border rounded text-xs font-medium text-gray-600">
                        RSSI: {beacon.rssi} dBm
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Address:</span> {beacon.address}
                      </div>
                      <div>
                        <span className="font-medium">Distance:</span> {beacon.distance.toFixed(1)}m
                      </div>
                      <div>
                        <span className="font-medium">First Seen:</span> {new Date(beacon.first_seen).toLocaleTimeString()}
                      </div>
                      <div>
                        <span className="font-medium">Last Seen:</span> {new Date(beacon.last_seen).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>1. Click "Start Beacon Simulation" to inject test beacon data into the system</p>
            <p>2. Navigate to the Beacon Configuration page to see the simulated beacons</p>
            <p>3. Test adding beacons to safe zones, editing beacon names, etc.</p>
            <p>4. The simulation will update beacon data every 3 seconds to mimic real-time scanning</p>
            <p>5. Click "Stop Simulation" to return to normal collar data</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 