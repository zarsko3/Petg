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
  Target,
  Video,
  Camera,
  Maximize2,
  ZoomIn,
  Sun,
  Moon
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
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  
  // Get time-based icon
  const getTimeIcon = () => {
    const hour = new Date().getHours()
    // Daytime: 6 AM to 6 PM (6-18), Nighttime: 6 PM to 6 AM (18-6)
    return hour >= 6 && hour < 18 ? Sun : Moon
  }
  
  const TimeIcon = getTimeIcon()

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
            <div className="flex items-center gap-2">
              <TimeIcon className="h-4 w-4 text-amber-500" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Let's check on {petName} • {currentTime}
              </p>
            </div>
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

        {/* Live Camera Feed */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-rounded">
              Live Camera Feed
            </h2>
            <Video className="h-5 w-5 text-teal-500" />
          </div>
          
          <div className="mobile-card bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-teal-glow">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white font-rounded">
                    {petName} • {collarData.location || 'Living Room'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wide">
                      LIVE
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {currentTime}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  HD • 1080p
                </p>
              </div>
            </div>

            {/* Camera View */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 aspect-video shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-4">
                    <Video className="h-16 w-16 text-gray-400 mx-auto animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-semibold text-lg mb-2">
                    Connecting to camera...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Loading high-definition feed
                  </p>
                </div>
              </div>
              
              {/* Live Status Badge */}
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>

              {/* Quality Badge */}
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                HD 1080p
              </div>
              
              {/* Timestamp Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-mono">
                {new Date().toLocaleDateString()} • {currentTime}
              </div>
            </div>

            {/* Camera Controls */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <button className="mobile-button-primary flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold shadow-teal-glow hover:shadow-teal-glow-lg transition-all duration-200">
                  <Maximize2 className="h-4 w-4" />
                  Full Screen
                </button>
                <button className="mobile-button-accent flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold shadow-coral-glow hover:shadow-coral-glow-lg transition-all duration-200">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </button>
              </div>
            </div>
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
          
          <div className="flex justify-center">
            <button 
              onClick={handleTestAlert}
              disabled={isTesting}
              className={`mobile-button-primary p-4 rounded-2xl flex flex-col items-center gap-2 transition-all duration-200 w-full max-w-xs ${
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
          </div>
        </div>
      </div>
    </div>
  )
} 