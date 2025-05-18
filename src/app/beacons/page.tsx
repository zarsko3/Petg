'use client';

import { useEffect } from 'react';
import { usePetgStore } from '@/lib/store';
import { Wifi } from 'lucide-react';

// Mock data for beacons
const mockBeacons = [
  { name: 'Living Room', rssi: -65, distance: 2.5 },
  { name: 'Kitchen', rssi: -75, distance: 4.8 },
  { name: 'Bedroom', rssi: -85, distance: 7.2 },
];

export default function BeaconsPage() {
  const { beacons, setBeacons } = usePetgStore();
  
  useEffect(() => {
    // Initialize mock beacons data
    setBeacons(mockBeacons);
    
    // Cleanup function
    return () => {
      setBeacons([]);
    };
  }, [setBeacons]);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Nearby Beacons</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        {beacons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-medium">Beacon Name</th>
                  <th className="text-center py-4 px-4 font-medium">RSSI</th>
                  <th className="text-center py-4 px-4 font-medium">Distance (m)</th>
                  <th className="text-center py-4 px-4 font-medium">Signal Strength</th>
                </tr>
              </thead>
              <tbody>
                {beacons.map((beacon, index) => (
                  <tr key={beacon.name} className={index !== beacons.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}>
                    <td className="py-4 px-4">{beacon.name}</td>
                    <td className="py-4 px-4 text-center">{beacon.rssi} dBm</td>
                    <td className="py-4 px-4 text-center">{beacon.distance.toFixed(2)} m</td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center items-center space-x-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          // Convert RSSI to signal bars (typical RSSI ranges from -100 to -30)
                          const signalStrength = Math.min(Math.max(0, Math.floor((beacon.rssi + 100) / 14)), 5);
                          return (
                            <div 
                              key={i}
                              className={`w-1.5 h-5 rounded-sm ${i < signalStrength ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                              style={{ height: `${(i + 1) * 4 + 5}px` }}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Wifi className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No beacons detected nearby</p>
            <p className="text-sm text-gray-400 mt-2">Move the collar closer to BLE beacons</p>
          </div>
        )}
      </div>
    </div>
  );
} 