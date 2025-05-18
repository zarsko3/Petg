import { usePetgStore } from './store';

interface WebSocketMessage {
  position?: { x: number; y: number; valid: boolean };
  beacons?: Array<{ name: string; rssi: number; distance: number }>;
  systemState?: 'normal' | 'alert' | 'lowBattery';
  batteryLevel?: number;
  alertActive?: boolean;
}

let socket: WebSocket | null = null;

export const connectWebSocket = (url: string) => {
  if (socket) {
    socket.close();
  }

  const store = usePetgStore.getState();
  
  socket = new WebSocket(url);
  
  socket.onopen = () => {
    console.log('WebSocket connection established');
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      
      // Update store based on received data
      if (data.position) {
        store.setPosition(data.position);
      }
      
      if (data.beacons) {
        store.setBeacons(data.beacons);
      }
      
      if (data.systemState) {
        store.setSystemState(data.systemState);
      }
      
      if (data.batteryLevel !== undefined) {
        store.setBatteryLevel(data.batteryLevel);
      }
      
      if (data.alertActive !== undefined) {
        store.toggleAlert(data.alertActive);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return {
    sendMessage: (message: WebSocketMessage) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    disconnect: () => {
      if (socket) {
        socket.close();
        socket = null;
      }
    }
  };
};

export const useWebSocket = () => {
  return {
    connect: connectWebSocket
  };
}; 