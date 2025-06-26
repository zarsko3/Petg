'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronDown, ChevronRight, Settings2, Globe, CheckCircle } from 'lucide-react';
import { getCollarService } from '@/lib/collar-websocket-service';

export function MinimalManualConnection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [collarIP, setCollarIP] = useState('192.168.1.35');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [manualConnectionActive, setManualConnectionActive] = useState(false);

  const collarService = getCollarService();

  useEffect(() => {
    const checkStatus = () => {
      const status = collarService.getStatus();
      setIsConnected(status === 'connected');
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [collarService]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setLastResult('');

    try {
      // First test the IP to make sure it's a collar
      const testResponse = await fetch(`/api/collar-proxy?endpoint=/api/discover&ip=${collarIP}`);
      if (!testResponse.ok) {
        throw new Error('Could not connect to collar at this IP address');
      }

      // Connect via WebSocket service
      await collarService.connectToIP(collarIP);
      
      // Cache the IP in the collar-proxy for other components to use
      const cacheResponse = await fetch(`/api/collar-proxy?endpoint=/api/discover&ip=${collarIP}`);
      if (cacheResponse.ok) {
        console.log(`✅ Manual IP ${collarIP} cached for other components`);
      }
      
      setManualConnectionActive(true);
      setLastResult('✅ Connected successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      setLastResult(`❌ ${errorMsg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    collarService.disconnect();
    setManualConnectionActive(false);
    setLastResult('🔌 Disconnected');
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
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Manual IP Address
            </label>
            <div className="flex gap-2">
              <Input
                value={collarIP}
                onChange={(e) => setCollarIP(e.target.value)}
                placeholder="e.g., 192.168.1.35"
                className="text-sm h-8"
                disabled={isConnecting}
              />
              {isConnected ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDisconnect}
                  className="h-8 text-xs"
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting || !collarIP}
                  className="h-8 text-xs"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </div>

          {lastResult && (
            <div className="text-xs p-2 bg-white dark:bg-gray-800 rounded border font-mono">
              {lastResult}
            </div>
          )}

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