'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Wifi, Zap, Settings, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BeaconConfigurationPanel } from '@/components/beacon-configuration-panel'
import { useCollarConnection } from '@/context/CollarConnectionContext'
import { usePetgStore } from '@/lib/store'

export default function MobileBeaconsPage() {
  const [realBeacons, setRealBeacons] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Get connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected)
  const connectionStatus = usePetgStore((state) => state.connectionStatus)
  const rawCollarData = usePetgStore((state) => state.lastCollarData)

  // Extract beacon data from collar
  useEffect(() => {
    if (isConnected && rawCollarData) {
      if (rawCollarData.beacons && Array.isArray(rawCollarData.beacons)) {
        setRealBeacons(rawCollarData.beacons)
        setLastUpdate(new Date())
        console.log('📱 Mobile Beacons: Updated from collar data', rawCollarData.beacons.length, 'beacons')
      } else {
        setRealBeacons([])
        setLastUpdate(new Date())
      }
    } else if (!isConnected) {
      setRealBeacons([])
      setLastUpdate(null)
      console.log('📱 Mobile Beacons: Cleared data due to disconnection')
    }
  }, [isConnected, rawCollarData])

  const goBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Mobile Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-blue-100 dark:border-gray-700 pt-12 pb-4 px-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wifi className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Beacon Network
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage your tracking beacons
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        {isConnected ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Live Connection Active
              </p>
              <p className="text-xs text-green-600 dark:text-green-300">
                {realBeacons.length} beacons detected • Real-time updates enabled
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Offline Mode
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Connect collar for live beacon detection and real-time updates
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-Optimized Beacon Configuration */}
      <div className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <BeaconConfigurationPanel 
            realBeacons={realBeacons}
            isConnected={isConnected}
            onConfigurationUpdate={(configs) => {
              console.log('📱 Mobile Beacons: Configuration updated', configs.length, 'total configs')
            }}
          />
        </div>
      </div>

      {/* Mobile Quick Actions */}
      <div className="px-4 pb-6">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Quick Setup Tips
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Use templates for consistent configurations</li>
                <li>• Enable filters to find specific beacons quickly</li>
                <li>• Batch operations save time with multiple beacons</li>
                <li>• Export configurations for backup and sharing</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
} 