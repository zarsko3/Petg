'use client';

/**
 * 🧪 MQTT Test Page
 * 
 * Debug interface for testing MQTT connectivity with HiveMQ cloud
 * and collar communication
 */

import { useState } from 'react';
import { useMQTT } from '@/hooks/useMQTT';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Wifi, WifiOff, Zap, Lightbulb } from 'lucide-react';

export default function MQTTTestPage() {
  const mqtt = useMQTT();
  const [testCollarId, setTestCollarId] = useState('001');
  const [buzzerDuration, setBuzzerDuration] = useState('500');
  const [ledColor, setLedColor] = useState('white');
  const [ledDuration, setLedDuration] = useState('1000');

  const handleBuzzTest = async () => {
    const success = await mqtt.sendBuzzCommand(testCollarId, parseInt(buzzerDuration), 'single');
    if (success) {
      alert(`✅ Buzz command sent to collar ${testCollarId}`);
    } else {
      alert(`❌ Failed to send buzz command`);
    }
  };

  const handleLEDTest = async () => {
    const success = await mqtt.sendLEDCommand(testCollarId, 'blink', ledColor, parseInt(ledDuration));
    if (success) {
      alert(`✅ LED command sent to collar ${testCollarId}`);
    } else {
      alert(`❌ Failed to send LED command`);
    }
  };

  const getConnectionStatusColor = () => {
    if (mqtt.state.isConnected) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getConnectionStatusIcon = () => {
    if (mqtt.state.isConnected) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🌐 MQTT Test Interface</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
          <span className="text-sm text-gray-600">
            {mqtt.state.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            HiveMQ Cloud Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-2 mt-1">
                {mqtt.state.isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <Badge variant={mqtt.state.isConnected ? 'default' : 'destructive'}>
                  {mqtt.state.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Client ID</Label>
              <p className="text-sm text-gray-600 mt-1">{mqtt.state.client_id || 'N/A'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Connection Attempts</Label>
              <p className="text-sm text-gray-600 mt-1">{mqtt.state.connectionAttempts}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Messages Received</Label>
              <p className="text-sm text-gray-600 mt-1">{mqtt.state.totalMessagesReceived}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={mqtt.reconnect} variant="outline" size="sm">
              🔄 Reconnect
            </Button>
            <Button onClick={mqtt.disconnect} variant="outline" size="sm">
              🔌 Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Online Collars */}
      <Card>
        <CardHeader>
          <CardTitle>📡 Online Collars</CardTitle>
          <CardDescription>
            Collars currently connected to the MQTT broker
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mqtt.getOnlineCollars().length === 0 ? (
            <p className="text-gray-500 italic">No collars online</p>
          ) : (
            <div className="grid gap-4">
              {mqtt.getOnlineCollars().map(collarId => {
                const collar = mqtt.getCollarState(collarId);
                const telemetry = mqtt.getCollarTelemetry(collarId);
                
                return (
                  <div key={collarId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Collar {collarId}</h3>
                      <Badge variant="outline">{collar?.status}</Badge>
                    </div>
                    
                    {telemetry && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-xs">Battery</Label>
                          <p className="font-medium">{telemetry.battery_level}%</p>
                        </div>
                        <div>
                          <Label className="text-xs">State</Label>
                          <p className="font-medium">{telemetry.system_state}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Uptime</Label>
                          <p className="font-medium">{Math.floor(telemetry.uptime / 1000)}s</p>
                        </div>
                        <div>
                          <Label className="text-xs">Beacons</Label>
                          <p className="font-medium">{telemetry.beacons?.length || 0}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Last seen: {collar?.lastSeen ? new Date(collar.lastSeen).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Command Testing */}
      <Card>
        <CardHeader>
          <CardTitle>🎮 Command Testing</CardTitle>
          <CardDescription>
            Send test commands to collars via MQTT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="collar-id">Target Collar ID</Label>
            <Input
              id="collar-id"
              value={testCollarId}
              onChange={(e) => setTestCollarId(e.target.value)}
              placeholder="001"
              className="mt-1"
            />
          </div>

          <hr className="border-gray-200" />

          {/* Buzzer Test */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Buzzer Test
            </h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="buzzer-duration">Duration (ms)</Label>
                <Input
                  id="buzzer-duration"
                  type="number"
                  value={buzzerDuration}
                  onChange={(e) => setBuzzerDuration(e.target.value)}
                  placeholder="500"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleBuzzTest} className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Send Buzz
              </Button>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* LED Test */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              LED Test
            </h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="led-color">Color</Label>
                <select
                  id="led-color"
                  value={ledColor}
                  onChange={(e) => setLedColor(e.target.value)}
                  className="mt-1 w-full p-2 border rounded-md"
                >
                  <option value="white">White</option>
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              <div className="flex-1">
                <Label htmlFor="led-duration">Duration (ms)</Label>
                <Input
                  id="led-duration"
                  type="number"
                  value={ledDuration}
                  onChange={(e) => setLedDuration(e.target.value)}
                  placeholder="1000"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleLEDTest} className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Send LED
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw State Debug */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
            {JSON.stringify(mqtt.state, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
} 