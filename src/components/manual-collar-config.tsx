'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { StatusChip } from './ui/status-chip';
import { AlertCircle, CheckCircle, Settings, Wifi, Globe } from 'lucide-react';
import { getCollarService } from '@/lib/collar-websocket-service';

interface ManualCollarConfigProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function ManualCollarConfig({ onConnectionChange }: ManualCollarConfigProps) {
  const [collarIP, setCollarIP] = useState('10.0.0.6');
  const [customWebSocketUrl, setCustomWebSocketUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [lastTestResult, setLastTestResult] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  const collarService = getCollarService();

  // Update connection status
  useEffect(() => {
    const checkStatus = () => {
      const status = collarService.getStatus();
      const connected = status === 'connected';
      setIsConnected(connected);
      
      if (connected) {
        setConnectionError('');
      } else {
        const error = collarService.getError();
        if (error) {
          setConnectionError(error);
        }
      }
      
      onConnectionChange?.(connected);
    };

    // Check initial status
    checkStatus();

    // Check status periodically
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [collarService, onConnectionChange]);

  const testConnection = async (ip: string) => {
    try {
      const response = await fetch(`http://${ip}/api/discover`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        data,
        websocketUrl: data.websocket_url || `ws://${ip}:8080`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    setConnectionError('');
    setLastTestResult('');

    try {
      const result = await testConnection(collarIP);
      
      if (result.success) {
        setLastTestResult(`✅ Success: Found ${result.data.device} at ${collarIP}`);
        
        // Auto-fill WebSocket URL if provided by collar
        if (result.websocketUrl && !useCustomUrl) {
          setCustomWebSocketUrl(result.websocketUrl);
        }
      } else {
        setLastTestResult(`❌ Failed: ${result.error}`);
        setConnectionError(`Cannot reach collar at ${collarIP}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastTestResult(`❌ Error: ${errorMsg}`);
      setConnectionError(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError('');

    try {
      let wsUrl: string;
      
      if (useCustomUrl && customWebSocketUrl) {
        wsUrl = customWebSocketUrl;
      } else {
        wsUrl = `ws://${collarIP}:8080`;
      }

      console.log(`🎯 Manual connection to: ${wsUrl}`);
      
      // Use the collar service's connectToIP method
      const ip = wsUrl.replace('ws://', '').replace(':8080', '');
      await collarService.connectToIP(ip);
      
      setLastTestResult(`✅ Connected to ${wsUrl}`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMsg);
      setLastTestResult(`❌ Connection failed: ${errorMsg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    collarService.disconnect();
    setLastTestResult('🔌 Disconnected from collar');
  };

  const constructedWsUrl = `ws://${collarIP}:8080`;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Manual Collar Configuration
        </CardTitle>
        <CardDescription>
          Configure the collar connection manually to stop automatic scanning
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <StatusChip 
            label={isConnected ? "Connected" : "Disconnected"}
            variant={isConnected ? "success" : "default"}
            icon={isConnected ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          />
          
          {isConnected && (
            <span className="text-sm text-muted-foreground">
              {collarService.getWebSocketUrl()}
            </span>
          )}
        </div>

        {/* Collar IP Configuration */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Collar IP Address
          </label>
          <div className="flex gap-2">
            <Input
              value={collarIP}
              onChange={(e) => setCollarIP(e.target.value)}
              placeholder="e.g., 10.0.0.6 or 192.168.1.100"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isConnecting || !collarIP}
            >
              {isConnecting ? 'Testing...' : 'Test'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected WebSocket URL: <code className="bg-muted px-1 rounded">{constructedWsUrl}</code>
          </p>
        </div>

        {/* Custom WebSocket URL (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useCustomUrl"
              checked={useCustomUrl}
              onChange={(e) => setUseCustomUrl(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="useCustomUrl" className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Use Custom WebSocket URL
            </label>
          </div>
          
          {useCustomUrl && (
            <Input
              value={customWebSocketUrl}
              onChange={(e) => setCustomWebSocketUrl(e.target.value)}
              placeholder="ws://10.0.0.6:8080"
              className="font-mono text-sm"
            />
          )}
        </div>

        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || !collarIP}
              className="flex-1"
            >
              {isConnecting ? 'Connecting...' : 'Connect to Collar'}
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={handleDisconnect}
              className="flex-1"
            >
              Disconnect
            </Button>
          )}
        </div>

        {/* Status Messages */}
        {lastTestResult && (
          <div className={`p-3 rounded-lg text-sm ${
            lastTestResult.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {lastTestResult}
          </div>
        )}

        {connectionError && (
          <div className="p-3 rounded-lg text-sm bg-yellow-50 text-yellow-700 border border-yellow-200">
            <strong>Connection Issue:</strong> {connectionError}
          </div>
        )}

        {/* Quick IP Examples */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Common IP Ranges:</p>
          <div className="flex flex-wrap gap-2">
            {['10.0.0.6', '192.168.1.100', '192.168.0.100', '172.16.0.100'].map((ip) => (
              <Button
                key={ip}
                variant="ghost"
                size="sm"
                onClick={() => setCollarIP(ip)}
                className="text-xs"
              >
                {ip}
              </Button>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>Note:</strong> This manual configuration disables automatic scanning. 
          The system will only connect to the IP address you specify here.
        </div>
      </CardContent>
    </Card>
  );
}

export default ManualCollarConfig; 