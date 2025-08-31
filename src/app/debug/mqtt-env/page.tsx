'use client';

import { useState, useEffect } from 'react';
import { hasMqttConfig } from '@/lib/mqtt-client';
import { getMQTTClient } from '@/lib/mqtt-client';
import { MQTTTestButton } from '@/components/mqtt-test-button';

export default function MQTTEnvDebugPage() {
  const [mqttConfigStatus, setMqttConfigStatus] = useState<boolean | null>(null);
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState<any>(null);
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    // Check MQTT configuration
    const configAvailable = hasMqttConfig();
    setMqttConfigStatus(configAvailable);

    // Get environment variables (client-side accessible ones)
    const clientEnvVars = {
      NEXT_PUBLIC_MQTT_HOST: process.env.NEXT_PUBLIC_MQTT_HOST,
      NEXT_PUBLIC_MQTT_PORT: process.env.NEXT_PUBLIC_MQTT_PORT,
      NEXT_PUBLIC_MQTT_USER: process.env.NEXT_PUBLIC_MQTT_USER,
      NEXT_PUBLIC_MQTT_PASS: process.env.NEXT_PUBLIC_MQTT_PASS ? '[SET]' : '[NOT SET]',
    };
    setEnvVars(clientEnvVars);

    // Check MQTT client connection status
    if (configAvailable) {
      try {
        const mqttClient = getMQTTClient();
        const status = mqttClient.getConnectionStatus();
        setMqttConnectionStatus(status);
      } catch (error) {
        setMqttConnectionStatus({ error: error.message });
      }
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">MQTT Environment Debug</h1>

        {/* Environment Variables */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Environment Variables</h2>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-mono text-sm">{key}:</span>
                  <span className={`font-mono text-sm ${
                    value === '[NOT SET]' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MQTT Configuration Status */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">MQTT Configuration Status</h2>
          <div className={`p-4 rounded-lg ${
            mqttConfigStatus ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                mqttConfigStatus ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-medium">
                {mqttConfigStatus ? '✅ Configuration Available' : '❌ Configuration Missing'}
              </span>
            </div>
            {!mqttConfigStatus && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Missing required environment variables. Please check your .env.local file.
              </p>
            )}
          </div>
        </div>

        {/* MQTT Connection Status */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">MQTT Connection Status</h2>
          {mqttConnectionStatus && (
            <div className={`p-4 rounded-lg ${
              mqttConnectionStatus.connected
                ? 'bg-green-50 dark:bg-green-900/20'
                : mqttConnectionStatus.connecting
                ? 'bg-yellow-50 dark:bg-yellow-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-3 w-3 rounded-full ${
                  mqttConnectionStatus.connected
                    ? 'bg-green-500'
                    : mqttConnectionStatus.connecting
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`} />
                <span className="font-medium">
                  {mqttConnectionStatus.connected
                    ? '✅ Connected'
                    : mqttConnectionStatus.connecting
                    ? '🔄 Connecting...'
                    : '❌ Not Connected'
                  }
                </span>
              </div>
              {mqttConnectionStatus.client_id && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Client ID: {mqttConnectionStatus.client_id}
                </p>
              )}
              {mqttConnectionStatus.error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {mqttConnectionStatus.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Test Button */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">MQTT Connection Test</h2>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="text-sm mb-4">Click the button below to test MQTT connection and send a command:</p>
            <MQTTTestButton />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">📋 Required Environment Variables</h3>
          <p className="text-sm mb-3">Add these to your <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code> file:</p>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded">
{`NEXT_PUBLIC_MQTT_HOST=ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud
NEXT_PUBLIC_MQTT_PORT=8884
NEXT_PUBLIC_MQTT_USER=PetCollar-001
NEXT_PUBLIC_MQTT_PASS=246810Gal`}
          </pre>
        </div>
      </div>
    </div>
  );
}
