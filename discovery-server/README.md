# PETG Discovery Server

## Overview
UDP-to-WebSocket relay server that enables browsers to receive collar discovery broadcasts.

## How it works
1. **Collar broadcasts UDP** → `UDP 47808` with `{"websocket_url": "ws://192.168.1.35:8080"}`
2. **Discovery server relays** → `ws://localhost:3001/discovery` 
3. **Web app receives** → Automatic connection to collar WebSocket

## Usage

### Start the discovery server:
```bash
cd discovery-server
npm install
npm run dev
```

### Expected output:
```
🚀 Starting PETG Discovery Server...
📡 UDP Listener: 0.0.0.0:47808
🔌 WebSocket Server: ws://localhost:3001/discovery
✅ UDP server listening on 0.0.0.0:47808
🔊 Waiting for collar announcements...
🎯 Discovery server ready!
```

### When collar broadcasts:
```
📡 Collar discovered: 192.168.1.35
   WebSocket: ws://192.168.1.35:8080
   Device: ESP32-S3_PetCollar
   Uptime: 123s
📤 Broadcasted to 1 client(s)
```

## Requirements
- Collar firmware broadcasting to UDP port 47808
- Web application connecting to `ws://localhost:3001/discovery`
- Both collar and server on same network

## Integration
The main web app automatically connects to this discovery server and will receive real-time collar announcements for seamless auto-connect functionality. 