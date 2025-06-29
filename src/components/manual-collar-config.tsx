'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { getCollarService } from '@/lib/collar-websocket-service';  // DISABLED - using MQTT
import { usePetgStore } from '@/lib/store';
import { toast } from 'sonner';

interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  message: string;
  url?: string;
}

export function ManualCollarConfig() {
  const [collarIP, setCollarIP] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    message: 'WebSocket service disabled - using MQTT cloud connectivity'
  });
  
  // DISABLED: WebSocket service disabled - using MQTT cloud connectivity instead
  // const collarService = getCollarService();
  
  // Get MQTT connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const mqttStatus = usePetgStore((state) => state.connectionStatus);
  const demoMode = usePetgStore((state) => state.demoMode);

  useEffect(() => {
    // DISABLED: WebSocket service listeners disabled - using MQTT instead
    console.log('🚫 ManualCollarConfig: WebSocket service disabled - using MQTT cloud connectivity');
    
    // Update status based on MQTT connection state
    if (isConnected && !demoMode) {
      setConnectionStatus({
        status: 'connected',
        message: 'Connected via MQTT cloud service',
        url: 'wss://ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud:8884/mqtt'
      });
    } else if (mqttStatus === 'Connecting') {
      setConnectionStatus({
        status: 'connecting',
        message: 'Connecting via MQTT...'
      });
    } else if (mqttStatus === 'Failed') {
      setConnectionStatus({
        status: 'error',
        message: 'MQTT connection failed'
      });
    } else {
      setConnectionStatus({
        status: 'disconnected',
        message: 'Awaiting MQTT connection'
      });
    }
  }, [isConnected, mqttStatus, demoMode]);

  const handleConnect = async () => {
    // DISABLED: Manual WebSocket connections disabled - using MQTT cloud connectivity
    console.log('🚫 Manual WebSocket connection disabled - using MQTT cloud connectivity');
    toast.error('Manual connections disabled - using MQTT cloud connectivity via HiveMQ');
    
    /* ORIGINAL CODE DISABLED:
    if (!collarIP.trim()) {
      toast.error('Please enter a collar IP address');
      return;
    }

    setConnectionStatus({ status: 'connecting', message: 'Connecting...' });

    try {
      await collarService.connectToIP(collarIP.trim());
      
      setConnectionStatus({ 
        status: 'connected', 
        message: 'Connected successfully',
        url: `ws://${collarIP.trim()}:8080`
      });
      
      toast.success('Connected to collar successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionStatus({ status: 'error', message: errorMessage });
      toast.error(`Connection failed: ${errorMessage}`);
    }
    */
  };

  const handleDisconnect = () => {
    // DISABLED: Manual WebSocket disconnections disabled - using MQTT cloud connectivity
    console.log('🚫 Manual WebSocket disconnect disabled - MQTT handles connections');
    toast.error('Manual disconnections disabled - MQTT cloud connectivity is always active');
    
    /* ORIGINAL CODE DISABLED:
    collarService.disconnect();
    setConnectionStatus({ status: 'disconnected', message: 'Disconnected' });
    toast.info('Disconnected from collar');
    */
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus.status) {
      case 'connected': return <Badge className="bg-green-100 text-green-800">Connected via MQTT</Badge>;
      case 'connecting': return <Badge className="bg-yellow-100 text-yellow-800">Connecting</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Awaiting MQTT</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Manual Collar Configuration</h2>
          <p className="text-sm text-gray-600">
            🌐 Manual WebSocket connections have been disabled. The collar now uses MQTT cloud connectivity via HiveMQ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          {getStatusBadge()}
          <span className="text-sm text-gray-600">{connectionStatus.message}</span>
        </div>

        {connectionStatus.url && (
          <div className="text-sm text-gray-500">
            <strong>Connection URL:</strong> {connectionStatus.url}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Collar IP Address (Disabled)
            </label>
            <Input
              value={collarIP}
              onChange={(e) => setCollarIP(e.target.value)}
              placeholder="192.168.1.100"
              disabled={true}  // Disabled since we're using MQTT
              className="opacity-50"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleConnect}
              disabled={true}  // Disabled since we're using MQTT
              className="opacity-50"
            >
              Connect (Disabled - Using MQTT)
            </Button>
            <Button 
              variant="outline"
              onClick={handleDisconnect}
              disabled={true}  // Disabled since we're using MQTT
              className="opacity-50"
            >
              Disconnect (Disabled - Using MQTT)
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">📡 MQTT Cloud Connectivity</h3>
          <p className="text-sm text-blue-800">
            The collar now connects automatically via MQTT cloud service. No manual configuration needed.<br/>
            <strong>Status:</strong> {
              isConnected && !demoMode ? '✅ Live data active' :
              demoMode ? '📱 Demo mode (MQTT pending)' :
              '⏳ Awaiting collar connection'
            }
          </p>
        </div>
      </div>
    </Card>
  );
} 