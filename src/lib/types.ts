import { z } from 'zod'

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const ALERT_MODES = ['BUZZER', 'VIBRATION', 'BOTH', 'SILENT'] as const
export const COLLAR_STATUS = ['CONNECTED', 'DISCONNECTED', 'CHARGING', 'LOW_BATTERY'] as const
export const ZONE_TYPES = ['SAFE', 'RESTRICTED', 'ALERT'] as const

// =============================================================================
// BASE SCHEMAS
// =============================================================================

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  user_metadata: z.record(z.any()).optional(),
})

// =============================================================================
// COLLAR SCHEMAS
// =============================================================================

export const CollarSettingsSchema = z.object({
  alert_mode: z.enum(ALERT_MODES).default('BUZZER'),
  sensitivity: z.number().min(0).max(100).default(50),
  battery_threshold: z.number().min(0).max(100).default(20),
  heartbeat_interval: z.number().min(5).max(300).default(30), // seconds
  location_accuracy: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
})

export const CollarSchema = BaseEntitySchema.extend({
  user_id: z.string().uuid(),
  ble_mac: z.string().regex(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i),
  nickname: z.string().min(1).max(50),
  status: z.enum(COLLAR_STATUS).default('DISCONNECTED'),
  battery_level: z.number().min(0).max(100).optional(),
  firmware_version: z.string().optional(),
  last_seen: z.string().datetime().optional(),
  settings: CollarSettingsSchema.default({}),
})

// =============================================================================
// BEACON SCHEMAS
// =============================================================================

export const BeaconPositionSchema = z.object({
  x_pct: z.number().min(0).max(100),
  y_pct: z.number().min(0).max(100),
})

export const BeaconSchema = BaseEntitySchema.extend({
  user_id: z.string().uuid(),
  ble_mac: z.string().regex(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i),
  name: z.string().min(1).max(50),
  paired: z.boolean().default(false),
  position: BeaconPositionSchema.optional(),
  rssi: z.number().optional(),
  battery_level: z.number().min(0).max(100).optional(),
  last_seen: z.string().datetime().optional(),
})

// =============================================================================
// ZONE SCHEMAS
// =============================================================================

export const PointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
})

export const ZoneSchema = BaseEntitySchema.extend({
  user_id: z.string().uuid(),
  name: z.string().min(1).max(50),
  type: z.enum(ZONE_TYPES).default('SAFE'),
  polygon_json: z.array(PointSchema).min(3), // At least 3 points for a polygon
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  active: z.boolean().default(true),
  alert_settings: z.object({
    entry_alert: z.boolean().default(false),
    exit_alert: z.boolean().default(true),
    sound_enabled: z.boolean().default(true),
    notification_enabled: z.boolean().default(true),
  }).optional(),
})

// =============================================================================
// FLOOR PLAN SCHEMAS
// =============================================================================

export const FloorPlanSchema = BaseEntitySchema.extend({
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    type: z.enum(['rectangle', 'l-shape']),
    points: z.array(PointSchema),
    zIndex: z.number(),
  })),
  beacons: z.array(z.object({
    beacon_id: z.string(),
    beacon_name: z.string(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    room_id: z.string().optional(),
  })),
})

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

export const UserDeviceSchema = BaseEntitySchema.extend({
  user_id: z.string().uuid(),
  device_type: z.enum(['WEB', 'IOS', 'ANDROID']),
  push_token: z.string(),
  user_agent: z.string().optional(),
  last_active: z.string().datetime(),
  notifications_enabled: z.boolean().default(true),
})

export const NotificationSchema = BaseEntitySchema.extend({
  user_id: z.string().uuid(),
  type: z.enum(['ZONE_ALERT', 'BATTERY_LOW', 'COLLAR_DISCONNECTED', 'SYSTEM']),
  title: z.string().max(100),
  body: z.string().max(500),
  data: z.record(z.any()).optional(),
  read: z.boolean().default(false),
  sent_at: z.string().datetime(),
})

// =============================================================================
// WEBSOCKET MESSAGE SCHEMAS
// =============================================================================

export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('collarPaired'),
    data: CollarSchema,
  }),
  z.object({
    type: z.literal('collarSettingsUpdated'),
    data: z.object({
      collar_id: z.string().uuid(),
      settings: CollarSettingsSchema,
    }),
  }),
  z.object({
    type: z.literal('floorPlanUpdated'),
    data: FloorPlanSchema,
  }),
  z.object({
    type: z.literal('beaconPositionUpdated'),
    data: z.object({
      beacon_id: z.string().uuid(),
      position: BeaconPositionSchema,
    }),
  }),
  z.object({
    type: z.literal('zoneUpdated'),
    data: ZoneSchema,
  }),
  z.object({
    type: z.literal('notification'),
    data: NotificationSchema,
  }),
])

// =============================================================================
// BLE MESSAGE SCHEMAS
// =============================================================================

export const BLEMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ALERT_MODE'),
    value: z.enum(ALERT_MODES),
  }),
  z.object({
    type: z.literal('SENSITIVITY'),
    value: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal('HEARTBEAT_INTERVAL'),
    value: z.number().min(5).max(300),
  }),
  z.object({
    type: z.literal('LOCATION_REQUEST'),
    value: z.literal(true),
  }),
  z.object({
    type: z.literal('BATTERY_STATUS'),
    value: z.literal(true),
  }),
])

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

export const CollarPairRequestSchema = z.object({
  ble_mac: z.string().regex(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i),
  nickname: z.string().min(1).max(50),
})

export const CollarSettingsUpdateSchema = z.object({
  settings: CollarSettingsSchema.partial(),
})

export const BeaconScanResultSchema = z.object({
  devices: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    ble_mac: z.string(),
    rssi: z.number(),
  })),
})

export const ZoneCreateSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(ZONE_TYPES).default('SAFE'),
  polygon_json: z.array(PointSchema).min(3),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  alert_settings: z.object({
    entry_alert: z.boolean().default(false),
    exit_alert: z.boolean().default(true),
    sound_enabled: z.boolean().default(true),
    notification_enabled: z.boolean().default(true),
  }).optional(),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type User = z.infer<typeof UserSchema>
export type Collar = z.infer<typeof CollarSchema>
export type CollarSettings = z.infer<typeof CollarSettingsSchema>
export type Beacon = z.infer<typeof BeaconSchema>
export type BeaconPosition = z.infer<typeof BeaconPositionSchema>
export type Zone = z.infer<typeof ZoneSchema>
export type Point = z.infer<typeof PointSchema>
export type FloorPlan = z.infer<typeof FloorPlanSchema>
export type UserDevice = z.infer<typeof UserDeviceSchema>
export type Notification = z.infer<typeof NotificationSchema>
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>
export type BLEMessage = z.infer<typeof BLEMessageSchema>
export type CollarPairRequest = z.infer<typeof CollarPairRequestSchema>
export type CollarSettingsUpdate = z.infer<typeof CollarSettingsUpdateSchema>
export type BeaconScanResult = z.infer<typeof BeaconScanResultSchema>
export type ZoneCreate = z.infer<typeof ZoneCreateSchema>

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type AlertMode = typeof ALERT_MODES[number]
export type CollarStatus = typeof COLLAR_STATUS[number]
export type ZoneType = typeof ZONE_TYPES[number]

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

export const APIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
})

export type APIError = z.infer<typeof APIErrorSchema> 