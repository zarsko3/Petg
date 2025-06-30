'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  Battery, 
  Wifi, 
  MapPin, 
  Bell, 
  Activity, 
  Clock, 
  Thermometer,
  Heart,
  AlertTriangle,
  RefreshCw,
  Zap,
  Shield,
  BarChart3,
  Award,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Target
} from 'lucide-react'
import { useCollarStats } from '@/hooks/useSmartCollarData'
import { 
  formatTimeAgo, 
  getBatteryColor, 
  getSignalStrengthText,
  getSignalColor,
  formatTemperature,
  getActivityLevelText
} from '@/lib/utils'
import { usePetgStore } from '@/lib/store'
import { getMQTTClient } from '@/lib/mqtt-client'
import { toast } from 'sonner'

export default function MobileDashboard() {
  const [mounted, setMounted] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [lastCollarData, setLastCollarData] = useState<any>(null)
  const { stats: collarStats, isLive, status } = useCollarStats()
  const isConnected = usePetgStore((state) => state.isCollarConnected)
  const demoMode = usePetgStore((state) => state.demoMode)
  const isLoading = status === 'connecting'
  const refetch = () => window.location.reload()
  
  // Memoize collarData to prevent infinite re-renders
  const collarData = useMemo(() => ({
    battery_level: collarStats.battery,
    signal_strength: collarStats.rssi,
    activity_level: 85, // Mock activity level
    temperature: collarStats.temperature,
    location: 'Living Room',
    last_seen: new Date().toISOString()
  }), [collarStats.battery, collarStats.rssi, collarStats.temperature])
  
  // Memoize lastUpdate to prevent unnecessary re-renders
  const lastUpdate = useMemo(() => new Date(), [isConnected, collarStats.battery, collarStats.rssi, collarStats.temperature])

  
  // Use try-catch for Clerk to handle context issues gracefully
  let user = null
  try {
    user = useUser().user
  } catch (error) {
    console.log('Clerk context not available, using guest mode')
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const petName = user?.firstName || 'Buddy'
  const userName = user?.firstName || 'there'
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Test alert function using MQTT
  const handleTestAlert = async () => {
    setIsTesting(true)
    try {
      const mqttClient = getMQTTClient()
      const payload = { cmd: 'test-alert', alertMode: 'both', durationMs: 1200, intensity: 150 }
      const success = await mqttClient.publish('pet-collar/001/command', JSON.stringify(payload))
      
      if (success) {
        toast.success('Test Alert Sent', { description: 'Collar should buzz and vibrate for 1.2 seconds' })
      } else {
        throw new Error('Failed to publish MQTT message')
      }
    } catch (error) {
      toast.error('Failed to Send Test Alert', { description: 'Please check collar connection and try again' })
    } finally {
      setTimeout(() => setIsTesting(false), 2000)
    }
  }

  // Generate real notifications based on collar data changes
  useEffect(() => {
    if (!mounted || !collarData) return

    const newNotifications: any[] = []
    const now = new Date()

    // Connection status notifications
    if (isConnected && !demoMode) {
      if (!lastCollarData || !lastCollarData.wasConnected) {
        newNotifications.push({
          type: 'success',
          icon: CheckCircle2,
          message: `${petName}'s collar connected successfully`,
          time: 'Just now',
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        })
      }
    } else if (lastCollarData?.wasConnected) {
      newNotifications.push({
        type: 'warning',
        icon: AlertTriangle,
        message: `${petName}'s collar disconnected`,
        time: 'Just now',
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      })
    }

    // Battery alerts
    if (collarData.battery_level && collarData.battery_level < 20) {
      newNotifications.push({
        type: 'warning',
        icon: Battery,
        message: `Low battery: ${collarData.battery_level}% remaining`,
        time: 'Just now',
        color: 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      })
    }

    // Signal strength alerts
    if (collarData.signal_strength && collarData.signal_strength < -80) {
      newNotifications.push({
        type: 'warning',
        icon: Wifi,
        message: `Weak signal detected: ${getSignalStrengthText(collarData.signal_strength)}`,
        time: 'Just now',
        color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      })
    }

    // Temperature alerts
    if (collarData.temperature && (collarData.temperature > 30 || collarData.temperature < 5)) {
      const isHot = collarData.temperature > 30
      newNotifications.push({
        type: 'warning',
        icon: Thermometer,
        message: `${isHot ? 'High' : 'Low'} temperature detected: ${formatTemperature(collarData.temperature)}`,
        time: 'Just now',
        color: isHot 
          ? 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      })
    }

    // Location/activity updates
    if (isConnected && !demoMode) {
      newNotifications.push({
        type: 'info',
        icon: MapPin,
        message: `${petName} is active in ${collarData.location || 'the monitored area'}`,
        time: 'Just now',
        color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
      })
    }

    // Update notifications (keep last 5)
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 5))
    }

    // Update last collar data for comparison
    setLastCollarData({ ...collarData, wasConnected: isConnected && !demoMode })
  }, [collarData, isConnected, demoMode, mounted, petName])

  const stats = [
    {
      icon: Battery,
      label: 'Battery Life',
      value: collarData?.battery_level ? `${collarData.battery_level}%` : '85%',
      color: collarData?.battery_level ? getBatteryColor(collarData.battery_level) : 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      description: 'Power remaining'
    },
    {
      icon: Wifi,
      label: 'Connection',
      value: collarData?.signal_strength ? getSignalStrengthText(collarData.signal_strength) : 'Strong',
      color: collarData?.signal_strength ? getSignalColor(collarData.signal_strength) : 'text-teal-500',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      description: 'Network signal'
    },
    {
      icon: Activity,
      label: 'Activity',
      value: collarData?.activity_level !== undefined ? getActivityLevelText(collarData.activity_level) : 'Playful',
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      description: 'Energy level'
    },
    {
      icon: Thermometer,
      label: 'Comfort',
      value: collarData?.temperature ? formatTemperature(collarData.temperature) : '22°C',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Environment temp'
    }
  ]

  // Use real notifications or fallback to demo data
  const alerts = notifications.length > 0 ? notifications : [
    {
      type: 'info',
      icon: MapPin,
      message: `${petName} location monitoring ready`,
      time: 'Demo mode',
      color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  ]



  if (!mounted) {
    return <div className="mobile-screen flex items-center justify-center bg-pet-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-200 border-t-teal-500" />
        <p className="text-gray-600 dark:text-gray-400 font-rounded">Loading {petName}'s status...</p>
      </div>
    </div>
  }

  return (
    <div className="mobile-screen mobile-scroll bg-pet-surface safe-area-top">


      {/* Header */}
      <div className="bg-pet-surface-elevated px-6 py-6 border-b border-gray-200 dark:border-gray-700 shadow-pet-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-rounded">
                Hi {userName}!
              </h1>
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Let's check on {petName} • {currentTime}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={`p-4 rounded-2xl transition-all duration-200 mobile-button shadow-pet ${
              isConnected && !demoMode
                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:shadow-teal-glow' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <RefreshCw className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-200 ${
          isConnected && !demoMode
            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="relative">
            <div className={`h-4 w-4 rounded-full ${
              isConnected && !demoMode ? 'bg-teal-500' : 'bg-amber-500'
            }`}>
              <div className="absolute inset-0 h-4 w-4 rounded-full pulse-ring ${
                isConnected && !demoMode ? 'bg-teal-500' : 'bg-amber-500'
              }" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold font-rounded">
              {isConnected && !demoMode ? `${petName}'s collar is connected` : `Demo mode - ${petName}'s collar offline`}
            </p>
            <p className="text-sm opacity-75">
              {isConnected && !demoMode ? 'Real-time monitoring active' : 'Showing sample data for demonstration'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* Quick Stats Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-rounded">
              {petName}'s Vitals
            </h2>
            <BarChart3 className="h-5 w-5 text-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div 
                  key={stat.label}
                  className={`${stat.bg} rounded-2xl p-5 border border-gray-200 dark:border-gray-700 mobile-card hover:scale-105 transition-all duration-200`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`h-7 w-7 ${stat.color}`} />
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-emerald-400 rounded-full pulse-dot" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
                        LIVE
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-rounded">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="mobile-card bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-amber-glow">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                  <span className="text-xs font-bold text-white">3</span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-rounded mb-1">
                  Recent Notifications
                </h2>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    3 new alerts today
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {/* Alert 1 - Restricted Zone */}
            <div className="group relative overflow-hidden bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl p-4 border border-red-200 dark:border-red-700 hover:scale-102 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">Alert</span>
                    <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-full">10:22</span>
                  </div>
                  <p className="text-sm text-red-900 dark:text-red-100 font-medium leading-relaxed">
                    Activity detected near the restricted zone in the living room.
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
            </div>

            {/* Alert 2 - Sleep Activity */}
            <div className="group relative overflow-hidden bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-4 border border-blue-200 dark:border-blue-700 hover:scale-102 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Alert</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">8:45</span>
                  </div>
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium leading-relaxed">
                    {petName} slept for 1 hour 30 minutes and is now roaming around the house.
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
            </div>

            {/* Alert 3 - Barking */}
            <div className="group relative overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-2xl p-4 border border-orange-200 dark:border-orange-700 hover:scale-102 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Alert</span>
                    <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded-full">7:15</span>
                  </div>
                  <p className="text-sm text-orange-900 dark:text-orange-100 font-medium leading-relaxed">
                    {petName} has started barking inside the house.
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
            </div>
          </div>

          {/* Footer with action button */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2">
              <Bell className="h-5 w-5" />
              View All Notifications
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-rounded">
                Recent Updates
              </h2>
              <Smartphone className="h-5 w-5 text-teal-500" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
              Last 24 hours
            </span>
          </div>
          
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const Icon = alert.icon
              return (
                <div 
                  key={index}
                  className={`p-4 rounded-2xl border ${alert.color} mobile-card hover:scale-102 transition-all duration-200`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium font-rounded text-sm leading-relaxed">
                        {alert.message}
                      </p>
                      <p className="text-xs opacity-75 mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 pb-24"> {/* Extra padding for bottom nav */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-rounded">
              Quick Actions
            </h2>
            <Target className="h-5 w-5 text-coral-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleTestAlert}
              disabled={isTesting}
              className={`mobile-button-primary p-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-200 ${
                isTesting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'shadow-teal-glow hover:shadow-teal-glow-lg'
              }`}
            >
              {isTesting ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                <Bell className="h-6 w-6" />
              )}
              <span className="text-sm font-semibold font-rounded">
                {isTesting ? 'Testing...' : 'Test Alert'}
              </span>
            </button>
            
            <button className="mobile-button-accent p-4 rounded-2xl flex flex-col items-center gap-2 shadow-coral-glow hover:shadow-coral-glow-lg transition-all duration-200">
              <MapPin className="h-6 w-6" />
              <span className="text-sm font-semibold font-rounded">Find {petName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 