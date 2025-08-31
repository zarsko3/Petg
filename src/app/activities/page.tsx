'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/page-layout';
import { mockRecentActivities } from '@/lib/mock-data';
import { Clock, ChevronRight } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

interface Activity {
  type: 'Rest' | 'Active' | 'Sleep';
  duration: string;
  timeAgo: string;
  location?: string;
}

export default function ActivitiesPage() {
  const [mounted, setMounted] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(mockRecentActivities);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration issues
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Activity History</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track your pet's activities over time
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
                    <Clock className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium mb-0.5">{activity.type}</p>
                    {activity.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{activity.location}</p>
                    )}
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
    </PageLayout>
  );
}
