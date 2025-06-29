# Environment Variables Configuration

This document lists all environment variables required for the Pet Collar application.

## Production Environment (Vercel)

Set these variables in your Vercel dashboard:

```bash
# HiveMQ Cloud MQTT Configuration
NEXT_PUBLIC_MQTT_HOST=ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud
NEXT_PUBLIC_MQTT_PORT=8884
NEXT_PUBLIC_MQTT_USER=zarsko
NEXT_PUBLIC_MQTT_PASS=089430732zG

# MQTT Settings (server-side)
MQTT_USERNAME=zarsko
MQTT_PASSWORD=089430732zG

# Application Settings
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false

# Collar Settings
NEXT_PUBLIC_DEFAULT_COLLAR_ID=001
NEXT_PUBLIC_COLLAR_DISCOVERY_TIMEOUT=30000

# API Settings
NEXT_PUBLIC_API_TIMEOUT=10000
```

## Development Environment (.env.local)

Create a `.env.local` file in your project root:

```bash
# HiveMQ Cloud MQTT Configuration
NEXT_PUBLIC_MQTT_HOST=ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud
NEXT_PUBLIC_MQTT_PORT=8884
NEXT_PUBLIC_MQTT_USER=zarsko
NEXT_PUBLIC_MQTT_PASS=089430732zG

# MQTT Settings (server-side)
MQTT_USERNAME=zarsko
MQTT_PASSWORD=089430732zG

# Application Settings
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEBUG_MODE=true

# Collar Settings
NEXT_PUBLIC_DEFAULT_COLLAR_ID=001
NEXT_PUBLIC_COLLAR_DISCOVERY_TIMEOUT=30000

# WebSocket (for local development)
NEXT_PUBLIC_WS_HOST=localhost
NEXT_PUBLIC_WS_PORT=3001

# API Settings
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=10000
```

## ESP32 Firmware Configuration

Update your ESP32 firmware to match these settings:

```cpp
// WiFi Networks (Primary + Backup)
SimpleWiFiCredentials wifiNetworks[] = {
    {"JenoviceAP", "your_primary_password", "Primary Network"},
    {"g&n", "0547530732", "Backup Network"}
};

// MQTT Configuration
#define MQTT_SERVER "ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883  // TLS port for ESP32
#define MQTT_USER "PetCollar-001"
#define MQTT_PASS "089430732zG"
#define DEVICE_ID "001"
```

## Vercel Deployment

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable from the "Production Environment" section above
5. Deploy the changes

## Notes

- `NEXT_PUBLIC_*` variables are exposed to the browser
- Regular environment variables are server-side only
- The MQTT credentials are the same for both web client and ESP32 firmware
- Make sure WiFi credentials in ESP32 firmware match your actual network settings 