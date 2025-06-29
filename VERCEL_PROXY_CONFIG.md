# 🔄 Vercel WebSocket Proxy Configuration

This setup proxies WebSocket connections from HTTPS to the collar's plain WebSocket, eliminating mixed-content security issues.

## How It Works

1. **Client**: Connects to `wss://your-app.vercel.app/ws` (same origin)
2. **Vercel**: Proxies to `ws://192.168.1.35:8080` (collar's plain WebSocket)
3. **Collar**: Continues using plain WebSocket (no firmware changes needed)

## Configuration

### vercel.json
```json
{
  "rewrites": [
    {
      "source": "/ws",
      "destination": "http://192.168.1.35:8080"
    }
  ]
}
```

### Dynamic Collar IP Configuration

The `vercel.json` currently has a hardcoded IP `192.168.1.35:8080`. To make this dynamic:

#### Option 1: Environment Variable (Recommended)
```json
{
  "rewrites": [
    {
      "source": "/ws",
      "destination": "http://$COLLAR_IP:8080"
    }
  ]
}
```

Then set in Vercel dashboard:
- `COLLAR_IP=192.168.1.35`

#### Option 2: Multiple Environments
```json
{
  "rewrites": [
    {
      "source": "/ws/(.*)",
      "destination": "http://192.168.1.35:8080/$1"
    }
  ]
}
```

#### Option 3: Dynamic API Proxy
Create `/api/ws-proxy/route.ts` instead of static rewrites for full dynamic control.

## Benefits

✅ **No Mixed-Content Errors**: Browser sees same-origin WSS connection  
✅ **No CORS Issues**: All connections are same-origin  
✅ **No Firmware Changes**: Collar continues using plain WebSocket  
✅ **Automatic TLS**: Vercel handles HTTPS/WSS termination  
✅ **Simplified Client Code**: No IP discovery or protocol switching needed  

## Client Code

```typescript
// Before: Complex IP discovery and protocol switching
const wsUrl = await discoverCollarIP();
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const finalUrl = `${protocol}//${wsUrl}:8080`;

// After: Simple same-origin connection
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
```

## Deployment

1. Update `vercel.json` with your collar's IP
2. Deploy to Vercel
3. Test WebSocket connection in production

## Troubleshooting

- **Connection Failed**: Check collar IP in `vercel.json`
- **Proxy Not Working**: Ensure `vercel.json` is in project root
- **Still Getting Mixed-Content**: Clear browser cache and hard refresh 