# Real-Time Data Integration

This document describes how the PETG Dashboard integrates real-time collar data with fallback to demo data when the collar is disconnected.

## Overview

The dashboard now dynamically switches between real collar data and demo data based on the collar's connection status. This ensures a seamless user experience whether the collar is online or offline.

## Key Features

### 🔄 Automatic Data Switching
- **Connected**: Displays real-time data from the collar
- **Disconnected**: Falls back to demo data as placeholder
- **Error**: Gracefully handles connection errors with demo data

### 📊 Real-Time Metrics
When the collar is connected, the dashboard displays:
- **Battery Level**: Real-time battery percentage and status
- **Last Seen**: Actual timestamp of last collar communication
- **Signal Strength**: Current WiFi/connection strength
- **Activity Level**: Live activity percentage and status
- **Temperature**: Collar temperature readings (if available)
- **Daily Statistics**: Real activity, rest, and sleep time data
- **Alert Status**: Live alert notifications from the collar

### 🎯 Smart Data Transformation
The system intelligently maps various collar data formats:
```typescript
// Flexible field mapping
battery_level: rawData.battery_level || rawData.battery || rawData.power
signal_strength: rawData.signal_strength || rawData.rssi || rawData.wifi_strength
last_seen: rawData.last_seen || rawData.timestamp || new Date().toISOString()
```

## Implementation Details

### Custom Hook: `useCollarData`
Located in `src/hooks/useCollarData.ts`, this hook manages:
- Periodic data fetching (5-second intervals)
- Connection status monitoring
- Automatic fallback to demo data
- Error handling and recovery

### Utility Functions
Located in `src/lib/utils.ts`, providing:
- Time formatting (`formatTimeAgo`, `formatLastSeen`)
- Battery level styling (`getBatteryColor`, `getBatteryGradient`)
- Signal strength interpretation (`getSignalStrengthText`)
- Status color coding (`getStatusColor`, `getStatusBadgeColor`)

### Connection Status Component
Located in `src/components/connection-status.tsx`:
- Reusable connection indicator
- Visual status representation
- Error state handling

## Dashboard Integration

### Main Dashboard (`src/app/page.tsx`)
The main dashboard now includes:

1. **Connection Status Indicator**
   - Green: Collar connected with real data
   - Yellow: Demo mode (collar disconnected)
   - Red: Connection error

2. **Real-Time Activity Tracker**
   - Uses actual activity levels when available
   - Generates realistic variations around real data
   - Falls back to demo patterns when disconnected

3. **Live Power Status**
   - Real battery percentage and color coding
   - Actual "Last Seen" timestamps
   - Dynamic battery gradient based on level

4. **Connection Metrics**
   - Real signal strength assessment
   - Actual response times
   - Temperature readings (when available)

5. **Daily Statistics**
   - Real activity, rest, and sleep time data
   - Percentage calculations based on 24-hour periods
   - Formatted duration displays

## Data Flow

```
Collar Device → API Proxy → useCollarData Hook → Dashboard Components
     ↓              ↓              ↓                    ↓
Real Data → Transformation → State Management → UI Updates
     ↓              ↓              ↓                    ↓
Connection → Error Handling → Demo Fallback → Seamless UX
```

## API Endpoints

### `/api/collar-status`
- Returns connection status and discovery information
- Used for determining if collar is available
- Includes response time and IP address details

### `/api/collar-proxy?endpoint=/data`
- Proxies requests to the collar device
- Handles automatic discovery and reconnection
- Returns transformed collar data

## Configuration

### Refresh Interval
Default: 5 seconds (configurable in `useCollarData` hook)
```typescript
const { data, status, isConnected } = useCollarData(5000); // 5 seconds
```

### Demo Data
Comprehensive fallback data defined in `useCollarData.ts`:
```typescript
const DEMO_DATA: CollarData = {
  device_id: 'DEMO_COLLAR_001',
  battery_level: 74.1,
  status: 'active',
  // ... more demo fields
};
```

## Visual Indicators

### Connection Status
- **🟢 Green**: Real-time data active
- **🟡 Yellow**: Demo mode active
- **🔴 Red**: Connection error

### Data Freshness
- Last update timestamp shown
- "Real-time data" vs "Demo data" labels
- Refresh button with loading state

### Battery Status
- Color-coded based on level (green > 50%, yellow > 20%, red < 20%)
- Dynamic gradient fills
- Real percentage displays

## Error Handling

The system gracefully handles:
- Network timeouts
- Collar discovery failures
- Data parsing errors
- API endpoint failures

All errors result in seamless fallback to demo data, ensuring the dashboard remains functional.

## Future Enhancements

Potential improvements:
- WebSocket integration for real-time streaming
- Historical data caching
- Offline data synchronization
- Advanced error recovery strategies
- Custom refresh intervals per data type

## Testing

To test the integration:
1. **With Collar Connected**: Verify real data displays and updates
2. **Without Collar**: Confirm demo mode activation
3. **Connection Loss**: Test graceful fallback behavior
4. **Error States**: Verify error handling and recovery

The dashboard should provide a consistent experience regardless of collar connectivity status. 