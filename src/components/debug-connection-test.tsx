'use client'

import React from 'react'
import { useCollarConnection } from '@/context/CollarConnectionContext'
import { Button } from '@/components/ui/button'

export function DebugConnectionTest() {
  const { status, connect, disconnect, connectedIP, isLive } = useCollarConnection()

  const handleTestConnection = async () => {
    console.log('🧪 Debug: Manual connection test triggered')
    await connect()
  }

  const handleTestDisconnection = () => {
    console.log('🧪 Debug: Manual disconnection test triggered')
    disconnect()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border">
      <h3 className="font-semibold text-sm mb-2">Debug Connection Test</h3>
      
      <div className="space-y-2 text-xs">
        <div>Status: <span className="font-mono">{status}</span></div>
        <div>Connected IP: <span className="font-mono">{connectedIP || 'none'}</span></div>
        <div>Is Live: <span className="font-mono">{isLive ? 'true' : 'false'}</span></div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <Button 
          size="sm" 
          onClick={handleTestConnection}
          disabled={status === 'connecting'}
          className="text-xs"
        >
          {status === 'connecting' ? 'Connecting...' : 'Test Connect'}
        </Button>
        
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleTestDisconnection}
          disabled={status === 'disconnected'}
          className="text-xs"
        >
          Disconnect
        </Button>
      </div>
    </div>
  )
} 