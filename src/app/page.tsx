'use client';

import { useEffect } from 'react';
import { 
  Battery, AlertCircle, Wifi, Vibrate, Bell, Signal, 
  Gauge, Shield, Power, Zap, Clock, Calendar,
  TrendingUp, MapPin, History, ChevronRight
} from 'lucide-react';
import { usePetgStore } from '@/lib/store';
import { initMockData } from '@/lib/mock-data';
import { StatusChip } from '@/components/ui/status-chip';
import Image from 'next/image';

type SystemStateDetails = {
  icon: React.ReactNode;
  color: 'success' | 'danger' | 'warning' | 'default' | 'info';
  description: string;
};

// Mock data for activity tracking
const activityData = [
  { day: 'Sun', value: 45 },
  { day: 'Mon', value: 62 },
  { day: 'Tue', value: 85 },
  { day: 'Wed', value: 72 },
  { day: 'Thu', value: 55 },
  { day: 'Fri', value: 78 },
  { day: 'Sat', value: 60 },
];

const recentActivities = [
  { time: '2h ago', location: 'Living Room', duration: '45 min', type: 'Rest' },
  { time: '4h ago', location: 'Kitchen', duration: '15 min', type: 'Active' },
  { time: '6h ago', location: 'Bedroom', duration: '2h 30min', type: 'Sleep' },
];

export default function HomePage() {
  const { systemState, batteryLevel, alertActive, alertMode, user } = usePetgStore();
  
  useEffect(() => {
    const cleanup = initMockData();
    usePetgStore.getState().setSystemState('normal');
    usePetgStore.getState().setBatteryLevel(78);
    return () => cleanup();
  }, []);
  
  const getSystemStateDetails = (): SystemStateDetails => {
    switch (systemState) {
      case 'normal':
        return {
          icon: <Shield className="h-4 w-4" />,
          color: 'success',
          description: 'All systems operational'
        };
      case 'alert':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'danger',
          description: 'Alert condition detected'
        };
      case 'lowBattery':
        return {
          icon: <Battery className="h-4 w-4" />,
          color: 'warning',
          description: 'Battery level critical'
        };
      default:
        return {
          icon: <Shield className="h-4 w-4" />,
          color: 'default',
          description: 'Unknown state'
        };
    }
  };
  
  const getAlertModeIcon = () => {
    switch (alertMode) {
      case 'buzzer':
        return <Bell className="h-4 w-4" />;
      case 'vibration':
        return <Vibrate className="h-4 w-4" />;
      case 'both':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const systemDetails = getSystemStateDetails();
  
  return (
    <div className="container mx-auto p-4 min-h-screen space-y-4">
      {/* Main Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Activity Tracker Card - Spans 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Activity Tracker</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily activity patterns</p>
            </div>
            <select className="bg-gray-50 dark:bg-gray-700 border-0 rounded-lg text-sm px-3 py-2">
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
            </select>
          </div>
          
          <div className="flex items-end justify-between h-48 mb-4">
            {activityData.map((day, i) => (
              <div key={day.day} className="flex flex-col items-center gap-2">
                <div 
                  className="w-12 bg-blue-100 dark:bg-blue-900/30 rounded-t-lg transition-all hover:bg-blue-200 dark:hover:bg-blue-800/30"
                  style={{ height: `${day.value}%` }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{day.day}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-green-500">+20% more active than last week</span>
            </div>
            <button className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">
              View Details
            </button>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="space-y-4">
          {/* Power Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-3 flex items-center">
              <Power className="h-4 w-4 mr-1.5 text-blue-500" />
              Power Status
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Battery className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Battery Level</span>
                  </div>
                  <span className="text-sm font-medium">{Math.round(batteryLevel)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      batteryLevel > 60 ? 'bg-green-500' : 
                      batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(batteryLevel)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Est. Runtime</span>
                </div>
                <span className="text-sm font-medium">14h 30m</span>
              </div>
            </div>
          </div>

          {/* Alert Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-3 flex items-center">
              <Bell className="h-4 w-4 mr-1.5 text-orange-500" />
              Alert Status
            </h2>
            <div className="space-y-3">
              <StatusChip
                label="Alert"
                value={alertActive ? 'Active' : 'Inactive'}
                variant={alertActive ? 'danger' : 'success'}
                icon={<AlertCircle className="h-4 w-4" />}
              />
              {alertActive && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Movement detected outside safe zone
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Connection Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-3 flex items-center">
              <Signal className="h-4 w-4 mr-1.5 text-emerald-500" />
              Connection Status
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wifi className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Signal Strength</span>
                </div>
                <span className="text-sm font-medium">Excellent</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Response Time</span>
                </div>
                <span className="text-sm font-medium">45ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Recent Activities</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track your pet's recent movements</p>
            </div>
            <button className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <History className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.type}</p>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3 w-3 mr-1" />
                      {activity.location}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{activity.duration}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Daily Statistics</h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Active Time</span>
                <span className="text-sm font-medium">4h 30m</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="w-[65%] h-full bg-green-500 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Rest Time</span>
                <span className="text-sm font-medium">6h 15m</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="w-[45%] h-full bg-blue-500 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Play Time</span>
                <span className="text-sm font-medium">2h 45m</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="w-[30%] h-full bg-purple-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
