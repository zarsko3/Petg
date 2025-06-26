@echo off
echo Starting PETG Discovery Server...
echo.
echo This server relays UDP collar broadcasts to WebSocket clients
echo UDP Port: 47808 (collar broadcasts)
echo WebSocket: ws://localhost:3001/discovery
echo.
cd /d "%~dp0"
npm run dev
pause
