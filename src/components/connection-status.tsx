import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: Date | null;
  responseTime?: number;
  error?: string | null;
  className?: string;
}

export function ConnectionStatus({ 
  isConnected, 
  lastUpdate, 
  responseTime, 
  error, 
  className = '' 
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isConnected) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusBg = () => {
    if (error) return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    if (isConnected) return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
  };

  const getStatusText = () => {
    if (error) return 'Connection Error';
    if (isConnected) return 'Collar Connected';
    return 'Demo Mode';
  };

  const getIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4" />;
    if (isConnected) return <Wifi className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusBg()} ${className}`}>
      <div className={`${getStatusColor()}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {error ? (
            <span className="text-red-600 dark:text-red-400">{error}</span>
          ) : (
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span>Updated {formatTimeAgo(lastUpdate)}</span>
              )}
              {responseTime && (
                <span>• {responseTime}ms</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {isConnected && (
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      )}
    </div>
  );
} 