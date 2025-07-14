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
      const socket = new WebSocket(url);
      socketRef.current = socket;
      
      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Send a test message to verify the connection
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ command: 'get_status' }));
          }
        }, 1000);
      };
      
      socket.onmessage = (event) => {
        try {
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
          setError(err instanceof Error ? err : new Error('Failed to parse WebSocket message'));
        }
      };
      
      socket.onerror = (event) => {
        const error = new Error(`WebSocket error - URL: ${url}`);
        setError(error);
      };
      
      socket.onclose = (event) => {
        setIsConnected(false);
        
        // Detailed close code analysis
        switch(event.code) {
          case 1000:
            break;
          case 1001:
            break;
          case 1002:
            break;
          case 1003:
            break;
          case 1006:
            break;
          case 1011:
            break;
          default:
            // No log statement for unknown close code
        }
        
        // Try to reconnect unless closed cleanly (code 1000)
        if (event.code !== 1000 && enabled) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, reconnectInterval) as unknown as NodeJS.Timeout;
          } else {
            setError(new Error(`Failed to connect to ${url} after maximum attempts`));
          }
        }
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create WebSocket');
      setError(error);
    }
  }, [url, enabled, maxReconnectAttempts, reconnectInterval]);
  
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