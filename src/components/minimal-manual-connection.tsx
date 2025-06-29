'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Alert, AlertDescription } from '@/components/ui/alert';  // Not available
import { ChevronDown, ChevronRight, Settings2, Globe, CheckCircle } from 'lucide-react';
import { usePetgStore } from '@/lib/store';

export function MinimalManualConnection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manualConnectionActive, setManualConnectionActive] = useState(false);

  // Get MQTT connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);
  const demoMode = usePetgStore((state) => state.demoMode);

  useEffect(() => {
    // Update status based on MQTT connection state
    if (isConnected && !demoMode) {
      setStatus('connected');
      setError(null);
    } else if (connectionStatus === 'Connecting') {
      setStatus('connecting');
    } else if (connectionStatus === 'Failed') {
      setStatus('error');
      setError('MQTT connection failed');
    } else {
      setStatus('idle');
    }
  }, [isConnected, connectionStatus, demoMode]);

  const handleConnect = async () => {
    // Disable manual WebSocket connections - using MQTT cloud connectivity
    console.log('🚫 Manual WebSocket connection disabled - using MQTT cloud connectivity');
    setError('Manual connections disabled - using MQTT cloud connectivity via HiveMQ');
  };

  const handleDisconnect = () => {
    // Disable manual WebSocket disconnections - using MQTT cloud connectivity
    console.log('🚫 Manual WebSocket disconnect disabled - MQTT handles connections');
    setError('Manual disconnections disabled - MQTT cloud connectivity is always active');
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 mt-4 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Settings2 className="h-4 w-4" />
        Advanced Connection Settings
        {isConnected && (
          <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
        )}
        {manualConnectionActive && (
          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
            Manual
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold mb-4">Manual Collar Connection</h3>
          
          {/* Show MQTT connectivity status */}
          <div className="mb-4">
            🌐 <strong>MQTT Cloud Connectivity Active</strong><br/>
            Manual WebSocket connections have been disabled. The collar now connects via MQTT cloud service (HiveMQ).<br/>
            {isConnected && !demoMode ? '✅ Live collar data is active' : '📡 Awaiting collar connection via MQTT...'}
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="collar-ip">Collar IP Address</Label>
              <Input
                id="collar-ip"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.100"
                disabled={true}  // Disabled since we're using MQTT
              />
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleConnect}
                disabled={true}  // Disabled since we're using MQTT
                variant="outline"
              >
                Connect (Disabled - Using MQTT)
              </Button>
              <Button 
                onClick={handleDisconnect}
                disabled={true}  // Disabled since we're using MQTT
                variant="outline"
              >
                Disconnect (Disabled - Using MQTT)
              </Button>
            </div>

            {error && (
              <div className="text-red-600">
                {error}
              </div>
            )}

            <div className="text-sm text-gray-600">
              <strong>Connection Status:</strong> {
                isConnected && !demoMode ? 'Connected via MQTT' :
                demoMode ? 'Demo Mode (MQTT pending)' :
                connectionStatus === 'Connecting' ? 'Connecting via MQTT...' :
                'Awaiting MQTT connection'
              }
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use this to connect directly to a specific collar IP address, bypassing automatic discovery.
            {manualConnectionActive && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400">
                ✨ Manual connection active - other features will use this IP automatically.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
} 