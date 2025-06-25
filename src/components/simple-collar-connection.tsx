'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import { usePetgStore } from '@/lib/store';
// Using direct type definition to avoid importing WebSocket service
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function SimpleCollarConnection() {
  const [lastData, setLastData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);
  const connectionMessage = usePetgStore((state) => state.connectionMessage);
  const connectionUrl = usePetgStore((state) => state.collarConnectionUrl);
  
  // WebSocket service disabled - using HTTP polling only
  const [serviceStatus, setServiceStatus] = useState<ConnectionStatus>('disconnected');
  const [serviceError, setServiceError] = useState<string | null>('WebSocket service disabled');
  
  // WebSocket service disabled - no polling needed
  useEffect(() => {
    console.log('🔗 SimpleCollarConnection: Component mounted (WebSocket service disabled)');
    console.log('ℹ️ SimpleCollarConnection: Using HTTP polling for collar data');
    
    return () => {
      console.log('🔗 SimpleCollarConnection: Component unmounting');
    };
  }, []);
  
  // Handle manual connect (WebSocket service disabled)
  const handleConnect = async () => {
    setIsConnecting(true);
    console.log('ℹ️ SimpleCollarConnection: WebSocket service is disabled');
    console.log('ℹ️ SimpleCollarConnection: Connection is handled by HTTP polling system');
    setIsConnecting(false);
  };
  
  // Handle manual disconnect (WebSocket service disabled)
  const handleDisconnect = () => {
    console.log('ℹ️ SimpleCollarConnection: WebSocket service is disabled');
    console.log('ℹ️ SimpleCollarConnection: HTTP polling will continue automatically');
  };

  // Get display status based on service status and store state
  const getDisplayStatus = () => {
    if (serviceStatus === 'connecting') return 'connecting';
    if (serviceStatus === 'connected' && isConnected) return 'connected';
    if (serviceStatus === 'error' || serviceError) return 'error';
    return 'disconnected';
  };
  
  const displayStatus = getDisplayStatus();
  const displayError = serviceError || error;

  // Get status color
  const getStatusColor = () => {
    switch (displayStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (displayStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-600" />;
      case 'connecting':
        return <Activity className="w-5 h-5 text-yellow-600 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (displayStatus) {
      case 'connected':
        return `Connected to ${connectionUrl || 'collar'}`;
      case 'connecting':
        return 'Connecting to collar...';
      case 'error':
        return displayError || 'Connection failed';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Collar Connection</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect to your collar for real-time monitoring
          </p>
        </div>
        
        {/* Connection Status Icon */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Wifi className="h-5 w-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
          {connectionStatus === 'Connecting' && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Activity className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">Connecting...</span>
            </div>
          )}
          {connectionStatus === 'Failed' && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Failed</span>
            </div>
          )}
          {!isConnected && connectionStatus === 'Ready' && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <WifiOff className="h-5 w-5" />
              <span className="text-sm font-medium">Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
            <div className={`font-medium ${
              isConnected ? 'text-green-600 dark:text-green-400' : 
              connectionStatus === 'Connecting' ? 'text-blue-600 dark:text-blue-400' :
              connectionStatus === 'Failed' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {connectionMessage}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">WebSocket URL</div>
            <div className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">
              {connectionUrl || 'Not connected'}
            </div>
          </div>
        </div>

        {/* Service Status Debug Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">Service Status</div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-blue-600 dark:text-blue-400">Service:</span>
              <span className="ml-1 font-mono">{serviceStatus}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">Store Connected:</span>
              <span className="ml-1 font-mono">{isConnected ? 'YES' : 'NO'}</span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400">Data Available:</span>
              <span className="ml-1 font-mono">{lastData ? 'YES' : 'NO'}</span>
            </div>
          </div>
        </div>

        {/* Manual Controls */}
        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={serviceStatus === 'connecting'}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {serviceStatus === 'connecting' ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                Connect
              </>
            )}
          </button>
          
          <button
            onClick={handleDisconnect}
            disabled={!isConnected}
            className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <WifiOff className="h-4 w-4" />
            Disconnect
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="text-red-800 dark:text-red-200 text-sm font-medium mb-1">Connection Error</div>
            <div className="text-red-700 dark:text-red-300 text-xs">{error}</div>
          </div>
        )}

        {/* Last Data Preview */}
        {lastData && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="text-green-800 dark:text-green-200 text-sm font-medium mb-2">Latest Data</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-green-700 dark:text-green-300">Battery:</span>
                <span className="ml-1 font-mono">{lastData.battery_level ?? 'N/A'}%</span>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">WiFi:</span>
                <span className="ml-1 font-mono">{lastData.wifi_connected ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">Uptime:</span>
                <span className="ml-1 font-mono">{lastData.uptime ?? 'N/A'}s</span>
              </div>
              <div>
                <span className="text-green-700 dark:text-green-300">Device ID:</span>
                <span className="ml-1 font-mono">{lastData.device_id ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 