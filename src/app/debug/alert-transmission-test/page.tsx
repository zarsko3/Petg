'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, RotateCcw, Zap, Wifi, CheckCircle } from 'lucide-react';
import { getMQTTClient } from '@/lib/mqtt-client';

interface TransmissionLog {
  timestamp: string;
  method: 'MQTT' | 'WebSocket' | 'HTTP';
  topic?: string;
  url?: string;
  payload: any;
  success: boolean;
  response?: any;
  error?: string;
}

export default function AlertTransmissionTestPage() {
  const [logs, setLogs] = useState<TransmissionLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [collarId] = useState('001');
  const [isTesting, setIsTesting] = useState(false);

  const addLog = (log: Omit<TransmissionLog, 'timestamp'>) => {
    setLogs(prev => [...prev, {
      ...log,
      timestamp: new Date().toISOString()
    }]);
  };

  const clearLogs = () => setLogs([]);

  // Test MQTT transmission (BeaconSettingsDrawer method)
  const testMQTTTransmission = async (alertMode: 'buzzer' | 'vibration' | 'both') => {
    setIsTesting(true);
    
    try {
      const mqttClient = getMQTTClient();
      const topic = `pet-collar/${collarId}/command`;
      const payload = {
        cmd: 'test-alert',
        alertMode: alertMode,
        durationMs: 1200,
        intensity: 150
      };

      console.log(`📤 MQTT Test - Topic: ${topic}, Payload:`, payload);
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      addLog({
        method: 'MQTT',
        topic,
        payload,
        success,
        response: success ? 'Published successfully' : 'Failed to publish'
      });

    } catch (error) {
      console.error('MQTT test error:', error);
      addLog({
        method: 'MQTT',
        topic: `pet-collar/${collarId}/command`,
        payload: { alertMode },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    setIsTesting(false);
  };

  // Test WebSocket transmission (BeaconConfigurationPanel method)
  const testWebSocketTransmission = async (alertMode: 'buzzer' | 'vibration' | 'both') => {
    setIsTesting(true);
    
    try {
      // Try to get current collar IP from discovery
      let collarIP = localStorage.getItem('petg.collarIP') || '192.168.1.35';
      
      // Try to get updated IP from collar-proxy if available
      try {
        const response = await fetch('/api/collar-proxy?endpoint=/api/discover', {
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          const data = await response.json();
          collarIP = data.local_ip || data.ip_address || collarIP;
          console.log(`🔍 Updated collar IP from discovery: ${collarIP}`);
        }
      } catch (discoveryError) {
        console.log('⚠️ Could not update collar IP, using cached/fallback:', collarIP);
      }
      
      const wsUrl = `ws://${collarIP}:8080`;
      
      // Map to collar command format
      let command = 'test_buzzer';
      if (alertMode === 'vibration') command = 'test_vibration';
      
      const payload = { command };
      
      console.log(`📡 WebSocket Test - URL: ${wsUrl}, Payload:`, payload);
      
      // Check for HTTPS/WS security issue
      if (window.location.protocol === 'https:') {
        console.warn('⚠️ HTTPS page trying to connect to WS (not WSS) - browser may block this');
        addLog({
          method: 'WebSocket',
          url: wsUrl,
          payload,
          success: false,
          error: 'Failed to construct \'WebSocket\': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.'
        });
        setIsTesting(false);
        return;
      }
      
      const ws = new WebSocket(wsUrl);
      
      const result = await new Promise<{ success: boolean; response?: any; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'Connection timeout' });
        }, 5000);

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          ws.send(JSON.stringify(payload));
          console.log('📤 Command sent:', JSON.stringify(payload));
        };

        ws.onmessage = (event) => {
          console.log('📥 Response received:', event.data);
          clearTimeout(timeout);
          ws.close();
          resolve({ success: true, response: event.data });
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          clearTimeout(timeout);
          resolve({ success: false, error: 'WebSocket connection failed' });
        };

        ws.onclose = (event) => {
          clearTimeout(timeout);
          if (event.code !== 1000) {
            resolve({ success: false, error: `Connection closed with code ${event.code}` });
          }
        };
      });

      addLog({
        method: 'WebSocket',
        url: wsUrl,
        payload,
        success: result.success,
        response: result.response,
        error: result.error
      });

    } catch (error) {
      console.error('WebSocket test error:', error);
      
      // Handle specific security error
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('insecure WebSocket connection')) {
        errorMessage = 'Security Error: HTTPS page cannot connect to WS (non-secure WebSocket). Try accessing via HTTP instead.';
      }
      
      addLog({
        method: 'WebSocket',
        url: 'Security Blocked',
        payload: { alertMode },
        success: false,
        error: errorMessage
      });
    }
    
    setIsTesting(false);
  };

  // Test HTTP API transmission
  const testHTTPTransmission = async (alertMode: 'buzzer' | 'vibration' | 'both') => {
    setIsTesting(true);
    
    try {
      const url = '/api/test-alert';
      const payload = {
        beaconId: 'test-beacon-001',
        alertMode: alertMode,
        duration: 2000,
        intensity: 150,
        fallback: true
      };

      console.log(`🌐 HTTP Test - URL: ${url}, Payload:`, payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      addLog({
        method: 'HTTP',
        url,
        payload,
        success: response.ok,
        response: result
      });

    } catch (error) {
      console.error('HTTP test error:', error);
      addLog({
        method: 'HTTP',
        url: '/api/test-alert',
        payload: { alertMode },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    setIsTesting(false);
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      MQTT: 'bg-blue-100 text-blue-800',
      WebSocket: 'bg-green-100 text-green-800',
      HTTP: 'bg-purple-100 text-purple-800'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Transmission Verification</h1>
          <p className="text-gray-600">
            Test and verify that alertMode data is correctly transmitted from UI to device
          </p>
        </div>
        <Button onClick={clearLogs} variant="outline">
          Clear Logs
        </Button>
      </div>

      {/* Security Warning for HTTPS */}
      {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 text-amber-600 mt-0.5">⚠️</div>
            <div>
              <h3 className="font-semibold text-amber-800">WebSocket Security Limitation</h3>
              <p className="text-amber-700 mt-1">
                This page is loaded over HTTPS, which prevents WebSocket connections to non-secure collar endpoints (ws://). 
              </p>
              <div className="mt-2 space-y-1 text-sm text-amber-600">
                <p><strong>Solutions:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Access this page via HTTP instead: <code className="bg-amber-100 px-1 rounded">http://localhost:3000{window.location.pathname}</code></li>
                  <li>• MQTT and HTTP tests will work normally</li>
                  <li>• WebSocket tests require HTTP access for security reasons</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MQTT Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-blue-500" />
              MQTT Transmission
            </CardTitle>
            <p className="text-sm text-gray-600">
              Tests the BeaconSettingsDrawer method via MQTT
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => testMQTTTransmission('buzzer')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Test Buzzer
            </Button>
            <Button 
              onClick={() => testMQTTTransmission('vibration')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Test Vibration
            </Button>
            <Button 
              onClick={() => testMQTTTransmission('both')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Both
            </Button>
          </CardContent>
        </Card>

        {/* WebSocket Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              WebSocket Transmission
            </CardTitle>
            <p className="text-sm text-gray-600">
              Tests the BeaconConfigurationPanel method via WebSocket
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => testWebSocketTransmission('buzzer')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Test Buzzer
            </Button>
            <Button 
              onClick={() => testWebSocketTransmission('vibration')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Test Vibration
            </Button>
            <Button 
              onClick={() => testWebSocketTransmission('both')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Both
            </Button>
          </CardContent>
        </Card>

        {/* HTTP Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-5 w-5 bg-purple-500 rounded" />
              HTTP API Transmission
            </CardTitle>
            <p className="text-sm text-gray-600">
              Tests the fallback HTTP API method
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => testHTTPTransmission('buzzer')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Test Buzzer
            </Button>
            <Button 
              onClick={() => testHTTPTransmission('vibration')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Test Vibration
            </Button>
            <Button 
              onClick={() => testHTTPTransmission('both')}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Both
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transmission Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Transmission Logs</CardTitle>
          <p className="text-sm text-gray-600">
            Real-time log of all alert transmissions with payload verification
          </p>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transmissions logged yet. Click a test button above to start.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.slice().reverse().map((log, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getMethodBadge(log.method)}>
                        {log.method}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <Badge variant={log.success ? 'default' : 'destructive'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Destination:</strong> {log.topic || log.url || 'Unknown'}
                    </div>
                    <div>
                      <strong>Payload:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                    {log.response && (
                      <div>
                        <strong>Response:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.error && (
                      <div>
                        <strong>Error:</strong> 
                        <span className="text-red-600 ml-2">{log.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expected Firmware Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Firmware Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">MQTT (pet-collar/001/command)</h4>
              <ul className="space-y-1 text-gray-600">
                               <li>• Receives: <code>{`{"cmd": "test-alert", "alertMode": "buzzer"}`}</code></li>
                 <li>• Activates: GPIO pin 18 with 1kHz tone</li>
                 <li>• Duration: Uses <code>durationMs</code> from payload</li>
                 <li>• Serial: "🧪 Test Alert Command: mode=buzzer..."</li>
               </ul>
             </div>
             <div>
               <h4 className="font-semibold mb-2">WebSocket (ws://IP:8080)</h4>
               <ul className="space-y-1 text-gray-600">
                 <li>• Receives: <code>{`{"command": "test_buzzer"}`}</code></li>
                 <li>• Activates: AlertManager test mode</li>
                 <li>• Response: <code>{`{"type": "response", "command": "test_buzzer"}`}</code></li>
                 <li>• Serial: "🧪 buzzer test triggered"</li>
               </ul>
             </div>
             <div>
               <h4 className="font-semibold mb-2">HTTP (Fallback)</h4>
               <ul className="space-y-1 text-gray-600">
                 <li>• Validates: <code>alertMode</code> parameter</li>
                 <li>• Returns: Success/failure JSON response</li>
                 <li>• May attempt: WebSocket proxy to collar</li>
                 <li>• Fallback: Simulation mode for testing</li>
               </ul>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
} 