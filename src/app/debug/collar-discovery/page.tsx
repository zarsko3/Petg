'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CollarDiscoveryResult {
  success: boolean;
  collar_ip?: string;
  websocket_url?: string;
  http_url?: string;
  discovered_ips?: string[];
  message?: string;
  timestamp?: string;
}

export default function CollarDiscoveryDebug() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [result, setResult] = useState<CollarDiscoveryResult | null>(null);
  const [testIP, setTestIP] = useState('');
  const [manualResult, setManualResult] = useState<CollarDiscoveryResult | null>(null);

  const startAutoDiscovery = async () => {
    setIsDiscovering(true);
    setResult(null);
    
    try {
      console.log('🔍 Starting collar auto-discovery...');
      
      const response = await fetch('/api/collar-discovery', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const discoveryResult: CollarDiscoveryResult = await response.json();
      setResult(discoveryResult);
      
      if (discoveryResult.success) {
        console.log(`🎯 Collar found: ${discoveryResult.websocket_url}`);
      } else {
        console.log('❌ No collar found');
      }
      
    } catch (error) {
      console.error('❌ Discovery error:', error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const testSpecificIP = async () => {
    if (!testIP) return;
    
    setManualResult(null);
    
    try {
      console.log(`🧪 Testing IP: ${testIP}`);
      
      const response = await fetch('/api/collar-discovery', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip: testIP })
      });
      
      const testResult: CollarDiscoveryResult = await response.json();
      setManualResult(testResult);
      
    } catch (error) {
      console.error('❌ Manual test error:', error);
      setManualResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Quick test common IPs
  const quickTestIPs = ['192.168.4.1', '192.168.1.100', '192.168.0.100'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔍 Collar Discovery Debug Tool</h1>
        <p className="text-gray-600">Test automatic collar discovery and manual IP testing</p>
      </div>

      {/* Auto Discovery Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🤖 Automatic Discovery</h2>
        
        <Button 
          onClick={startAutoDiscovery} 
          disabled={isDiscovering}
          className="mb-4"
        >
          {isDiscovering ? '🔄 Discovering...' : '🔍 Start Auto Discovery'}
        </Button>
        
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="font-semibold mb-2">
              {result.success ? '✅ Discovery Successful!' : '❌ Discovery Failed'}
            </h3>
            
            {result.success && (
              <div className="space-y-2">
                <p><strong>Collar IP:</strong> {result.collar_ip}</p>
                <p><strong>WebSocket URL:</strong> {result.websocket_url}</p>
                <p><strong>HTTP URL:</strong> {result.http_url}</p>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mt-2">{result.message}</p>
            
            {result.discovered_ips && result.discovered_ips.length > 0 && (
              <div className="mt-2">
                <strong>Discovered IPs:</strong> {result.discovered_ips.join(', ')}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Timestamp: {result.timestamp}
            </p>
          </div>
        )}
      </Card>

      {/* Manual IP Test Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🧪 Manual IP Test</h2>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={testIP}
            onChange={(e) => setTestIP(e.target.value)}
            placeholder="Enter IP address (e.g., 192.168.1.100)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={testSpecificIP} disabled={!testIP}>
            Test IP
          </Button>
        </div>
        
        {/* Quick Test Buttons */}
        <div className="flex gap-2 mb-4">
          <span className="text-sm text-gray-600 my-auto">Quick test:</span>
          {quickTestIPs.map((ip) => (
            <Button
              key={ip}
              variant="outline"
              size="sm"
              onClick={() => {
                setTestIP(ip);
                setManualResult(null);
              }}
            >
              {ip}
            </Button>
          ))}
        </div>
        
        {manualResult && (
          <div className={`p-4 rounded-lg ${manualResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="font-semibold mb-2">
              {manualResult.success ? '✅ Collar Found!' : '❌ No Collar'}
            </h3>
            
            {manualResult.success && (
              <div className="space-y-2">
                <p><strong>WebSocket URL:</strong> {manualResult.websocket_url}</p>
                <p><strong>HTTP URL:</strong> {manualResult.http_url}</p>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mt-2">{manualResult.message}</p>
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border border-blue-200">
        <h2 className="text-xl font-semibold mb-4">📋 Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Make sure your collar is connected to WiFi and showing an IP address on its display</li>
          <li>Use "Start Auto Discovery" to automatically scan common network IPs</li>
          <li>Or manually test specific IPs using the "Manual IP Test" section</li>
          <li>If collar is found, the WebSocket URL will be displayed (IP:8080)</li>
          <li>The app will automatically use this URL to connect</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm">
            <strong>Note:</strong> If the collar shows IP 192.168.4.1, it's in AP mode. 
            Connect to "PetCollar-Setup" WiFi network and configure it first at http://192.168.4.1
          </p>
        </div>
      </Card>
    </div>
  );
} 