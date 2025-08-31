'use client';

import { useState } from 'react';
import { getMQTTClient } from '@/lib/mqtt-client';
import { toast } from 'sonner';

export function MQTTTestButton() {
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const testMQTTConnection = async () => {
    setIsTesting(true);

    try {
      console.log('🔧 Testing MQTT connection...');

      const mqttClient = getMQTTClient();
      const status = mqttClient.getConnectionStatus();
      setConnectionStatus(status);

      console.log('📊 MQTT Status:', status);

      // Show status in UI
      if (status.connecting) {
        toast.info('MQTT Connecting...', {
          description: 'Attempting to connect to MQTT broker'
        });
      } else if (!status.connected) {
        toast.error('MQTT Not Connected', {
          description: 'MQTT client is not connected to the broker'
        });
        return;
      } else if (status.error) {
        toast.error('MQTT Configuration Error', {
          description: status.error
        });
        return;
      }

      // Test sending a simple command
      const collarId = 'PetCollar-001';
      await mqttClient.sendBuzzCommand(collarId, {
        duration_ms: 500,
        pattern: 'single'
      });

      toast.success('MQTT Test Successful', {
        description: 'Command sent successfully to collar'
      });

    } catch (error: any) {
      console.error('❌ MQTT Test Failed:', error);

      let errorMessage = 'MQTT Test Failed';
      let errorDescription = error.message || 'Unknown error';

      if (error.message?.includes('configuration missing')) {
        errorMessage = 'Configuration Missing';
        errorDescription = 'MQTT environment variables not set';
      } else if (error.message?.includes('not initialized')) {
        errorMessage = 'Client Not Initialized';
        errorDescription = 'MQTT client failed to initialize';
      } else if (error.message?.includes('not connected')) {
        errorMessage = 'Not Connected';
        errorDescription = 'MQTT client is not connected to broker';
      }

      toast.error(errorMessage, {
        description: errorDescription
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <button
      onClick={testMQTTConnection}
      disabled={isTesting}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isTesting
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {isTesting ? 'Testing...' : 'Test MQTT'}
    </button>
  );
}
