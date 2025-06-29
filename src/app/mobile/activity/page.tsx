'use client';

import React from 'react';
import { usePetgStore } from '@/lib/store';

export default function MobileActivityPage() {
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const demoMode = usePetgStore((state) => state.demoMode);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Activity
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Pet Activity Tracking
          </h2>
          
          {isConnected && !demoMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-sm font-semibold text-green-600">Live Data Active</span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Activity tracking is now connected via MQTT cloud service. 
                Real-time pet activity data will appear here once the collar starts transmitting.
              </p>
            </div>
          ) : demoMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-sm font-semibold text-amber-600">Demo Mode</span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Activity tracking will activate automatically when collar connects via MQTT.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className="text-sm font-semibold text-gray-500">Awaiting Connection</span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Waiting for collar to connect via MQTT cloud service...
              </p>
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              📊 Activity Features
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Real-time activity monitoring</li>
              <li>• Daily activity summaries</li>
              <li>• Sleep pattern tracking</li>
              <li>• Exercise activity logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 