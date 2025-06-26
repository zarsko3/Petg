'use client'

import { useState, useEffect } from 'react'
import { useEnhancedCollarConnection, CollarConnectionResult, CollarInfo } from '@/lib/enhanced-collar-connection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function EnhancedConnectionDebugPage() {
  const [connectionResult, setConnectionResult] = useState<CollarConnectionResult | null>(null)
  const [cachedInfo, setCachedInfo] = useState<CollarInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionHistory, setConnectionHistory] = useState<CollarConnectionResult[]>([])
  
  const enhancedConnection = useEnhancedCollarConnection()

  // Update cached info periodically
  useEffect(() => {
    const updateCachedInfo = () => {
      const info = enhancedConnection.getCachedInfo()
      setCachedInfo(info)
    }

    updateCachedInfo()
    const interval = setInterval(updateCachedInfo, 1000)
    return () => clearInterval(interval)
  }, [enhancedConnection])

  // Listen for connection events
  useEffect(() => {
    const handleConnectionResult = (result: CollarConnectionResult) => {
      setConnectionResult(result)
      setConnectionHistory(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 results
      setIsConnecting(false)
    }

    enhancedConnection.addListener(handleConnectionResult)
    return () => enhancedConnection.removeListener(handleConnectionResult)
  }, [enhancedConnection])

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionResult(null)
    
    try {
      const result = await enhancedConnection.connect()
      // Result will be handled by listener
    } catch (error) {
      setIsConnecting(false)
      console.error('Connection failed:', error)
    }
  }

  const handleForceReconnect = async () => {
    setIsConnecting(true)
    setConnectionResult(null)
    
    try {
      const result = await enhancedConnection.forceReconnect()
      // Result will be handled by listener
    } catch (error) {
      setIsConnecting(false)
      console.error('Force reconnect failed:', error)
    }
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'mdns': return 'bg-green-500'
      case 'udp-cache': return 'bg-blue-500'
      case 'cloud': return 'bg-purple-500'
      case 'manual': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getMethodDescription = (method: string) => {
    switch (method) {
      case 'mdns': return 'Zero-config mDNS discovery (petg-collar.local)'
      case 'udp-cache': return 'Cached IP from UDP broadcast'
      case 'cloud': return 'Cloud relay (future)'
      case 'manual': return 'Manual configuration required'
      default: return 'Unknown method'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Collar Connection Debug</h1>
          <p className="text-muted-foreground mt-2">
            Test the multi-stage collar discovery and connection system
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? 'Connecting...' : '🔍 Connect'}
          </Button>
          <Button 
            onClick={handleForceReconnect} 
            disabled={isConnecting}
            variant="outline"
          >
            🔄 Force Reconnect
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📡 Connection Status
              {connectionResult?.success && (
                <Badge className="bg-green-500">Connected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Latest connection attempt result
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span>Attempting connection...</span>
              </div>
            ) : connectionResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getMethodBadgeColor(connectionResult.method)}>
                    {connectionResult.method.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getMethodDescription(connectionResult.method)}
                  </span>
                </div>
                
                {connectionResult.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <span className="text-xl">✅</span>
                      <span className="font-medium">Connection Successful</span>
                    </div>
                    
                    {connectionResult.url && (
                      <div className="text-sm">
                        <span className="font-medium">WebSocket URL:</span>
                        <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs break-all">
                          {connectionResult.url}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {connectionResult.latency && (
                        <div>
                          <span className="font-medium">Latency:</span>
                          <div>{connectionResult.latency}ms</div>
                        </div>
                      )}
                      {connectionResult.ip && (
                        <div>
                          <span className="font-medium">IP Address:</span>
                          <div className="font-mono">{connectionResult.ip}</div>
                        </div>
                      )}
                      {connectionResult.hostname && (
                        <div className="col-span-2">
                          <span className="font-medium">Hostname:</span>
                          <div className="font-mono">{connectionResult.hostname}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <span className="text-xl">❌</span>
                      <span className="font-medium">Connection Failed</span>
                    </div>
                    {connectionResult.error && (
                      <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                        {connectionResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No connection attempts yet. Click "Connect" to start.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cached UDP Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📺 UDP Cache Status
              {cachedInfo && (
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Information from collar UDP broadcasts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cachedInfo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Device:</span>
                    <div>{cachedInfo.device_name}</div>
                  </div>
                  <div>
                    <span className="font-medium">IP Address:</span>
                    <div className="font-mono">{cachedInfo.ip_address}</div>
                  </div>
                  <div>
                    <span className="font-medium">mDNS Hostname:</span>
                    <div className="font-mono text-xs">{cachedInfo.mdns_hostname || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="font-medium">WiFi Network:</span>
                    <div>{cachedInfo.wifi_ssid}</div>
                  </div>
                  <div>
                    <span className="font-medium">Signal:</span>
                    <div>{cachedInfo.signal_strength} dBm</div>
                  </div>
                  <div>
                    <span className="font-medium">Battery:</span>
                    <div>{cachedInfo.battery_percent}%</div>
                  </div>
                  <div>
                    <span className="font-medium">Uptime:</span>
                    <div>{Math.floor(cachedInfo.uptime / 60)}m {cachedInfo.uptime % 60}s</div>
                  </div>
                  <div>
                    <span className="font-medium">Version:</span>
                    <div>{cachedInfo.firmware_version}</div>
                  </div>
                </div>
                
                {cachedInfo.mdns_websocket_url && (
                  <div className="mt-4">
                    <span className="font-medium text-sm">mDNS WebSocket URL:</span>
                    <div className="font-mono bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs break-all text-green-700 dark:text-green-300">
                      {cachedInfo.mdns_websocket_url}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No UDP broadcasts received yet. Make sure the collar is powered on and connected to WiFi.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection History */}
      {connectionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Connection History</CardTitle>
            <CardDescription>
              Recent connection attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connectionHistory.map((result, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={getMethodBadgeColor(result.method)}
                          variant="outline"
                        >
                          {result.method}
                        </Badge>
                        {result.latency && (
                          <span className="text-sm text-muted-foreground">
                            {result.latency}ms
                          </span>
                        )}
                      </div>
                      {result.error && (
                        <div className="text-sm text-red-600 mt-1">
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  {result.url && (
                    <div className="text-sm font-mono text-muted-foreground max-w-xs truncate">
                      {result.url}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Info */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 Connection Strategy</CardTitle>
          <CardDescription>
            How the enhanced connection system works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-green-500 mt-1">1</Badge>
              <div>
                <div className="font-medium">mDNS Discovery</div>
                <div className="text-sm text-muted-foreground">
                  Try to connect using <code>ws://petg-collar.local:8080</code> for zero-config discovery
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-500 mt-1">2</Badge>
              <div>
                <div className="font-medium">UDP Cache</div>
                <div className="text-sm text-muted-foreground">
                  Use cached IP address from collar UDP broadcasts (updated every 10s)
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-500 mt-1">3</Badge>
              <div>
                <div className="font-medium">Cloud Relay</div>
                <div className="text-sm text-muted-foreground">
                  Fallback to cloud-based relay for remote access (future implementation)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 