/**
 * MQTT Client ID persistence for consistent reconnections
 */

// Storage key for client ID
const MQTT_CLIENT_ID_KEY = 'mqtt_client_id';

/**
 * Get a persistent client ID from localStorage or generate a new one
 * @returns The client ID to use for MQTT connections
 */
export function getPersistentClientId(): string {
  // Only run in browser
  if (typeof window === 'undefined') {
    return generateClientId();
  }
  
  try {
    // Try to get existing client ID from localStorage
    const savedClientId = localStorage.getItem(MQTT_CLIENT_ID_KEY);
    
    if (savedClientId) {
      return savedClientId;
    }
    
    // Generate and save a new client ID
    const newClientId = generateClientId();
    localStorage.setItem(MQTT_CLIENT_ID_KEY, newClientId);
    return newClientId;
  } catch (error) {
    // If localStorage fails (private browsing, etc.), just generate a new ID
    console.warn('Could not access localStorage for MQTT client ID persistence');
    return generateClientId();
  }
}

/**
 * Generate a random client ID
 * @returns A random client ID
 */
function generateClientId(): string {
  return `web-client-${Math.random().toString(16).slice(2, 10)}`;
}
