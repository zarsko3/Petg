import { z } from 'zod'

// Device status enum
export const DeviceStatus = {
  UNCLAIMED: 'unclaimed',
  CLAIMED: 'claimed',
  DISABLED: 'disabled'
} as const

// Device schema
export const deviceSchema = z.object({
  id: z.string().min(1),                    // Device ID (e.g., PetCollar-001)
  claim_code: z.string().min(6).max(12),    // Claim code for device linking
  status: z.enum([
    DeviceStatus.UNCLAIMED,
    DeviceStatus.CLAIMED, 
    DeviceStatus.DISABLED
  ]),
  owner_user_id: z.string().nullable(),      // Clerk user ID when claimed
  created_at: z.string().datetime(),         // ISO datetime
  last_seen_at: z.string().datetime(),       // ISO datetime
  name: z.string().nullable(),               // User-assigned name
  model: z.string(),                         // Device model (e.g., ESP32-S3_PetCollar)
  firmware_version: z.string(),              // Firmware version
  battery_level: z.number().min(0).max(100).nullable(),
  wifi_rssi: z.number().nullable(),
  mqtt_connected: z.boolean()
})

export type Device = z.infer<typeof deviceSchema>

// Device telemetry schema
export const deviceTelemetrySchema = z.object({
  device_id: z.string().min(1),
  timestamp: z.string().datetime(),
  battery_level: z.number().min(0).max(100).nullable(),
  wifi_rssi: z.number().nullable(),
  temperature: z.number().nullable(),
  uptime_ms: z.number(),
  free_heap: z.number(),
  active_beacons: z.number()
})

export type DeviceTelemetry = z.infer<typeof deviceTelemetrySchema>

// Device status schema (MQTT)
export const deviceStatusSchema = z.object({
  device_id: z.string().min(1),
  status: z.enum(['online', 'offline']),
  claim_code: z.string().min(6).max(12).optional(),
  timestamp: z.number(),
  ip_address: z.string().optional(),
  model: z.string().optional(),
  firmware_version: z.string().optional()
})

export type DeviceStatus = z.infer<typeof deviceStatusSchema>

// Device command schema (MQTT)
export const deviceCommandSchema = z.object({
  command_id: z.string().uuid(),
  command: z.enum(['buzz', 'led', 'reboot']),
  duration_ms: z.number().optional(),
  intensity: z.number().min(0).max(255).optional(),
  pattern: z.enum(['single', 'double', 'triple']).optional()
})

export type DeviceCommand = z.infer<typeof deviceCommandSchema>

// Command acknowledgment schema (MQTT)
export const commandAckSchema = z.object({
  command_id: z.string().uuid(),
  status: z.enum(['success', 'error']),
  error: z.string().optional(),
  timestamp: z.number()
})

export type CommandAck = z.infer<typeof commandAckSchema>
