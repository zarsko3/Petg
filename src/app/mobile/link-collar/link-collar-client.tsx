'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceStatus } from '@/lib/schema';
import { getMQTTClient } from '@/lib/mqtt-client';

interface Device {
  id: string;
  status: string;
  name: string | null;
  last_seen_at: string;
  model: string;
  firmware_version: string;
  mqtt_connected: boolean;
}

export default function LinkCollarClient() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get auth state only on client
  const { isSignedIn, user } = isClient ? useUser() : { isSignedIn: false, user: null };

  // Fetch available devices
  useEffect(() => {
    if (!isClient) return;

    async function fetchDevices() {
      try {
        const params = new URLSearchParams({
          include_unclaimed: 'true',
          status: DeviceStatus.UNCLAIMED
        });

        const res = await fetch(`/api/devices?${params}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch devices');

        setDevices(data.devices);
      } catch (error) {
        console.error('Error fetching devices:', error);
        toast.error('Failed to load available devices');
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, [isClient]);

  // Subscribe to MQTT presence for live device status
  useEffect(() => {
    if (!isClient) return;

    try {
      const mqttClient = getMQTTClient();
      
      // Subscribe to all device status topics
      mqttClient.subscribeToDeviceStatus('*', (deviceId, status) => {
        setDevices(prev => prev.map(device => {
          if (device.id === deviceId) {
            return {
              ...device,
              mqtt_connected: status === 'online',
              last_seen_at: new Date().toISOString()
            };
          }
          return device;
        }));
      });

      return () => {
        mqttClient.unsubscribeFromDeviceStatus('*');
      };
    } catch (error) {
      console.warn('MQTT client not available:', error);
    }
  }, [isClient]);

  // Handle device selection
  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
    setClaimCode('');
  };

  // Handle claim code submission
  const handleClaim = async () => {
    if (!selectedDevice || !claimCode || !isSignedIn) return;

    setClaiming(true);
    try {
      const res = await fetch('/api/devices/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDevice.id,
          claim_code: claimCode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim device');

      toast.success('Device claimed successfully!');
      router.push('/mobile/dashboard');

    } catch (error) {
      console.error('Error claiming device:', error);
      toast.error('Failed to claim device. Please check the claim code and try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Show loading state during initial client-side render
  if (!isClient || loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Link Your Pet Collar</CardTitle>
          <CardDescription>
            Select your device and enter the claim code shown on the collar's display.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No unclaimed devices found. Make sure your collar is powered on and connected.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Available Devices</Label>
                {devices.map(device => (
                  <Button
                    key={device.id}
                    variant={selectedDevice?.id === device.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-2 h-2 rounded-full ${device.mqtt_connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{device.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {device.model} • v{device.firmware_version}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              {selectedDevice && (
                <div className="space-y-2">
                  <Label htmlFor="claimCode">Claim Code</Label>
                  <Input
                    id="claimCode"
                    placeholder="Enter the 6-digit code shown on the collar"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={!selectedDevice || !claimCode || claiming || !isSignedIn}
          >
            {claiming ? 'Linking...' : 'Link Collar'}
          </Button>
        </CardFooter>
      </Card>

      {!isSignedIn && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Sign in to link a collar to your account.</p>
              <Button
                variant="link"
                onClick={() => router.push('/sign-in')}
                className="mt-2"
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
