# 🌐 Collar WebSocket Internet Tunnel Setup

Since Vercel can't reach private LAN IPs (like `192.168.1.35:8080`), we need to expose the collar's WebSocket to the internet.

## 🚀 Quick Setup Options

### Option A: ngrok (Fastest Test)

1. **Install ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or Windows: winget install ngrok
   ```

2. **Run tunnel**:
   ```bash
   # Navigate to your collar's machine and run:
   ngrok http 8080 --hostname collar.ngrok-free.app
   ```

3. **Copy the HTTPS URL** (e.g., `https://collar.ngrok-free.app`)

### Option B: Cloudflare Tunnel (Recommended for Production)

1. **Install cloudflared**:
   ```bash
   # Download from https://github.com/cloudflare/cloudflared/releases
   # Or Windows: winget install Cloudflare.cloudflared
   ```

2. **Run tunnel**:
   ```bash
   cloudflared tunnel run pet-collar --url ws://192.168.1.35:8080
   ```

3. **Copy the public URL** (e.g., `https://pet-collar.example.workers.dev`)

### Option C: Router Port Forward + DDNS

1. **Configure router** to forward port 443 → 192.168.1.35:8080
2. **Set up DDNS** (Dynamic DNS) for your home IP
3. **Install SSL certificate** using Let's Encrypt/certbot
4. **Result**: `wss://your-domain.dyndns.org`

## 🔧 Configuration Steps

### 1. Start Your Chosen Tunnel
Run one of the commands above and note the **public HTTPS URL**.

### 2. Update vercel.json
Replace the destination in `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/ws",
      "destination": "https://YOUR-TUNNEL-URL-HERE"
    }
  ]
}
```

**Examples**:
- ngrok: `"destination": "https://collar.ngrok-free.app"`
- Cloudflare: `"destination": "https://pet-collar.example.workers.dev"`
- Custom: `"destination": "https://collar.yourdomain.com"`

### 3. Environment Variables (Optional)
Set in your development environment:

```bash
# For development testing
COLLAR_TUNNEL_URL=https://collar.ngrok-free.app

# Or for direct LAN access in dev
COLLAR_IP=192.168.1.35
```

## 🧪 Testing the Tunnel

### 1. Test Direct Access
```bash
curl https://your-tunnel-url
# Should reach your collar's HTTP endpoint
```

### 2. Test WebSocket Upgrade
```javascript
const ws = new WebSocket('wss://your-tunnel-url');
ws.onopen = () => console.log('✅ Tunnel WebSocket works!');
```

### 3. Test Vercel Proxy
After deploying:
```javascript
const ws = new WebSocket('wss://your-app.vercel.app/ws');
ws.onopen = () => console.log('✅ Vercel proxy works!');
```

## 🔄 Connection Flow

```
Browser                    Vercel                     Tunnel                     Collar
wss://app.vercel.app/ws → /ws proxy → https://tunnel.com → ws://192.168.1.35:8080
```

## 🚨 Important Notes

- **ngrok**: Free tier has session limits - good for testing
- **Cloudflare**: More reliable for production use
- **Port Forward**: Most control but requires router configuration
- **Security**: Consider adding authentication to your tunnel endpoints

## 🔧 Troubleshooting

### Tunnel Connection Issues
- Ensure collar is running on `192.168.1.35:8080`
- Check firewall isn't blocking the tunnel client
- Verify tunnel URL is accessible from internet

### Vercel Proxy Issues
- Check `vercel.json` syntax is correct
- Ensure tunnel URL uses HTTPS (not HTTP)
- Look at Vercel function logs for proxy errors

### WebSocket Upgrade Issues
- Confirm tunnel supports WebSocket upgrades
- Check headers in `vercel.json` are correct
- Test direct tunnel connection first 