  'use client';

import { useEffect } from 'react';
import { getMQTTClient } from '@/lib/mqtt-client';
import { usePetgStore } from '@/lib/store';

interface CollarServiceProviderProps {
  children: React.ReactNode;
}

export function CollarServiceProvider({ children }: CollarServiceProviderProps) {
  useEffect(() => {
    console.log('🚀 CollarServiceProvider: Starting MQTT client...');
    
    // Initialize MQTT client for cloud connectivity
    const initializeMQTT = async () => {
      try {
        const mqttClient = getMQTTClient();
        const store = usePetgStore.getState();
        
        // Set up event handlers
        mqttClient.onConnect = () => {
          console.log('✅ CollarServiceProvider: MQTT connected');
          store.setCollarConnected(true);
          store.setConnectionStatus('Connected');
          store.setConnectionMessage('Connected to HiveMQ Cloud');
        };
        
        mqttClient.onDisconnect = () => {
          console.log('🔌 CollarServiceProvider: MQTT disconnected');
          store.setCollarConnected(false);
          store.setConnectionStatus('Failed');
          store.setConnectionMessage('MQTT connection lost');
        };
        
        mqttClient.onCollarStatus = (collarId: string, data) => {
          console.log(`📡 CollarServiceProvider: Status from ${collarId}:`, data);
          if (data.status === 'online') {
            store.setCollarConnected(true);
            store.setConnectionStatus('Connected');
            store.setConnectionMessage(`Collar ${collarId} online`);
          }
        };
        
        mqttClient.onCollarTelemetry = (collarId: string, data) => {
          console.log(`📊 CollarServiceProvider: Telemetry from ${collarId}:`, data);
          store.setLastCollarData(data);
          store.setLastDataReceived(Date.now());
        };
        
        mqttClient.onError = (error) => {
          console.error('❌ CollarServiceProvider: MQTT error:', error);
          store.setCollarConnected(false);
          store.setConnectionStatus('Failed');
          store.setConnectionMessage('MQTT connection error');
        };
        
        console.log('✅ CollarServiceProvider: MQTT client initialized');
        
      } catch (error) {
        console.error('❌ CollarServiceProvider: MQTT initialization failed:', error);
      }
    };
    
    initializeMQTT();
    
    return () => {
      console.log('🧹 CollarServiceProvider: Cleaning up MQTT client...');
      // Note: MQTT client manages its own lifecycle
    };
  }, []);

  return <>{children}</>;
} 