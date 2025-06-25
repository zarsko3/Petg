import { useEffect, useState, useRef, useCallback } from 'react';
import { usePetgStore } from './store';

interface UseSocketOptions {
  url: string;
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: any) => void;
}

export function useSocket({
  url,
  enabled = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 10,
  onMessage
}: UseSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get store actions
  const {
    setSystemState,
    setBatteryLevel,
    setAlertActive
  } = usePetgStore();
  
  const connect = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    if (!enabled) return;
    
    try {
      console.log('Creating WebSocket connection to:', url);
      const socket = new WebSocket(url);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('✅ WebSocket connected to:', url);
        console.log('WebSocket readyState after open:', socket.readyState);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Send a test message to verify the connection
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            console.log('Sending test ping message...');
            socket.send(JSON.stringify({ command: 'get_status' }));
          }
        }, 1000);
      };
      
      socket.onmessage = (event) => {
        try {
          console.log('📨 WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          
          // Update store with received data (using snake_case properties from collar)
          if (data.system_state) {
            setSystemState(data.system_state);
          }
          
          if (data.battery_level !== undefined) {
            setBatteryLevel(data.battery_level);
          }
          
          if (data.alert_active !== undefined) {
            setAlertActive(data.alert_active);
          }
          
          // Call custom message handler if provided
          if (onMessage) {
            onMessage(data);
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
          console.error('Raw message:', event.data);
        }
      };
      
      socket.onerror = (event) => {
        const error = new Error(`WebSocket error - URL: ${url}`);
        console.error('❌ WebSocket error:', event);
        console.error('Connection URL:', url);
        console.error('WebSocket readyState:', socket.readyState);
        console.error('Error details:', event);
        setError(error);
      };
      
      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected from:', url);
        console.log('Close code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
        console.log('WebSocket readyState at close:', socket.readyState);
        setIsConnected(false);
        
        // Detailed close code analysis
        switch(event.code) {
          case 1000:
            console.log('Normal closure');
            break;
          case 1001:
            console.log('Going away (e.g., server going down)');
            break;
          case 1002:
            console.log('Protocol error');
            break;
          case 1003:
            console.log('Unsupported data type');
            break;
          case 1006:
            console.log('Abnormal closure (no close frame)');
            break;
          case 1011:
            console.log('Server error');
            break;
          default:
            console.log(`Unknown close code: ${event.code}`);
        }
        
        // Try to reconnect unless closed cleanly (code 1000)
        if (event.code !== 1000 && enabled) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.log(`🔄 Attempting to reconnect to ${url} (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, reconnectInterval);
          } else {
            console.error('❌ Max reconnection attempts reached for:', url);
            setError(new Error(`Failed to connect to ${url} after maximum attempts`));
          }
        }
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create WebSocket');
      console.error('❌ Error creating WebSocket:', error);
      setError(error);
    }
  }, [url, enabled, maxReconnectAttempts, reconnectInterval, onMessage, setBatteryLevel, setAlertActive, setSystemState]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000); // 1000 = Normal Closure
      socketRef.current = null;
    }
  }, []);
  
  const sendMessage = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message, socket is not connected');
    }
  }, []);
  
  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);
  
  return {
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect
  };
} 