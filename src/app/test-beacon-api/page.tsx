'use client';

import { useState } from 'react';
import { ChevronRight, PlayCircle, Plus, Edit, Trash } from 'lucide-react';

interface BeaconConfiguration {
  id: string;
  name: string;
  location: string;
  zone?: string;
  macAddress?: string;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  proximityThreshold: number;
  alertDelay: number;
  alertTimeout: number;
  safeZone: boolean;
  boundaryAlert: boolean;
  position: { x: number; y: number };
  isAutoDetected?: boolean;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  status?: 'online' | 'offline' | 'low-battery';
  createdAt?: string;
  updatedAt?: string;
}

export default function TestBeaconApiPage() {
  const [beacons, setBeacons] = useState<BeaconConfiguration[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGetBeacons = async () => {
    try {
      setIsLoading(true);
      addTestResult('🔍 Testing GET /api/beacons...');
      
      const response = await fetch('/api/beacons');
      const data = await response.json();
      
      if (data.success) {
        setBeacons(data.data);
        addTestResult(`✅ GET successful: ${data.data.length} beacons found`);
      } else {
        addTestResult(`❌ GET failed: ${data.error}`);
      }
    } catch (error) {
      addTestResult(`❌ GET error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateBeacon = async () => {
    try {
      setIsLoading(true);
      addTestResult('➕ Testing POST /api/beacons...');
      
      const newBeacon = {
        name: `Test Beacon ${Date.now()}`,
        location: 'Test Location',
        zone: 'Test Zone',
        alertMode: 'buzzer' as const,
        proximityThreshold: -65,
        alertDelay: 3000,
        alertTimeout: 10000,
        safeZone: false,
        boundaryAlert: true,
        position: { x: 25, y: 25 }
      };
      
      const response = await fetch('/api/beacons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBeacon)
      });
      
      const data = await response.json();
      
      if (data.success) {
        addTestResult(`✅ POST successful: Created ${data.data.name}`);
        await testGetBeacons(); // Refresh list
      } else {
        addTestResult(`❌ POST failed: ${data.error}`);
      }
    } catch (error) {
      addTestResult(`❌ POST error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUpdateBeacon = async (beacon: BeaconConfiguration) => {
    try {
      setIsLoading(true);
      addTestResult(`✏️ Testing PUT /api/beacons for ${beacon.name}...`);
      
      const updatedBeacon = {
        ...beacon,
        alertMode: 'both' as const,
        proximityThreshold: -70,
        location: beacon.location + ' (Updated)'
      };
      
      const response = await fetch('/api/beacons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBeacon)
      });
      
      const data = await response.json();
      
      if (data.success) {
        addTestResult(`✅ PUT successful: Updated ${data.data.name}`);
        await testGetBeacons(); // Refresh list
      } else {
        addTestResult(`❌ PUT failed: ${data.error}`);
      }
    } catch (error) {
      addTestResult(`❌ PUT error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteBeacon = async (beacon: BeaconConfiguration) => {
    try {
      setIsLoading(true);
      addTestResult(`🗑️ Testing DELETE /api/beacons for ${beacon.name}...`);
      
      const response = await fetch(`/api/beacons?id=${beacon.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        addTestResult(`✅ DELETE successful: Removed ${beacon.name}`);
        await testGetBeacons(); // Refresh list
      } else {
        addTestResult(`❌ DELETE failed: ${data.error}`);
      }
    } catch (error) {
      addTestResult(`❌ DELETE error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAlertEndpoint = async () => {
    try {
      setIsLoading(true);
      addTestResult('🔊 Testing POST /api/test-alert...');
      
      const response = await fetch('/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beaconId: 'test-beacon',
          alertMode: 'buzzer',
          duration: 2000,
          intensity: 2000,
          fallback: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addTestResult(`✅ Test alert successful: ${data.message}`);
      } else {
        addTestResult(`❌ Test alert failed: ${data.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Test alert error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting comprehensive API tests...');
    
    await testGetBeacons();
    await testCreateBeacon();
    if (beacons.length > 0) {
      await testUpdateBeacon(beacons[0]);
    }
    await testAlertEndpoint();
    
    addTestResult('✅ All tests completed!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Beacon API Test Suite
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test all beacon configuration API endpoints to verify functionality
          </p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* API Test Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              API Test Controls
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={runAllTests}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                <PlayCircle className="h-5 w-5" />
                {isLoading ? 'Running Tests...' : 'Run All Tests'}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={testGetBeacons}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  GET
                </button>
                
                <button
                  onClick={testCreateBeacon}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  POST
                </button>
              </div>
              
              <button
                onClick={testAlertEndpoint}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
              >
                🔊 Test Alert
              </button>
            </div>
          </div>

          {/* Current Beacons */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Current Beacons ({beacons.length})
            </h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {beacons.map(beacon => (
                <div key={beacon.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {beacon.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {beacon.location} • {beacon.alertMode}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => testUpdateBeacon(beacon)}
                      disabled={isLoading}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => testDeleteBeacon(beacon)}
                      disabled={isLoading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {beacons.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No beacons configured yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Test Results
          </h2>
          
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">
                Run tests to see results here...
              </div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
          
          {testResults.length > 0 && (
            <button
              onClick={() => setTestResults([])}
              className="mt-4 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 