'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePetgStore } from '@/lib/store';
import { 
  Wifi, 
  Battery, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Clock,
  Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RecentUpdatesPanel() {
  const recentUpdates = usePetgStore((state) => state.recentUpdates);
  const clearRecentUpdates = usePetgStore((state) => state.clearRecentUpdates);

  // Get appropriate icon for update type
  const getUpdateIcon = (type: string, severity: string) => {
    switch (type) {
      case 'status':
        return severity === 'success' ? 
          <CheckCircle className="h-4 w-4 text-green-500" /> : 
          <Wifi className="h-4 w-4 text-blue-500" />;
      case 'connection':
        return <Wifi className="h-4 w-4 text-blue-500" />;
      case 'battery':
        return <Battery className="h-4 w-4 text-orange-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'beacon':
        return <Info className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get severity badge styling
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 text-xs">Success</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 text-xs">Error</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Info</Badge>;
    }
  };

  // Format relative time
  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Recent Updates
            {recentUpdates.length > 0 && (
              <Badge variant="outline">{recentUpdates.length}</Badge>
            )}
          </CardTitle>
          {recentUpdates.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearRecentUpdates}
              className="text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentUpdates.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent updates</p>
            <p className="text-xs text-gray-400 mt-1">
              Collar status and system events will appear here
            </p>
          </div>
        ) : (
          <div className="h-64 overflow-y-auto">
            <div className="space-y-3">
              {recentUpdates.map((update, index) => (
                <div 
                  key={update.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    index === 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 
                    'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getUpdateIcon(update.type, update.severity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {update.title}
                      </p>
                      {index === 0 && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Just now
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {update.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(update.severity)}
                        {update.collarId && (
                          <Badge variant="outline" className="text-xs">
                            {update.collarId}
                          </Badge>
                        )}
                      </div>
                      
                      <span className="text-xs text-gray-500">
                        {getRelativeTime(update.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 