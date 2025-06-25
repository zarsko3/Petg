'use client'

import { useState } from 'react'
import { Plus, Bluetooth, Zap, MapPin, Bell, Palette, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useTheme } from 'next-themes'
import { CollarPairDialog } from '@/components/mobile/collar-pair-dialog'
import { CollarSettingsCard } from '@/components/mobile/collar-settings-card'
import { useMobileCollars } from '@/hooks/useMobileCollars'

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  path?: string
  action?: () => void
}

export default function MobileSettingsPage() {
  const { theme, setTheme } = useTheme()
  const [showPairDialog, setShowPairDialog] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const { collars, isLoading, refresh } = useMobileCollars()

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled)
    
    if (enabled) {
      // Request notification permission
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setNotificationsEnabled(false)
          return
        }
        
        // TODO: Subscribe to push notifications
        console.log('📱 Subscribing to push notifications...')
      } catch (error) {
        console.error('❌ Notification permission error:', error)
        setNotificationsEnabled(false)
      }
    } else {
      // TODO: Unsubscribe from push notifications
      console.log('🔕 Unsubscribing from push notifications...')
    }
  }

  const sections: SettingsSection[] = [
    {
      id: 'zones',
      title: 'Safety Zones',
      description: 'Create and manage safe areas for your pet',
      icon: <MapPin className="h-5 w-5 text-orange-500" />,
      path: '/mobile/zones'
    },
    {
      id: 'beacons',
      title: 'Beacon Network',
      description: 'Scan and position tracking beacons',
      icon: <Zap className="h-5 w-5 text-blue-500" />,
      path: '/mobile/beacons'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-orange-100 dark:border-gray-700 pt-12 pb-4 px-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Manage your pet tracking system
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Collar Settings Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bluetooth className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Collar Settings
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPairDialog(true)}
              className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
            >
              <Plus className="h-4 w-4 mr-1" />
              Pair Collar
            </Button>
          </div>

          {isLoading ? (
            <Card className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </Card>
          ) : collars.length > 0 ? (
            <div className="space-y-3">
              {collars.map((collar) => (
                <CollarSettingsCard 
                  key={collar.id} 
                  collar={collar}
                  onUpdate={refresh}
                />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center border-dashed border-2 border-gray-200 dark:border-gray-700">
              <Bluetooth className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No Collars Paired
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Pair your first collar to start tracking your pet
              </p>
              <Button 
                onClick={() => setShowPairDialog(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Pair First Collar
              </Button>
            </Card>
          )}
        </div>

        {/* Main Settings Sections */}
        <div className="space-y-3">
          {sections.map((section) => (
            <Card 
              key={section.id} 
              className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-orange-400"
              onClick={() => section.path && window.location.href = section.path}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {section.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-2 h-4 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* App Settings */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              App Settings
            </h2>
          </div>

          <div className="space-y-3">
            {/* Theme Toggle */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Dark Theme
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Switch between light and dark appearance
                  </p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </Card>

            {/* Push Notifications */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Push Notifications
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get alerts when your pet leaves safe zones
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              </div>
            </Card>

            {/* App Info */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4 text-gray-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    App Version
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    PetTracker v1.0.0
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Collar Pair Dialog */}
      <CollarPairDialog
        open={showPairDialog}
        onOpenChange={setShowPairDialog}
        onSuccess={() => {
          setShowPairDialog(false)
          refresh()
        }}
      />
    </div>
  )
} 