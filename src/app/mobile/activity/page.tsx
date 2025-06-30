'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, MapPin, Clock, Zap, Heart, TrendingUp } from 'lucide-react';

interface ActivityEntry {
  id: string;
  type: 'location' | 'alert' | 'health' | 'behavior';
  title: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  location?: string;
  data?: any;
}

export default function ActivityPage() {
  // Sample activity data - replace with real data from your store/API
  const activities: ActivityEntry[] = [
    {
      id: '1',
      type: 'location',
      title: 'Location Update',
      description: 'Pet moved to Kitchen area',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      severity: 'low',
      location: 'Kitchen'
    },
    {
      id: '2',
      type: 'alert',
      title: 'Proximity Alert',
      description: 'Pet near PetZone-Home-01 beacon',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      severity: 'medium',
      location: 'Living Room'
    },
    {
      id: '3',
      type: 'health',
      title: 'Activity Level',
      description: 'High activity detected - playing',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      severity: 'low'
    },
    {
      id: '4',
      type: 'behavior',
      title: 'Rest Period',
      description: 'Pet resting for 2 hours',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      severity: 'low'
    },
    {
      id: '5',
      type: 'alert',
      title: 'Battery Low',
      description: 'Collar battery at 15%',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      severity: 'high'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'location': return MapPin;
      case 'alert': return Zap;
      case 'health': return Heart;
      case 'behavior': return TrendingUp;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string, severity: string) => {
    if (severity === 'high') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (severity === 'medium') return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
    
    switch (type) {
      case 'location': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'alert': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'health': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'behavior': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">Info</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Pet Activity
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Recent events and behavior patterns
          </p>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          {activities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type, activity.severity);
            
            return (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${colorClasses}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {activity.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(activity.severity)}
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatTime(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {activity.description}
                      </p>
                      
                      {activity.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {activity.location}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {activities.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Activity Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Activity data will appear here as your pet moves around and interacts with beacons.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 