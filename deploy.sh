#!/bin/bash
# Production Deployment Script for Petg Dashboard

echo "🚀 Deploying Petg Dashboard to Production..."

# 1. Install Node.js dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# 2. Start the discovery server
echo "🔍 Starting discovery server..."
cd discovery-server
npm install
nohup node server.js > ../discovery-server.log 2>&1 &
cd ..

# 3. Start the Next.js application
echo "🌐 Starting Next.js application..."
npm start > app.log 2>&1 &

echo "✅ Deployment complete!"
echo "🌐 Application running on http://localhost:3000"
echo "🔍 Discovery server running on port 3001"
echo "📝 Logs: app.log, discovery-server.log" 