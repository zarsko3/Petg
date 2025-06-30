'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMQTTClient, MQTT_TOPICS } from '@/lib/mqtt-client';
import { toast } from 'sonner';
import { 
  Wifi, 
  Zap, 
  Volume2, 
  RotateCcw, 
  CircleCheck, 
  CircleX, 
  RefreshCw,
  TestTube,
  AlertTriangle,
  Settings
} from 'lucide-react';

export default function CollarConnectionTestPage() {
  const [mqttConnected, setMqttConnected] = useState(false);
  const [collarStatus, setCollarStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [collarId, setCollarId] = useState('001');

  const mqttClient = getMQTTClient();

  useEffect(() => {
    // Set up MQTT event handlers
    mqttClient.onConnect = () => {
      console.log('🔗 MQTT Connected to HiveMQ');
      setMqttConnected(true);
      addTestResult('✅ MQTT connection established');
    };

    mqttClient.onDisconnect = () => {
      console.log('🔌 MQTT Disconnected');
      setMqttConnected(false);
      addTestResult('❌ MQTT connection lost');
    };

    mqttClient.onCollarStatus = (id: string, data: any) => {
      console.log(`📡 Collar ${id} status:`, data);
      setCollarStatus(data.status);
      setLastSeen(new Date());
      addTestResult(`📡 Collar ${id}: ${data.status}`);
    };

    mqttClient.onCollarTelemetry = (id: string, data: any) => {
      console.log(`📊 Collar ${id} telemetry:`, data);
      setLastSeen(new Date());
      addTestResult(`📊 Collar ${id} telemetry received`);
    };

    // Check initial connection status
    const status = mqttClient.getConnectionStatus();
    setMqttConnected(status.connected);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testMQTTConnection = async () => {
    addTestResult('🔍 Testing MQTT connection...');
    const status = mqttClient.getConnectionStatus();
    
    if (status.connected) {
      addTestResult('✅ MQTT client reports connected');
      
      // Test publish capability
      try {
        const testTopic = 'test/web-client';
        const testPayload = JSON.stringify({ test: true, timestamp: Date.now() });
        
        const success = await mqttClient.publish(testTopic, testPayload);
        if (success) {
          addTestResult('✅ MQTT publish test successful');
        } else {
          addTestResult('❌ MQTT publish test failed');
        }
      } catch (error) {
        addTestResult(`❌ MQTT publish error: ${error}`);
      }
    } else {
      addTestResult('❌ MQTT client not connected');
    }
  };

  const testCollarBuzz = async (mode: 'buzzer' | 'vibration' | 'both') => {
    setIsTesting(true);
    addTestResult(`🔔 Testing ${mode} alert...`);
    
    try {
      // Method 1: New BeaconSettingsDrawer method
      const topic = `pet-collar/${collarId}/command`;
      const payload = {
        cmd: 'test-alert',
        alertMode: mode,
        durationMs: 2000,
        intensity: 200
      };
      
      console.log(`📤 Publishing to ${topic}:`, payload);
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        addTestResult(`✅ ${mode} command sent via pet-collar/${collarId}/command`);
        toast.success(`${mode.charAt(0).toUpperCase() + mode.slice(1)} Test Sent`, {
          description: 'Check if your collar responded'
        });
      } else {
        addTestResult(`❌ Failed to send ${mode} command`);
        toast.error('Command Failed', {
          description: 'MQTT publish failed'
        });
      }
      
      // Method 2: Legacy buzz command (fallback)
      setTimeout(async () => {
        const legacyTopic = MQTT_TOPICS.COLLAR_COMMAND_BUZZ(collarId);
        const legacyPayload = {
          duration_ms: 2000,
          pattern: 'single'
        };
        
        console.log(`📤 Publishing legacy command to ${legacyTopic}:`, legacyPayload);
        const legacySuccess = await mqttClient.publish(legacyTopic, JSON.stringify(legacyPayload));
        
        if (legacySuccess) {
          addTestResult(`✅ Legacy buzz command sent via ${legacyTopic}`);
        } else {
          addTestResult(`❌ Legacy buzz command failed`);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Test error:', error);
      addTestResult(`❌ Test error: ${error}`);
      toast.error('Test Error', {
        description: `${error}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testDirectWebSocket = () => {
    addTestResult('🌐 Testing direct WebSocket connection...');
    
    // Test common collar IP addresses
    const testIPs = ['192.168.1.100', '192.168.4.1', '10.0.0.100'];
    
    testIPs.forEach((ip, index) => {
      setTimeout(() => {
        const ws = new WebSocket(`ws://${ip}:8080`);
        
        ws.onopen = () => {
          addTestResult(`✅ WebSocket connected to ${ip}:8080`);
          ws.send(JSON.stringify({ 
            op: 'alert', 
            intensity: 255, 
            duration: 1000 
          }));
          ws.close();
        };
        
        ws.onerror = (error) => {
          addTestResult(`❌ WebSocket failed to ${ip}:8080`);
        };
        
        ws.onmessage = (message) => {
          addTestResult(`📨 WebSocket response from ${ip}: ${message.data}`);
        };
        
        // Close after 3 seconds if no response
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            addTestResult(`⏰ WebSocket timeout to ${ip}:8080`);
          }
        }, 3000);
      }, index * 1000); // Stagger tests
    });
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <TestTube className="h-8 w-8 text-blue-500" />
            Collar Connection Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Debug collar connectivity and test alert functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>MQTT Connection</span>
                <Badge variant={mqttConnected ? "default" : "destructive"}>
                  {mqttConnected ? (
                    <><CircleCheck className="h-3 w-3 mr-1" /> Connected</>
                  ) : (
                    <><CircleX className="h-3 w-3 mr-1" /> Disconnected</>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Collar Status</span>
                <Badge variant={collarStatus === 'online' ? "default" : collarStatus === 'offline' ? "destructive" : "secondary"}>
                  {collarStatus === 'online' && <CircleCheck className="h-3 w-3 mr-1" />}
                  {collarStatus === 'offline' && <CircleX className="h-3 w-3 mr-1" />}
                  {collarStatus === 'unknown' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {collarStatus}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Last Seen</span>
                <span className="text-sm text-gray-500">
                  {lastSeen ? lastSeen.toLocaleTimeString() : 'Never'}
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Collar ID
                </label>
                <input
                  type="text"
                  value={collarId}
                  onChange={(e) => setCollarId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                  placeholder="001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Test Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testMQTTConnection}
                variant="outline"
                className="w-full"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Test MQTT Connection
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium">Test Collar Alerts</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => testCollarBuzz('buzzer')}
                    disabled={isTesting || !mqttConnected}
                    size="sm"
                    variant="outline"
                  >
                    <Volume2 className="h-3 w-3 mr-1" />
                    Buzzer
                  </Button>
                  <Button
                    onClick={() => testCollarBuzz('vibration')}
                    disabled={isTesting || !mqttConnected}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Vibrate
                  </Button>
                  <Button
                    onClick={() => testCollarBuzz('both')}
                    disabled={isTesting || !mqttConnected}
                    size="sm"
                    variant="outline"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Both
                  </Button>
                </div>
              </div>

              <Button 
                onClick={testDirectWebSocket}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Direct WebSocket
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Test Results</CardTitle>
            <Button onClick={clearResults} variant="outline" size="sm">
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500">No test results yet. Run a test to see output here.</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>If MQTT shows connected but collar doesn't respond:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 text-gray-600 dark:text-gray-400">
                  <li>Check that collar firmware is using the same MQTT broker</li>
                  <li>Verify collar ID matches (default: 001)</li>
                  <li>Ensure collar is connected to WiFi (not just bluetooth)</li>
                </ul>
              </div>
              
              <div>
                <strong>If WebSocket test succeeds but MQTT fails:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 text-gray-600 dark:text-gray-400">
                  <li>Use the direct WebSocket IP for testing</li>
                  <li>MQTT may have credential/topic mismatch</li>
                  <li>Check collar's MQTT configuration</li>
                </ul>
              </div>
              
              <div>
                <strong>Command Topics:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 text-gray-600 dark:text-gray-400">
                  <li>New format: <code>pet-collar/001/command</code></li>
                  <li>Legacy format: <code>pet-collar/001/command/buzz</code></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 