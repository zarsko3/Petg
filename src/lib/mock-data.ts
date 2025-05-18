import { usePetgStore } from './store';

export function initMockData() {
  const store = usePetgStore.getState();
  
  // Initialize user data
  store.setUser({
    name: 'Gal',
    email: 'gal@example.com',
  });

  // Initialize battery level
  store.setBatteryLevel(100);

  // Initialize initial position
  store.setPosition({
    x: 5 + Math.random() * 2,
    y: 3 + Math.random() * 2,
    valid: true
  });

  // Initialize other mock data
  const updateData = () => {
    const store = usePetgStore.getState();
    
    // Random battery drain
    const newBatteryLevel = Math.max(0, store.batteryLevel - Math.random() * 0.1);
    store.setBatteryLevel(newBatteryLevel);

    // Random position updates with smaller variations
    const currentPosition = store.position;
    const newX = currentPosition.x + (Math.random() - 0.5) * 0.5; // Smaller random changes
    const newY = currentPosition.y + (Math.random() - 0.5) * 0.5;
    store.setPosition({ 
      x: Math.max(0, Math.min(10, newX)), // Keep within bounds
      y: Math.max(0, Math.min(8, newY)),
      valid: true 
    });
  };

  // Update data more frequently
  const interval = setInterval(updateData, 2000); // Update every 2 seconds

  // Cleanup function
  return () => {
    clearInterval(interval);
  };
} 