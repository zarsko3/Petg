const dgram = require("dgram");
const { WebSocketServer } = require("ws");

// Configuration
const UDP_PORT = 47808;
const WS_PORT = 3001;

console.log("🚀 Starting PETG Discovery Server...");
console.log(`📡 UDP Listener: 0.0.0.0:${UDP_PORT}`);
console.log(`🔌 WebSocket Server: ws://localhost:${WS_PORT}/discovery`);

// Create UDP socket for listening to collar broadcasts
const udpServer = dgram.createSocket("udp4");

// Create WebSocket server for browser connections
const wss = new WebSocketServer({ 
  port: WS_PORT,
  path: "/discovery"
});

// Track connected WebSocket clients
let connectedClients = new Set();

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  console.log(`🔌 WebSocket client connected from ${req.socket.remoteAddress}`);
  connectedClients.add(ws);
  
  ws.on("close", () => {
    console.log("🔌 WebSocket client disconnected");
    connectedClients.delete(ws);
  });
  
  ws.on("error", (error) => {
    console.error("❌ WebSocket client error:", error.message);
    connectedClients.delete(ws);
  });
  
  // Send welcome message
  try {
    ws.send(JSON.stringify({
      type: "connected",
      message: "Discovery server connected",
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error("❌ Failed to send welcome message:", error.message);
  }
});

// Broadcast message to all connected WebSocket clients
function broadcastToClients(message) {
  if (connectedClients.size === 0) {
    return; // No clients connected
  }
  
  const messageStr = JSON.stringify(message);
  let successCount = 0;
  let failureCount = 0;
  
  connectedClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(messageStr);
        successCount++;
      } catch (error) {
        console.error("❌ Failed to send to client:", error.message);
        connectedClients.delete(ws);
        failureCount++;
      }
    } else {
      connectedClients.delete(ws);
      failureCount++;
    }
  });
  
  if (successCount > 0) {
    console.log(`📤 Broadcasted to ${successCount} client(s)`);
  }
  if (failureCount > 0) {
    console.log(`⚠️ Failed to send to ${failureCount} client(s)`);
  }
}

// UDP message handling
udpServer.on("message", (buffer, remote) => {
  try {
    const message = buffer.toString();
    const data = JSON.parse(message);
    
    // Check if this is a Pet Collar broadcast
    if (data.device_type === "ESP32-S3_PetCollar" && data.websocket_url) {
      console.log(`📡 Collar discovered: ${data.ip_address || remote.address}`);
      console.log(`   WebSocket: ${data.websocket_url}`);
      console.log(`   Device: ${data.device_name || "Unknown"}`);
      console.log(`   Uptime: ${data.uptime || 0}s`);
      
      // Relay to WebSocket clients with the expected format
      const relayMessage = {
        type: "collar_discovered",
        ws: data.websocket_url,  // The key format expected by the client
        websocket_url: data.websocket_url,
        ip_address: data.ip_address || remote.address,
        device_name: data.device_name,
        device_type: data.device_type,
        uptime: data.uptime,
        battery_percent: data.battery_percent,
        signal_strength: data.signal_strength,
        timestamp: Date.now(),
        source: "udp_broadcast"
      };
      
      broadcastToClients(relayMessage);
      
    } else {
      // Log non-collar UDP traffic (optional debug)
      console.log(`📡 UDP packet from ${remote.address}:${remote.port} (not a collar)`);
    }
    
  } catch (error) {
    // Ignore non-JSON messages (normal for network traffic)
    console.log(`📡 Non-JSON UDP packet from ${remote.address}:${remote.port}`);
  }
});

// UDP server event handlers
udpServer.on("listening", () => {
  const address = udpServer.address();
  console.log(`✅ UDP server listening on ${address.address}:${address.port}`);
  console.log("🔊 Waiting for collar announcements...");
});

udpServer.on("error", (error) => {
  console.error("❌ UDP server error:", error.message);
  process.exit(1);
});

// WebSocket server event handlers
wss.on("error", (error) => {
  console.error("❌ WebSocket server error:", error.message);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down discovery server...");
  
  // Close WebSocket server
  wss.close(() => {
    console.log("✅ WebSocket server closed");
  });
  
  // Close UDP server
  udpServer.close(() => {
    console.log("✅ UDP server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n🛑 SIGTERM received, shutting down...");
  process.exit(0);
});

// Start the UDP server
try {
  udpServer.bind(UDP_PORT, "0.0.0.0");
} catch (error) {
  console.error("❌ Failed to start UDP server:", error.message);
  process.exit(1);
}

console.log("🎯 Discovery server ready!");
console.log("   To test: Connect collar to WiFi and check for broadcasts");
console.log("   WebSocket URL: ws://localhost:3001/discovery");
