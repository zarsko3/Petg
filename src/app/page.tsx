'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Battery, Clock, AlertTriangle, Wifi, Activity as LucideActivity, ChevronRight, RefreshCw, Thermometer } from 'lucide-react';
import { mockRecentActivities } from '@/lib/mock-data';
import { PageLayout } from '@/components/page-layout';
import { RecentUpdatesPanel } from '@/components/recent-updates-panel';

import { useCollarData } from '@/hooks/useCollarData';
import { 
  formatTimeAgo, 
  formatDuration, 
  formatLastSeen, 
  getBatteryColor, 
  getBatteryGradient, 
  getSignalStrengthText, 
  getSignalColor, 
  getStatusBadgeColor,
  formatTemperature,
  getActivityLevelText,
  getActivityColor
} from '@/lib/utils';

// Define the Activity interface here to avoid conflicts with the imported mock data
interface Activity {
  type: 'Rest' | 'Active' | 'Sleep';
  location: string;
  duration: string;
  timeAgo: string;
}

export default function HomePage() {
  // Client-side state initialization
  const [mounted, setMounted] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('This Year');
  
  // Use real-time collar data
  const { data: collarData, status: collarStatus, isConnected, isLoading, lastUpdate, refetch } = useCollarData(5000);
  
  // Memoize the days array so it doesn't change on every render
  const days = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);
  
  // Start with fixed values to avoid hydration errors
  const [activityHeights, setActivityHeights] = useState<number[]>([60, 45, 70, 85, 55, 40, 65]);
  
  const [recentActivities] = useState<Activity[]>(mockRecentActivities);

  // Handle client-side only operations after mount
  useEffect(() => {
    setMounted(true);
    // Update with random heights only after mounting on client
    const randomHeights = days.map(() => Math.floor(Math.random() * 70) + 30); // 30-100 range for better visuals
    setActivityHeights(randomHeights);
  }, []);

  // Generate activity data based on collar data if available
  const activityData = useMemo(() => {
    if (collarData?.activity_level !== undefined && typeof collarData.activity_level === 'number') {
      // Use real activity level to influence the chart
      const baseLevel = collarData.activity_level;
      return days.map((_, i) => {
        const variation = (Math.random() - 0.5) * 30; // ±15% variation
        return Math.max(20, Math.min(100, baseLevel + variation));
      });
    }
    return activityHeights;
  }, [collarData?.activity_level, activityHeights, days]);

  // Calculate daily stats from collar data or use defaults
  const dailyStats = useMemo(() => {
    if (collarData?.daily_stats) {
      return {
        active_time: formatDuration(collarData.daily_stats.active_time),
        rest_time: formatDuration(collarData.daily_stats.rest_time),
        sleep_time: formatDuration(collarData.daily_stats.sleep_time || 0),
        active_percentage: Math.round((collarData.daily_stats.active_time / (24 * 60)) * 100),
        rest_percentage: Math.round((collarData.daily_stats.rest_time / (24 * 60)) * 100),
        sleep_percentage: Math.round(((collarData.daily_stats.sleep_time || 0) / (24 * 60)) * 100)
      };
    }
    return {
      active_time: '4h 30m',
      rest_time: '6h 15m',
      sleep_time: '2h 45m',
      active_percentage: 60,
      rest_percentage: 75,
      sleep_percentage: 35
    };
  }, [collarData?.daily_stats]);

  return (
    <PageLayout background="bg-gray-50/50 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Activity Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor your pet's daily activities and health status</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isConnected 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`} />
            <span className="text-sm font-medium">
              {isConnected ? 'Collar Connected' : 'Demo Mode'}
            </span>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Activity Tracker */}
          <div className="bg-white dark:bg-[#1e2530] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Activity Tracker</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {isConnected ? 'Real-time activity patterns' : 'Demo activity patterns'}
                </p>
              </div>
              <select 
                className="bg-gray-100 dark:bg-[#2a3441] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-xl px-6 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 hover:bg-gray-200 dark:hover:bg-[#323d4d] transition-colors"
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
              >
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
              </select>
            </div>

            {/* Activity Graph */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#2a3441] text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                  <LucideActivity className="h-4 w-4" />
                  <span className="font-medium">
                    {collarData?.activity_level && typeof collarData.activity_level === 'number'
                      ? `${getActivityLevelText(collarData.activity_level)} (${collarData.activity_level}%)`
                      : '+20% more active than last week'
                    }
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-4 pt-6">
                {days.map((day, i) => {
                  const height = activityData[i];
                  const isToday = i === 3;
                  return (
                    <div key={`${day}-${i}`} className="flex flex-col items-center group">
                      <div className="relative w-full">
                        {mounted && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                            <div className="bg-white dark:bg-[#2a3441] text-gray-900 dark:text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap border border-gray-300 dark:border-gray-700 shadow-lg">
                              <div className="font-medium mb-1">{day}</div>
                              <div className="text-emerald-600 dark:text-emerald-400">{Math.round(height)}% Activity</div>
                            </div>
                            <div className="w-2 h-2 bg-white dark:bg-[#2a3441] absolute left-1/2 -bottom-1 -translate-x-1/2 rotate-45 border-r border-b border-gray-300 dark:border-gray-700"></div>
                          </div>
                        )}
                        
                        {/* Bar Background */}
                        <div className="h-40 w-full bg-gray-100 dark:bg-[#2a3441] rounded-2xl relative overflow-hidden border border-gray-200 dark:border-gray-700/50">
                          {/* Activity Bar */}
                          <div 
                            className={`absolute bottom-0 w-full transition-all duration-500 ease-out transform group-hover:scale-[1.02] origin-bottom ${
                              isToday 
                                ? 'bg-gradient-to-t from-purple-600 via-purple-500 to-purple-400' 
                                : 'bg-gradient-to-t from-purple-600/90 via-purple-500/90 to-purple-400/90'
                            }`}
                            style={{ 
                              height: `${height}%`,
                              boxShadow: isToday ? '0 0 20px rgba(147, 51, 234, 0.3)' : 'none'
                            }}
                          >
                            {/* Shine Effect */}
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                          </div>
                        </div>
                      </div>
                      <span className={`mt-3 text-sm font-medium transition-colors duration-200 ${
                        isToday 
                          ? 'text-purple-500 dark:text-purple-400' 
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                      }`}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Recent Activities</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track your pet's recent movements</p>
              </div>
              <Link 
                href="/activities" 
                className="flex items-center gap-2 text-purple-500 dark:text-purple-400 text-sm font-medium hover:opacity-80 transition-opacity"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
                      <Clock className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium mb-0.5">{activity.type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{activity.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium mb-0.5">{activity.duration}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Power Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Power Status</h2>
              <Battery className={`h-5 w-5 ${
                collarData?.battery_level && typeof collarData.battery_level === 'number' 
                  ? getBatteryColor(collarData.battery_level) 
                  : 'text-green-500'
              }`} />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Battery Level</span>
                  <span className="text-sm font-medium">
                    {collarData?.battery_level && typeof collarData.battery_level === 'number' 
                      ? `${collarData.battery_level.toFixed(1)}%` 
                      : '74.10%'
                    }
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${
                      collarData?.battery_level && typeof collarData.battery_level === 'number'
                        ? getBatteryGradient(collarData.battery_level)
                        : 'from-green-500 to-green-400'
                    } rounded-full transition-all duration-500`} 
                    style={{ 
                      width: `${collarData?.battery_level && typeof collarData.battery_level === 'number' 
                        ? collarData.battery_level 
                        : 74.1
                      }%` 
                    }} 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Seen</span>
                <span className="text-sm font-medium">
                  {collarData?.last_seen ? formatLastSeen(collarData.last_seen) : '14h 30m'}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Alert Status</h2>
              <AlertTriangle className={`h-5 w-5 ${
                collarData?.alerts?.active ? 'text-red-500' : 'text-green-500'
              }`} />
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              collarData?.alerts?.active 
                ? 'bg-red-50 dark:bg-red-900/30'
                : 'bg-green-50 dark:bg-green-900/30'
            }`}>
              <div className={`h-2.5 w-2.5 rounded-full ${
                collarData?.alerts?.active 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-green-500 animate-pulse'
              }`} />
              <span className={`text-sm font-medium ${
                collarData?.alerts?.active 
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {collarData?.alerts?.active 
                  ? (collarData.alerts.message || 'Alert Active')
                  : 'Alert Inactive'
                }
              </span>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Connection Status</h2>
              <Wifi className={`h-5 w-5 ${isConnected ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">Signal Strength</span>
                <span className={`text-sm font-medium ${
                  collarData?.signal_strength && typeof collarData.signal_strength === 'number' 
                    ? getSignalColor(collarData.signal_strength) 
                    : ''
                }`}>
                  {collarData?.signal_strength && typeof collarData.signal_strength === 'number'
                    ? getSignalStrengthText(collarData.signal_strength)
                    : 'Excellent'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">Response Time</span>
                <span className="text-sm font-medium">
                  {collarStatus.response_time ? `${collarStatus.response_time}ms` : '45ms'}
                </span>
              </div>
              {collarData?.temperature && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </span>
                  <span className="text-sm font-medium">
                    {formatTemperature(collarData.temperature)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Daily Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Daily Statistics</h2>
              <LucideActivity className="h-5 w-5 text-purple-500" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Active Time</span>
                  <span className="text-sm font-medium">{dailyStats.active_time}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: `${dailyStats.active_percentage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Rest Time</span>
                  <span className="text-sm font-medium">{dailyStats.rest_time}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${dailyStats.rest_percentage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sleep Time</span>
                  <span className="text-sm font-medium">{dailyStats.sleep_time}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${dailyStats.sleep_percentage}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Updates Panel */}
          <RecentUpdatesPanel />

          {/* Data Source Indicator */}
          {lastUpdate && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Last Updated</span>
                <span>{formatTimeAgo(lastUpdate)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {isConnected ? 'Real-time data' : 'Demo data'}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
} 