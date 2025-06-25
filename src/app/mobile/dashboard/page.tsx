'use client'

import { useState, useEffect } from 'react'
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
  Hand,
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

export default function MobileDashboard() {
  const [mounted, setMounted] = useState(false)
  const { stats: collarStats, isLive, status } = useCollarStats()
  
  // Map new hook data to old variable names for compatibility
  const collarData = {
    battery_level: collarStats.battery,
    signal_strength: collarStats.rssi,
    activity_level: 85, // Mock activity level
    temperature: collarStats.temperature,
    location: 'Living Room',
    last_seen: new Date().toISOString()
  }
  const lastUpdate = new Date()
  const isConnected = isLive
  const isLoading = status === 'connecting'
  const refetch = () => window.location.reload()

  
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

  const alerts = [
    {
      type: 'info',
      icon: MapPin,
      message: `${petName} is safe in the Living Room`,
      time: '2 min ago',
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
    },
    {
      type: 'success',
      icon: Award,
      message: 'Daily play goal achieved!',
      time: '1 hour ago',
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    },
    {
      type: 'achievement',
      icon: CheckCircle2,
      message: 'All safety zones are active',
      time: '3 hours ago',
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
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
              <Hand className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Let's check on {petName} • {currentTime}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={`p-4 rounded-2xl transition-all duration-200 mobile-button shadow-pet ${
              isConnected 
                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:shadow-teal-glow' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            <RefreshCw className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-200 ${
          isConnected 
            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="relative">
            <div className={`h-4 w-4 rounded-full ${
              isConnected ? 'bg-teal-500' : 'bg-amber-500'
            }`}>
              <div className="absolute inset-0 h-4 w-4 rounded-full pulse-ring ${
                isConnected ? 'bg-teal-500' : 'bg-amber-500'
              }" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold font-rounded">
              {isConnected ? `${petName}'s collar is connected` : `Demo mode - ${petName}'s collar offline`}
            </p>
            <p className="text-sm opacity-75">
              {isConnected ? 'Real-time monitoring active' : 'Showing sample data for demonstration'}
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

        {/* Pet Status Card */}
        <div className="mobile-card bg-pet-surface-elevated rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-pet">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-teal-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-teal-glow">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-rounded">
                  {petName}'s Status
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Updated {lastUpdate ? formatTimeAgo(lastUpdate) : 'just now'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-teal-500" />
                <span className="text-gray-900 dark:text-white font-medium">Current Location</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400 font-semibold">
                {typeof collarData?.location === 'string' ? collarData.location : 'Living Room'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-emerald-500" />
                <span className="text-gray-900 dark:text-white font-medium">Last Seen</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400 font-semibold">
                {collarData?.last_seen ? formatTimeAgo(new Date(collarData.last_seen)) : '2 min ago'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-orange-500" />
                <span className="text-gray-900 dark:text-white font-medium">Activity Level</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400 font-semibold">
                {collarData?.activity_level !== undefined ? getActivityLevelText(collarData.activity_level) : 'Moderate'}
              </span>
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
          
          <div className="grid grid-cols-2 gap-4">
            <button className="mobile-button-primary p-4 rounded-2xl flex flex-col items-center gap-2 shadow-teal-glow hover:shadow-teal-glow-lg transition-all duration-200">
              <Bell className="h-6 w-6" />
              <span className="text-sm font-semibold font-rounded">Test Alert</span>
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