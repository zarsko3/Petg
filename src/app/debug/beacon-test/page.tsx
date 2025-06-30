'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePetgStore } from '@/lib/store';
import { getMQTTClient } from '@/lib/mqtt-client';

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🔍 Beacon Detection Pipeline Debugger</h1>
        <div className="flex gap-2">
          <Button onClick={clearLogs} variant="outline">Clear Logs</Button>
          <Button onClick={testLocalStorage} variant="outline">Test localStorage</Button>
          <Button onClick={forceStoreUpdate} variant="outline">Add Test Beacon</Button>
        </div>
      </div>

      {/* Pipeline Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-center">📡 STEP 1</h3>
          <p className="text-sm text-gray-600 text-center">MQTT Messages</p>
          <div className="text-2xl font-bold text-center mt-2">{pipelineStats.step1_mqtt_messages}</div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-center">🏪 STEP 2</h3>
          <p className="text-sm text-gray-600 text-center">Store Updates</p>
          <div className="text-2xl font-bold text-center mt-2">{pipelineStats.step2_store_updates}</div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-center">👻 STEP 3</h3>
          <p className="text-sm text-gray-600 text-center">New Ghosts</p>
          <div className="text-2xl font-bold text-center mt-2">{pipelineStats.step3_new_beacons}</div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-center">🎨 STEP 4</h3>
          <p className="text-sm text-gray-600 text-center">UI Renders</p>
          <div className="text-2xl font-bold text-center mt-2">{pipelineStats.step4_ui_renders}</div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold text-center">💾 STEP 5</h3>
          <p className="text-sm text-gray-600 text-center">localStorage</p>
          <div className="text-2xl font-bold text-center mt-2">{pipelineStats.step5_localStorage_saves}</div>
        </Card>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            🌐 Connection Status
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>MQTT Connected:</span>
              <span className={mqttStats.connected ? "text-green-600" : "text-red-600"}>
                {mqttStats.connected ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Collar Connected:</span>
              <span className={isConnected ? "text-green-600" : "text-red-600"}>
                {isConnected ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Connection Status:</span>
              <span>{connectionStatus}</span>
            </div>
          </div>
        </Card>

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