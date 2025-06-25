// Auto-load collar configuration
export interface CollarConfig {
  ip: string;
  websocket: string;
  web: string;
  timestamp?: any;
}

export const getAutoCollarConfig = async (): Promise<CollarConfig | null> => {
  try {
    // Try to fetch the configuration file from the public directory
    const response = await fetch('/collar_config.json');
    if (response.ok) {
      const config = await response.json();
      console.log('🎯 Auto-loaded collar configuration:', config);
      return config;
    }
  } catch (error) {
    console.log('📝 No saved collar configuration found');
  }
  
  return null;
};

export const getDefaultWebSocketUrl = async (): Promise<string> => {
  const config = await getAutoCollarConfig();
  if (config?.websocket) {
    return config.websocket;
  }
  
  // Fallback to manual discovery
  return 'ws://192.168.1.100:8080';
}; 