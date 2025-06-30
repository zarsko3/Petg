'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { usePetgStore } from '@/lib/store';
import { getMQTTClient } from '@/lib/mqtt-client';
import { Badge } from '@/components/ui/badge';
import { CardDescription } from '@/components/ui/card';
import { RecentUpdatesPanel } from '@/components/recent-updates-panel';

export default function BeaconTestPage() {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [mqttStats, setMqttStats] = useState({
    connected: false,
    messagesReceived: 0,
    lastMessage: null as any,
  });
  const [pipelineStats, setPipelineStats] = useState({
    step1_mqtt_messages: 0,
    step2_store_updates: 0,
    step3_new_beacons: 0,
    step4_ui_renders: 0,
    step5_localStorage_saves: 0
  });
  
  // Get beacon state
  const beacons = usePetgStore((state) => state.beacons);
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);
  const lastCollarData = usePetgStore((state) => state.lastCollarData);
  
  // Get store functions
  const addOrUpdateBeacon = usePetgStore((state) => state.addOrUpdateBeacon);
  const clearBeacons = usePetgStore((state) => state.clearBeacons);
  const setDemoMode = usePetgStore((state) => state.setDemoMode);
  
  // 🔍 STEP 6: Pipeline monitoring hooks
  useEffect(() => {
    // Monitor MQTT client
    const mqttClient = getMQTTClient();
    const connectionStatus = mqttClient.getConnectionStatus();
    setMqttStats(prev => ({ ...prev, connected: connectionStatus.connected }));

    // Intercept console.log for pipeline debugging
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      
      const message = args.join(' ');
      const timestamp = new Date().toLocaleTimeString();
      
      // Track pipeline steps
      if (message.includes('[Beacon message]')) {
        setPipelineStats(prev => ({ ...prev, step1_mqtt_messages: prev.step1_mqtt_messages + 1 }));
        setLogMessages(prev => [`[${timestamp}] 📡 STEP 1: ${message}`, ...prev.slice(0, 49)]);
      } else if (message.includes('[STEP 2]')) {
        setPipelineStats(prev => ({ ...prev, step2_store_updates: prev.step2_store_updates + 1 }));
        setLogMessages(prev => [`[${timestamp}] 🏪 STEP 2: ${message}`, ...prev.slice(0, 49)]);
      } else if (message.includes('[STEP 3]') && message.includes('Adding NEW beacon')) {
        setPipelineStats(prev => ({ ...prev, step3_new_beacons: prev.step3_new_beacons + 1 }));
        setLogMessages(prev => [`[${timestamp}] 👻 STEP 3: ${message}`, ...prev.slice(0, 49)]);
      } else if (message.includes('[STEP 5]') && message.includes('Saved')) {
        setPipelineStats(prev => ({ ...prev, step5_localStorage_saves: prev.step5_localStorage_saves + 1 }));
        setLogMessages(prev => [`[${timestamp}] 💾 STEP 5: ${message}`, ...prev.slice(0, 49)]);
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  // Track UI renders (Step 4)
  useEffect(() => {
    setPipelineStats(prev => ({ ...prev, step4_ui_renders: prev.step4_ui_renders + 1 }));
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages(prev => [`[${timestamp}] 🎨 STEP 4: UI rendered with ${beacons.length} beacons`, ...prev.slice(0, 49)]);
  }, [beacons.length]);

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
      demoMode: usePetgStore.getState().demoMode,
      isConnected: usePetgStore.getState().isCollarConnected,
      connectionStatus: usePetgStore.getState().connectionStatus,
      lastDataReceived: usePetgStore.getState().lastDataReceived
    };
    
    console.log('🔍 Current Store State:', storeState);
    addLogMessage(`Store state: ${beacons.length} beacons, demoMode: ${usePetgStore.getState().demoMode}, connected: ${usePetgStore.getState().isCollarConnected}`);
    
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
    if (usePetgStore.getState().demoMode) {
      setDemoMode(false);
      addLogMessage('Demo mode automatically disabled');
    }
  };

  const clearAllBeacons = () => {
    clearBeacons();
    addLogMessage('Cleared all beacons');
  };

  const toggleDemoMode = () => {
    setDemoMode(!usePetgStore.getState().demoMode);
    addLogMessage(`Demo mode ${!usePetgStore.getState().demoMode ? 'enabled' : 'disabled'}`);
  };

  const clearLogs = () => {
    setLogMessages([]);
    setPipelineStats({
      step1_mqtt_messages: 0,
      step2_store_updates: 0,
      step3_new_beacons: 0,
      step4_ui_renders: 0,
      step5_localStorage_saves: 0
    });
  };

  const testLocalStorage = () => {
    const stored = localStorage.getItem('petg-detected-beacons');
    if (stored) {
      const beacons = JSON.parse(stored);
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] 💾 STEP 5: localStorage contains ${beacons.length} beacons`, ...prev.slice(0, 49)]);
    } else {
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] 💾 STEP 5: localStorage is empty`, ...prev.slice(0, 49)]);
    }
  };

  const forceStoreUpdate = () => {
    const testBeacon = {
      id: `test-${Date.now()}`,
      name: `Test-Beacon-${Math.random().toString(36).substr(2, 4)}`,
      rssi: -Math.floor(Math.random() * 50 + 30),
      distance: Math.floor(Math.random() * 100 + 10),
      confidence: Math.random(),
      timestamp: Date.now(),
      address: `AA:BB:CC:DD:EE:${Math.floor(Math.random() * 99).toString(16).padStart(2, '0').toUpperCase()}`,
      collarId: 'test'
    };
    
    usePetgStore.getState().addOrUpdateBeacon(testBeacon);
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] 🧪 Manual test beacon added: ${testBeacon.name}`, ...prev.slice(0, 49)]);
  };

  // Test anti-spam toast functionality
  const testAntiSpamToast = () => {
    const store = usePetgStore.getState();
    
    // Simulate status message (this should NOT show a toast if called repeatedly)
    store.addRecentUpdate({
      type: 'status',
      title: 'Collar test-001',
      message: 'Connected and online (192.168.1.100)',
      collarId: 'test-001',
      severity: 'success'
    });
    
    // Check if we should show a toast (this simulates the MQTT handler logic)
    const previousStatus = store.deviceStatusMap['test-001'];
    const shouldShowToast = previousStatus !== 'online';
    
    // Update device status
    store.updateDeviceStatus('test-001', 'online');
    
    if (shouldShowToast) {
      console.log('🎉 Would show toast: First time online or status change');
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] 🎉 Toast would show (real status transition)`, ...prev.slice(0, 49)]);
    } else {
      console.log('🛡️ Toast suppressed: Status unchanged (anti-spam working)');
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] 🛡️ Toast suppressed (anti-spam working)`, ...prev.slice(0, 49)]);
    }
  };

  const mqttConnected = mqttStats.connected;
  const storeBeacons = beacons;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🔍 Beacon Detection Pipeline Debugger</h1>
        <div className="flex gap-2">
          <Button onClick={clearLogs} variant="outline">Clear Logs</Button>
          <Button onClick={testLocalStorage} variant="outline">Test localStorage</Button>
          <Button onClick={forceStoreUpdate} variant="outline">Add Test Beacon</Button>
          <Button onClick={testAntiSpamToast} variant="outline">Test Anti-Spam</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pipeline Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Pipeline Status
              <Badge variant={mqttConnected ? "default" : "destructive"}>
                {mqttConnected ? "Active" : "Offline"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Step counters */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>📡 MQTT Messages:</span>
                  <Badge variant="outline">{pipelineStats.step1_mqtt_messages}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>🏪 Store Updates:</span>
                  <Badge variant="outline">{pipelineStats.step2_store_updates}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>👻 Ghost Created:</span>
                  <Badge variant="outline">{pipelineStats.step3_new_beacons}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>💾 localStorage:</span>
                  <Badge variant="outline">{pipelineStats.step5_localStorage_saves}</Badge>
                </div>
              </div>
              
              {/* Connection info */}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>🌐 MQTT Status:</span>
                  <span className={mqttConnected ? "text-green-600" : "text-red-600"}>
                    {mqttConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>🔗 Store Beacons:</span>
                  <span>{storeBeacons.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anti-Spam Toast Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🛡️ Anti-Spam Toast Status
              <Badge variant="default">Active</Badge>
            </CardTitle>
            <CardDescription>
              Collar status toasts now only fire on real state transitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="font-medium text-sm text-green-800 dark:text-green-200">✅ Toast Spam Fixed</div>
                <div className="text-xs text-green-600 dark:text-green-300 mt-1">
                  • Only show toast on status transitions (offline → online)<br/>
                  • 5-minute debounce prevents repeat toasts<br/>
                  • All status messages go to Recent Updates panel<br/>
                  • Much cleaner UX experience
                </div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="font-medium text-sm">Recent Updates Panel</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Check the main dashboard sidebar to see all collar status<br/>
                  messages in a non-intrusive scrollable list.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timestamp Fix Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⏰ Timestamp Fix Status
              <Badge variant="default">Fixed</Badge>
            </CardTitle>
            <CardDescription>
              Verifying local time vs device uptime timestamps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {storeBeacons.length > 0 ? (
                storeBeacons.slice(0, 3).map((beacon) => {
                  const now = Date.now();
                  const ageSeconds = Math.floor((now - beacon.timestamp) / 1000);
                  const deviceTimeDiff = beacon.deviceTimestamp ? 
                    Math.floor((beacon.timestamp - beacon.deviceTimestamp) / 1000) : 'N/A';
                  
                  return (
                    <div key={beacon.id} className="p-3 border rounded-lg">
                      <div className="font-medium text-sm">{beacon.name}</div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Age: {ageSeconds}s (should be recent)</div>
                        <div>Local Time: {new Date(beacon.timestamp).toLocaleTimeString()}</div>
                        {beacon.deviceTimestamp && (
                          <div>Device vs Local: +{deviceTimeDiff}s difference</div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No beacons detected yet.<br />
                  Start collar to test timestamp fix.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates Panel (Live Demo) */}
        <div>
          <RecentUpdatesPanel />
        </div>
      </div>

      {/* Debug Log */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🔬 Pipeline Debug Log</h2>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded max-h-64 overflow-y-auto font-mono text-sm">
          {logMessages.length === 0 ? (
            <p className="text-gray-500">No log messages yet - waiting for beacon detection...</p>
          ) : (
            logMessages.map((message, index) => (
              <div key={index} className="py-1 border-b border-gray-200 dark:border-gray-700">
                {message}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📋 End-to-End Testing Instructions</h2>
        <div className="prose max-w-none">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Check MQTT Connection:</strong> Ensure "MQTT Connected" shows ✅ Yes</li>
            <li><strong>Verify Topic Subscription:</strong> Look for "Subscribed to pet-collar/+/beacon-detection" in browser console</li>
            <li><strong>Trigger Beacon Detection:</strong> Use your collar to detect a beacon (serial monitor should show "🔍 PetZone beacon detected")</li>
            <li><strong>Watch Pipeline:</strong> Monitor the STEP counters above - they should increment in sequence</li>
            <li><strong>Verify UI Update:</strong> New beacon should appear in "Live Beacons" list within 1 second</li>
            <li><strong>Check Persistence:</strong> Refresh page and verify beacon persists (Step 5)</li>
          </ol>
        </div>
      </Card>
    </div>
  );
} 