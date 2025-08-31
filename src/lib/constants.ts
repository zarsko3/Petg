// Guest mode configuration
export const GUEST_DEVICE_ID = 'guest-collar-001'

// MQTT Topics
export const MQTT_TOPICS = {
  // Collar status (online/offline)
  COLLAR_STATUS: (collarId: string) => `pet-collar/${collarId}/status`,
  COLLAR_STATUS_WILDCARD: 'pet-collar/+/status',
  
  // Collar telemetry data (position, battery, sensors)
  COLLAR_TELEMETRY: (collarId: string) => `pet-collar/${collarId}/telemetry`, 
  COLLAR_TELEMETRY_WILDCARD: 'pet-collar/+/telemetry',
  
  // Additional firmware topics
  COLLAR_ZONES: (collarId: string) => `pet-collar/${collarId}/zones`,
  COLLAR_ZONES_WILDCARD: 'pet-collar/+/zones',
  COLLAR_LOCATION: (collarId: string) => `pet-collar/${collarId}/location`,
  COLLAR_LOCATION_WILDCARD: 'pet-collar/+/location',
  COLLAR_BEACONS: (collarId: string) => `pet-collar/${collarId}/beacon-detection`,
  COLLAR_BEACONS_WILDCARD: 'pet-collar/+/beacon-detection',
  COLLAR_ALERTS: (collarId: string) => `pet-collar/${collarId}/alert`,
  COLLAR_ALERTS_WILDCARD: 'pet-collar/+/alert',
  
  // Commands to collar
  COLLAR_COMMAND_BUZZ: (collarId: string) => `pet-collar/${collarId}/command/buzz`,
  COLLAR_COMMAND_ZONE: (collarId: string) => `pet-collar/${collarId}/command/zone`,
  COLLAR_COMMAND_LOCATE: (collarId: string) => `pet-collar/${collarId}/command/locate`,
  COLLAR_COMMAND_LED: (collarId: string) => `pet-collar/${collarId}/command/led`,
  COLLAR_COMMAND_SETTINGS: (collarId: string) => `pet-collar/${collarId}/command/settings`,
  
  // Web client status
  WEB_STATUS: 'web/status'
} as const;
