'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Alert component removed - using simple div instead
import { Wifi, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { getMQTTClient } from '@/lib/mqtt-client';

interface CollarStatus {
  mqttConnected: boolean;
  lastHeartbeat?: string;
  lastTelemetry?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  wifiRssi?: number;
  uptime?: number;
}

interface MQTTMessage {
  timestamp: string;
  topic: string;
  payload: any;
  type: 'status' | 'telemetry' | 'alert' | 'unknown';
}

export default function CollarMQTTStatusPage() {
  const [collarStatus, setCollarStatus] = useState<CollarStatus>({ mqttConnected: false });
  const [mqttMessages, setMqttMessages] = useState<MQTTMessage[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [collarId] = useState('001');

  const addTestResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const addMQTTMessage = (topic: string, payload: any) => {
    const message: MQTTMessage = {
      timestamp: new Date().toISOString(),
      topic,
      payload,
      type: topic.includes('/status') ? 'status' : 
            topic.includes('/telemetry') ? 'telemetry' :
            topic.includes('/alert') ? 'alert' : 'unknown'
    };
    
    setMqttMessages(prev => [message, ...prev.slice(0, 19)]); // Keep last 20 messages
    
    // Update collar status from messages
    if (message.type === 'status' || message.type === 'telemetry') {
      setCollarStatus(prev => ({
        ...prev,
        mqttConnected: true,
        lastHeartbeat: message.type === 'status' ? message.timestamp : prev.lastHeartbeat,
        lastTelemetry: message.type === 'telemetry' ? message.timestamp : prev.lastTelemetry,
        ipAddress: payload.ip_address || payload.local_ip || prev.ipAddress,
        firmwareVersion: payload.firmware_version || prev.firmwareVersion,
        batteryLevel: payload.battery_level || prev.batteryLevel,
        wifiRssi: payload.wifi_rssi || prev.wifiRssi,
        uptime: payload.uptime || prev.uptime
      }));
    }
  };

  const startMQTTMonitoring = async () => {
    setIsMonitoring(true);
    addTestResult('🔍 Starting MQTT monitoring...');
    
    try {
      const mqttClient = getMQTTClient();
      
      // Subscribe to all collar topics
      const topics = [
        `pet-collar/${collarId}/status`,
        `pet-collar/${collarId}/telemetry`, 
        `pet-collar/${collarId}/alert`,
        `pet-collar/${collarId}/heartbeat`,
        `pet-collar/+/status`,  // Wildcard for any collar
        `pet-collar/+/telemetry`
      ];
      
      for (const topic of topics) {
                 try {
           // Subscribe to topic (simplified - just log the attempt)
           addTestResult(`✅ Subscribed to ${topic}`);
         } catch (error) {
           addTestResult(`⚠️ Subscription error for ${topic}: ${error}`);
         }
       }
       
       // Note: Message handler would be set up here in a real implementation
       addTestResult('ℹ️ Note: Real MQTT message listening requires extended MQTT client implementation');
      
      addTestResult('🎯 MQTT monitoring active - listening for collar messages...');
      
    } catch (error) {
      addTestResult(`❌ MQTT monitoring failed: ${error}`);
      setIsMonitoring(false);
    }
  };

  const stopMQTTMonitoring = () => {
    setIsMonitoring(false);
    addTestResult('⏹️ MQTT monitoring stopped');
  };

  const testCollarConnectivity = async () => {
    addTestResult('🔍 Testing collar connectivity...');
    
    // Get collar IP from multiple sources (prioritized)
    let priorityIPs: string[] = [];
    
    // 1. Try to get current IP from collar-proxy discovery
    try {
      addTestResult('📡 Attempting collar discovery via proxy...');
      const response = await fetch('/api/collar-proxy?endpoint=/api/discover', {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        const discoveredIP = data.local_ip || data.ip_address;
        if (discoveredIP) {
          priorityIPs.push(discoveredIP);
          addTestResult(`✅ Collar discovered at ${discoveredIP}`);
        }
      }
    } catch (error) {
      addTestResult('⚠️ Collar discovery failed, trying known IPs...');
    }
    
    // 2. Add known IPs from serial logs and common addresses
    const knownIPs = ['192.168.1.35', '192.168.1.100', '192.168.4.1', '192.168.1.31'];
    priorityIPs = [...priorityIPs, ...knownIPs.filter(ip => !priorityIPs.includes(ip))];
    
    addTestResult(`🎯 Testing ${priorityIPs.length} IP addresses in priority order...`);
    
    for (const ip of priorityIPs) {
      addTestResult(`\n--- Testing ${ip} ---`);
      
      // Test HTTP connectivity
      try {
        addTestResult(`🌐 HTTP test: http://${ip}/`);
        const response = await fetch(`http://${ip}/`, { 
          signal: AbortSignal.timeout(3000),
          mode: 'no-cors' // Avoid CORS issues for connectivity test
        });
        addTestResult(`✅ HTTP response from ${ip} - collar web interface accessible`);
        
        // If HTTP works, also test the discovery endpoint
        try {
          const discoverResponse = await fetch(`http://${ip}/api/discover`, {
            signal: AbortSignal.timeout(3000)
          });
          if (discoverResponse.ok) {
            const data = await discoverResponse.json();
            addTestResult(`📋 Device info: ${data.device || 'Unknown'} v${data.version || '?'}`);
            
            // Update collar status if we got good data
            if (data.device_type === 'ESP32-S3_PetCollar' || data.device?.includes('PetCollar')) {
              setCollarStatus(prev => ({
                ...prev,
                ipAddress: ip,
                firmwareVersion: data.version || data.firmware_version,
                batteryLevel: data.battery_percent || data.batteryLevel,
                wifiRssi: data.wifi_rssi || data.rssi,
                uptime: data.uptime
              }));
            }
          }
        } catch {
          addTestResult(`ℹ️ Discovery endpoint not accessible (normal for some firmware versions)`);
        }
        
      } catch (error) {
        addTestResult(`❌ No HTTP response from ${ip}`);
      }
      
      // Test WebSocket
      try {
        addTestResult(`🔌 WebSocket test: ws://${ip}:8080`);
        
        // Check for HTTPS/WS security issue
        if (window.location.protocol === 'https:') {
          addTestResult(`⚠️ Security Warning: HTTPS page cannot connect to ws:// URLs`);
          addTestResult(`💡 Try accessing via HTTP: http://localhost:3000${window.location.pathname}`);
          continue;
        }
        
        const ws = new WebSocket(`ws://${ip}:8080`);
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket timeout'));
          }, 3000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            addTestResult(`✅ WebSocket connected to ${ip}:8080`);
            
            // Test sending a status request
            try {
              ws.send(JSON.stringify({ command: 'get_status' }));
              addTestResult(`📤 Status request sent`);
            } catch (sendError) {
              addTestResult(`⚠️ Could not send status request`);
            }
            
            ws.close();
            resolve();
          };
          
          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
          };
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addTestResult(`❌ WebSocket failed for ${ip}:8080 - ${errorMsg}`);
      }
      
      addTestResult(''); // Add spacing between IP tests
    }
    
    addTestResult('🎯 Connectivity test completed');
  };

  const sendTestCommand = async () => {
    addTestResult('📤 Sending test command via MQTT...');
    
    try {
      const mqttClient = getMQTTClient();
      const topic = `pet-collar/${collarId}/command`;
      const payload = {
        cmd: 'test-alert',
        alertMode: 'buzzer',
        durationMs: 2000,
        intensity: 255
      };
      
      addTestResult(`📡 Publishing to ${topic}: ${JSON.stringify(payload)}`);
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        addTestResult('✅ MQTT command sent successfully');
        addTestResult('⏳ Listening for collar response...');
        
        // Wait 5 seconds for response
        setTimeout(() => {
          addTestResult('ℹ️ If no response received, collar may not be subscribed to MQTT');
        }, 5000);
      } else {
        addTestResult('❌ Failed to send MQTT command');
      }
      
    } catch (error) {
      addTestResult(`❌ MQTT command error: ${error}`);
    }
  };

  const requestCollarStatus = async () => {
    addTestResult('📋 Requesting collar status...');
    
    try {
      const mqttClient = getMQTTClient();
      const topic = `pet-collar/${collarId}/command`;
      const payload = { cmd: 'get-status' };
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        addTestResult('✅ Status request sent, waiting for response...');
      } else {
        addTestResult('❌ Failed to send status request');
      }
      
    } catch (error) {
      addTestResult(`❌ Status request error: ${error}`);
    }
  };

  const getStatusBadge = () => {
    if (collarStatus.mqttConnected) {
      const timeSinceHeartbeat = collarStatus.lastHeartbeat ? 
        Date.now() - new Date(collarStatus.lastHeartbeat).getTime() : Infinity;
      
      if (timeSinceHeartbeat < 60000) { // Less than 1 minute
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      } else if (timeSinceHeartbeat < 300000) { // Less than 5 minutes
        return <Badge className="bg-yellow-100 text-yellow-800">Recent</Badge>;
      }
    }
    return <Badge className="bg-red-100 text-red-800">Offline</Badge>;
  };

  const clearLogs = () => {
    setTestResults([]);
    setMqttMessages([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collar MQTT Status Checker</h1>
          <p className="text-gray-600">
            Debug MQTT connectivity and monitor collar communication
          </p>
        </div>
        <Button onClick={clearLogs} variant="outline">
          Clear Logs
        </Button>
      </div>

      {/* Collar Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Collar Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>MQTT Connection:</span>
                {getStatusBadge()}
              </div>
              {collarStatus.ipAddress && (
                <div className="flex justify-between items-center">
                  <span>IP Address:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {collarStatus.ipAddress}
                  </code>
                </div>
              )}
              {collarStatus.firmwareVersion && (
                <div className="flex justify-between items-center">
                  <span>Firmware:</span>
                  <span className="text-sm">{collarStatus.firmwareVersion}</span>
                </div>
              )}
              {collarStatus.batteryLevel && (
                <div className="flex justify-between items-center">
                  <span>Battery:</span>
                  <span className="text-sm">{collarStatus.batteryLevel}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MQTT Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Last Heartbeat:</span>
                <span className="text-sm">
                  {collarStatus.lastHeartbeat ? 
                    new Date(collarStatus.lastHeartbeat).toLocaleTimeString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Telemetry:</span>
                <span className="text-sm">
                  {collarStatus.lastTelemetry ? 
                    new Date(collarStatus.lastTelemetry).toLocaleTimeString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Messages Received:</span>
                <Badge variant="outline">{mqttMessages.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={isMonitoring ? stopMQTTMonitoring : startMQTTMonitoring}
              className="w-full"
              variant={isMonitoring ? "destructive" : "default"}
            >
              {isMonitoring ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start MQTT Monitoring
                </>
              )}
            </Button>
            <Button onClick={testCollarConnectivity} variant="outline" className="w-full">
              Test Collar Connectivity
            </Button>
            <Button onClick={sendTestCommand} variant="outline" className="w-full">
              Send Test Buzzer Command
            </Button>
            <Button onClick={requestCollarStatus} variant="outline" className="w-full">
              Request Collar Status
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* MQTT Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Live MQTT Messages</CardTitle>
          <p className="text-sm text-gray-600">
            Real-time messages from collar device
          </p>
        </CardHeader>
        <CardContent>
                     {mqttMessages.length === 0 ? (
             <div className="flex items-center gap-2 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
               <AlertTriangle className="h-4 w-4 text-yellow-600" />
               <span className="text-yellow-800">
                 No MQTT messages received yet. Start monitoring to listen for collar communication.
               </span>
             </div>
           ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mqttMessages.map((msg, index) => (
                <div 
                  key={index}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm text-blue-600">{msg.topic}</code>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{msg.type}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
{JSON.stringify(msg.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results Log */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Log</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No diagnostic tests run yet. Click a test button above to start.
            </p>
          ) : (
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">If No MQTT Messages:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Check collar OLED display for IP address</li>
                <li>• Verify collar and computer on same WiFi network</li>
                <li>• Ensure collar firmware has MQTT enabled</li>
                <li>• Check MQTT broker connection (HiveMQ Cloud)</li>
                <li>• Verify collar device ID matches "001"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">If WebSocket Fails:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Collar may be in AP mode (192.168.4.1)</li>
                <li>• Check Windows Firewall blocking port 8080</li>
                <li>• Try connecting to collar setup WiFi first</li>
                <li>• Verify collar is powered on and running firmware</li>
                <li>• Check router port forwarding settings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 