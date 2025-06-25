'use client';

import { useState, useEffect } from 'react';
import { useCollarAutoDiscovery } from '@/hooks/useCollarAutoDiscovery';

export function CollarSetup() {
  const {
    isDiscovering,
    isConnected,
    collarIP,
    lastDiscovery,
    error,
    discoverCollar,
    manualSetCollar,
    hasError
  } = useCollarAutoDiscovery();

  const [manualIP, setManualIP] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Log when component mounts to show it's working
  useEffect(() => {
    console.log('🎯 CollarSetup component loaded in Settings page');
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualIP.trim()) {
      await manualSetCollar(manualIP.trim());
      setManualIP('');
      setShowManual(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🎯 Collar Connection & Discovery
        </h3>
        
        <div className="flex items-center space-x-2">
          {isDiscovering && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm">Searching...</span>
            </div>
          )}
          
          {isConnected && !isDiscovering && (
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Connected</span>
            </div>
          )}
          
          {hasError && !isDiscovering && (
            <div className="flex items-center text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Information */}
      <div className="space-y-2 mb-4">
        {collarIP && (
          <div className="text-sm">
            <span className="text-gray-600">Current IP:</span>
            <span className="font-mono ml-2 text-blue-600">{collarIP}</span>
          </div>
        )}
        
        {lastDiscovery && (
          <div className="text-sm">
            <span className="text-gray-600">Last Discovery:</span>
            <span className="ml-2 text-gray-800">
              {new Date(lastDiscovery).toLocaleString()}
            </span>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={discoverCollar}
          disabled={isDiscovering}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
        >
          {isDiscovering ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Searching...
            </>
          ) : (
            <>
              🔍 Auto-Discover
            </>
          )}
        </button>

        <button
          onClick={() => setShowManual(!showManual)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          🔧 Manual Setup
        </button>
      </div>

      {/* Manual IP Configuration */}
      {showManual && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Manual IP Configuration
          </h4>
          
          <form onSubmit={handleManualSubmit} className="flex items-center space-x-3">
            <input
              type="text"
              value={manualIP}
              onChange={(e) => setManualIP(e.target.value)}
              placeholder="Enter collar IP (e.g., 10.0.0.8)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
            />
            
            <button
              type="submit"
              disabled={!manualIP.trim() || isDiscovering}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Test & Set
            </button>
          </form>
          
          <div className="mt-2 text-xs text-gray-600">
            <strong>Common addresses:</strong> 10.0.0.8, 10.0.0.4, 192.168.1.100
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded">
        <strong>💡 Smart Discovery:</strong> The system automatically searches for your collar 
        on first load and only retries if disconnected. The configuration is saved and reused 
        to avoid unnecessary scanning.
      </div>
    </div>
  );
} 