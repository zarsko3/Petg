'use client';

import { useState, useEffect } from 'react';
import { Camera, Wifi, WifiOff, Activity, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface CameraBeacon {
  device_id: string;
  device_name: string;
  ip_address: string;
  status: 'online' | 'offline';
  last_seen: number;
  wifi_rssi: number;
  camera_initialized: boolean;
  uptime: number;
  stream_url: string;
  snapshot_url: string;
  status_url: string;
}

interface CameraFeedsProps {
  detectedBeacons?: Array<{
    name: string;
    address: string;
    rssi: number;
    distance: number;
    metadata?: any;
  }>;
}

export function CameraFeeds({ detectedBeacons = [] }: CameraFeedsProps) {
  const [cameraBeacons, setCameraBeacons] = useState<CameraBeacon[]>([]);
  const [expandedCamera, setExpandedCamera] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter camera beacons from detected beacons
  useEffect(() => {
    const cameras: CameraBeacon[] = [];
    
    detectedBeacons.forEach(beacon => {
      if (beacon.name && beacon.name.includes('CAM')) {
        // Extract IP from beacon metadata or use a discovery method
        const ip = discoverCameraIP(beacon);
        if (ip) {
          cameras.push({
            device_id: extractDeviceId(beacon),
            device_name: beacon.name,
            ip_address: ip,
            status: 'online',
            last_seen: Date.now(),
            wifi_rssi: beacon.rssi,
            camera_initialized: true,
            uptime: 0,
            stream_url: `http://${ip}/stream`,
            snapshot_url: `http://${ip}/snapshot`,
            status_url: `http://${ip}/status`
          });
        }
      }
    });
    
    setCameraBeacons(cameras);
  }, [detectedBeacons]);

  const discoverCameraIP = (beacon: any): string | null => {
    // In a real implementation, you would:
    // 1. Use mDNS discovery to find camera devices
    // 2. Parse service data from BLE advertisements
    // 3. Maintain a database of known camera IPs
    
    // For demo purposes, return a placeholder IP
    if (beacon.name.includes('CAM001')) return '192.168.1.101';
    if (beacon.name.includes('CAM002')) return '192.168.1.102';
    if (beacon.name.includes('CAM003')) return '192.168.1.103';
    
    return null;
  };

  const extractDeviceId = (beacon: any): string => {
    if (beacon.name.includes('CAM001')) return 'CAM001';
    if (beacon.name.includes('CAM002')) return 'CAM002';
    if (beacon.name.includes('CAM003')) return 'CAM003';
    return 'UNKNOWN';
  };

  const refreshCameraStatus = async () => {
    setRefreshing(true);
    
    // Update status for each camera
    const updatedCameras = await Promise.all(
      cameraBeacons.map(async (camera) => {
        try {
          const response = await fetch(camera.status_url, { 
            method: 'GET',
            timeout: 5000 
          } as any);
          
          if (response.ok) {
            const status = await response.json();
            return {
              ...camera,
              status: 'online' as const,
              last_seen: Date.now(),
              uptime: status.uptime || 0,
              camera_initialized: status.camera_initialized || false,
              wifi_rssi: status.wifi_rssi || camera.wifi_rssi
            };
          } else {
            return { ...camera, status: 'offline' as const };
          }
        } catch (error) {
          return { ...camera, status: 'offline' as const };
        }
      })
    );
    
    setCameraBeacons(updatedCameras);
    setRefreshing(false);
  };

  const handleStreamError = (cameraId: string) => {
    setCameraBeacons(prev =>
      prev.map(cam =>
        cam.device_id === cameraId
          ? { ...cam, status: 'offline' as const }
          : cam
      )
    );
  };

  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (cameraBeacons.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Camera Beacons Detected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Camera beacons will appear here when detected by the collar
          </p>
          <button
            onClick={refreshCameraStatus}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                Scanning...
              </>
            ) : (
              'Scan for Cameras'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          📹 Camera Feeds ({cameraBeacons.length})
        </h2>
        <button
          onClick={refreshCameraStatus}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Camera Grid */}
      <div className={expandedCamera ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}>
        {cameraBeacons.map((camera) => (
          <div
            key={camera.device_id}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden ${
              expandedCamera === camera.device_id ? 'col-span-full' : ''
            }`}
          >
            {/* Camera Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    camera.status === 'online' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Camera className={`h-5 w-5 ${
                      camera.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {camera.device_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {camera.ip_address}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Status indicator */}
                  <div className="flex items-center gap-1">
                    {camera.status === 'online' ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${
                      camera.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {camera.status}
                    </span>
                  </div>
                  
                  {/* Expand/collapse button */}
                  <button
                    onClick={() => setExpandedCamera(
                      expandedCamera === camera.device_id ? null : camera.device_id
                    )}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {expandedCamera === camera.device_id ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Camera Feed */}
            <div className={`relative ${expandedCamera === camera.device_id ? 'h-96' : 'h-48'}`}>
              {camera.status === 'online' && camera.camera_initialized ? (
                <img
                  src={camera.stream_url}
                  alt={`Live feed from ${camera.device_name}`}
                  className="w-full h-full object-cover"
                  onError={() => handleStreamError(camera.device_id)}
                  onLoad={() => {
                    // Mark camera as online if stream loads successfully
                    setCameraBeacons(prev =>
                      prev.map(cam =>
                        cam.device_id === camera.device_id
                          ? { ...cam, status: 'online' as const, last_seen: Date.now() }
                          : cam
                      )
                    );
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {camera.status === 'offline' ? 'Camera Offline' : 'Camera Initializing...'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Overlay with camera info */}
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {camera.device_id}
              </div>
              
              {/* RSSI indicator */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {camera.wifi_rssi} dBm
              </div>
            </div>

            {/* Camera Stats (shown when expanded) */}
            {expandedCamera === camera.device_id && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Uptime</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatUptime(camera.uptime)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Signal</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {camera.wifi_rssi} dBm
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Last Seen</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(camera.last_seen).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <a
                      href={camera.snapshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      📸 Snapshot
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 