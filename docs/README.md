# NCM Business Portfolio

![NCM Business Portfolio](https://i.imgur.com/uZshILa.png)
![NCM Business Portfolio - Dashboard](https://i.imgur.com/QKlIlvQ.png)
![NCM Business Portfolio - Dashboard Bright](https://i.imgur.com/F8RVRH9.png)

A modern business portfolio application built with Next.js 14, Clerk Authentication, TailwindCSS, and shadcn/ui components.

## 🚀 Features

- **Modern UI/UX**: Beautiful, responsive design with glassmorphism effects
- **Authentication**: Secure user authentication powered by Clerk
- **Dashboard Analytics**: Interactive charts and visualization
- **Project Management**: Create and manage project portfolios
- **Theme Support**: Dark/Light mode toggle
- **Mobile-First Design**: Fully responsive interface for all devices

## 🧰 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Authentication**: [Clerk](https://clerk.dev/) 
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: Recharts-based custom components
- **Icons**: [Lucide React](https://lucide.dev/)
- **Fonts**: Google Outfit font
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas/database)

## 📦 Installation

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Git
- MongoDB Atlas account
- Clerk account

### Recommended Development Tools

For the best development experience, we recommend using one of these AI-powered tools:

- [Cursor](https://cursor.sh/) - AI-powered code editor
- [GitHub Copilot](https://github.com/features/copilot) - AI pair programmer
- [Windsurf](https://www.phind.com/blog/code-editor) - AI coding assistant

These tools will help you understand and modify the codebase more efficiently.

### Step-by-Step Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/ncm-business-portfolio.git
cd ncm-business-portfolio
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up Clerk Authentication**

   a. Create a [Clerk account](https://clerk.dev/sign-up) if you don't have one
   
   b. Create a new application:
      - Go to the Clerk Dashboard and click "Add Application"
      - Enter a name for your application
      - Select "Next.js" as the framework
   
   c. Configure your application:
      - In the Clerk Dashboard, go to your application
      - Go to "API Keys" in the sidebar
      - You'll find your "Publishable Key" and "Secret Key"
      - Copy these keys for your environment variables
   
   d. Configure sign-in options (optional):
      - In the Clerk Dashboard, go to "Authentication" → "Social Connections"
      - Enable the social login providers you want to support (e.g., Google, GitHub)
      - Follow the instructions to set up each provider
   
   e. Set up redirect URLs:
      - In "Authentication" → "Redirects", set the following:
        - Sign-in: `/sign-in`
        - Sign-up: `/sign-up`
        - After sign-in: `/dashboard`
        - After sign-up: `/dashboard`

4. **Set up MongoDB Atlas**

   a. Create a [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas/register) if you don't have one
   
   b. Create a new project and cluster (the free tier works perfectly)
   
   c. Set up database access:
      - Create a database user with password authentication
      - Remember to save these credentials securely
   
   d. Set up network access:
      - Add your current IP address to the IP Access List
      - For development, you can allow access from anywhere (0.0.0.0/0)
   
   e. Get your connection string:
      - Go to your cluster and click "Connect"
      - Select "Connect your application"
      - Copy the connection string (it will look like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
      - Replace `<password>` with your database user's password

5. **Set up environment variables**

Create a `.env.local` file in the root directory with the following variables:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# MongoDB Atlas
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=your_database_name
```

6. **Run the development server**

```bash
npm run dev
# or
yarn dev
```

7. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Key Pages

- **Dashboard** (`/dashboard`): Main overview with statistics and project summaries
- **Projects** (`/projects`): Project listing and management
- **Analytics** (`/analytics`): Detailed analytics with interactive charts
- **Settings** (`/settings`): User profile and application settings

## 🌟 Custom Components

The application features several custom components:

- **Charts**: Area, Bar, Line and Pie charts with responsive design
- **Header**: Responsive navigation with mobile drawer
- **Theme Toggle**: Light/Dark mode switcher
- **Cards**: Beautiful glassmorphism-style cards for content display

## 📱 Responsive Design

The application is built with a mobile-first approach and includes:

- Responsive navigation (collapsible sidebar on mobile)
- Fluid layouts that adapt to any screen size
- Optimized content display for different devices

## 🧩 Project Structure

```
ncm-business-portfolio/
├── public/              # Static assets
├── src/
│   ├── app/             # App router pages
│   │   ├── dashboard/   # Dashboard page
│   │   ├── projects/    # Projects page
│   │   ├── analytics/   # Analytics page
│   │   ├── settings/    # Settings page
│   │   └── ...
│   ├── components/      # Reusable components
│   │   ├── charts/      # Chart components
│   │   ├── ui/          # shadcn/ui components
│   │   └── ...
│   ├── lib/             # Utility functions and shared logic
│   └── models/          # MongoDB schema models
├── next.config.ts       # Next.js configuration
├── tailwind.config.js   # TailwindCSS configuration
└── ...
```

## 🚀 Deployment

This application can be easily deployed on:

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Railway](https://railway.app/)

## 🔒 Authentication Flow

The authentication is handled by Clerk and includes:

- Sign up/Sign in pages
- Protected routes
- User profile management
- Authentication middleware

### Understanding Clerk Authentication

Once set up, Clerk provides:

1. **Pre-built components**: `<SignIn />`, `<SignUp />`, `<UserProfile />`, etc.
2. **Auth hooks**: `useAuth()`, `useUser()`, etc. for accessing user data
3. **Middleware**: Protects routes based on authentication status
4. **Server-side helpers**: For accessing user data in server components

Example of protecting a route:
```jsx
// In your route component
import { auth } from "@clerk/nextjs";

export default function ProtectedPage() {
  const { userId } = auth();
  
  if (!userId) {
    // Handle unauthenticated state
    redirect("/sign-in");
  }
  
  // Render content for authenticated users
}
```

## 🧪 Extending the Project

To add new features to the project:

1. For new pages, create folders in the `src/app` directory
2. For new components, add them to the `src/components` directory
3. For database integrations, set up MongoDB models in the `src/models` directory

## 🌈 Customization

Customize the look and feel of the application:

- Edit `tailwind.config.js` to change theme colors
- Modify `src/app/layout.tsx` to update global layout
- Update fonts and styles in the theme configuration

## 👤 About the Developer

Created with 💜 by [Yuval Avidani](https://linktr.ee/yuvai), AI Builder & Speaker

- X: [@yuvalav](https://x.com/yuvalav)
- Instagram: [@yuval_770](https://instagram.com/yuval_770)
- Blog: [https://petg.com](https://petg.com)

> "Track Your Pet with PETG"

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

# PetCollar Smart Collar Project

## Overview
The PetCollar project is an ESP32-based smart collar for pets that provides proximity alerts, position tracking, and web connectivity. The system uses Bluetooth Low Energy (BLE) beacons to detect when a pet is near restricted zones and alerts the owner.

## Hardware Requirements
- ESP32 microcontroller
- SSD1306 OLED display (128x34 pixels)
- Buzzer (connected to pin 25)
- Vibration motor (connected to pin 26)
- Battery voltage monitoring circuit (connected to pin 34)
- BLE beacons configured with name "PetZone"

## Project Structure
The project is organized into the following components:

### Core Files
- `PetCollar.ino` - Main application file
- `micro_config.h` - Configuration settings and constants
- `micro_alert_manager.h` - Alert system (buzzer/vibration)
- `micro_ble_scanner.h` - BLE beacon scanning and detection
- `micro_triangulator.h` - Position triangulation using multiple beacons
- `micro_display_manager.h/cpp` - OLED display management

### Advanced Modules Directory (`PetCollar_Modules/`)
- `micro_battery_manager.h` - Battery monitoring and power management
- `micro_web_integration.h` - WiFi and API connectivity
- `micro_settings_manager.h` - Non-volatile settings storage
- `micro_ota_manager.h` - Over-the-air firmware updates
- `modules.h` - Helper to include and initialize all modules

## Features
- **Proximity Detection**: Detects when pet is near BLE beacons and alerts
- **Position Tracking**: Calculates position using triangulation from multiple beacons
- **Battery Management**: Monitors battery level and implements power-saving features
- **Web Connectivity**: Sends data to a backend API and receives configuration updates
- **OTA Updates**: Supports remote firmware updates
- **Persistent Settings**: Stores configuration in non-volatile memory

## Setup and Configuration
1. Flash the firmware to an ESP32 device
2. Connect the required hardware components
3. Use serial commands to configure the device:
   - `set_wifi <ssid> <password>` - Configure WiFi connection
   - `set_device <id> <token>` - Set device ID and API token
   - `set_alert_mode <0-3>` - Set alert mode (0=off, 1=buzzer, 2=vibration, 3=both)

## Web Integration
The device can connect to a backend API to:
- Upload beacon proximity data
- Upload pet position data
- Receive configuration updates
- Check for and download firmware updates

### API Endpoints
- `https://api.petg.example.com/device/data` - Data upload endpoint
- `https://api.petg.example.com/firmware/version` - Firmware version check

## Serial Commands
- `list_beacons` - List all detected beacons
- `set_alert_mode <mode>` - Set alert mode (0-3)
- `set_threshold <value>` - Set proximity threshold
- `get_position` - Show current position
- `get_battery` - Show battery status
- `set_wifi <ssid> <password>` - Set WiFi credentials
- `set_device <id> <token>` - Set device identification
- `force_upload` - Force data upload to server
- `check_update` - Check for firmware updates
- `start_update` - Start firmware update if available
- `sleep` - Enter deep sleep mode
- `display_on/off` - Control display power
- `get_json` - Get data in JSON format
- `factory_reset` - Reset device to factory settings
- `help` - Show this help

## Button Controls
- Short press (<1s) - Cycle alert mode
- Medium press (1-3s) - Change display page
- Long press (3-6s) - Toggle auto-scroll
- Very long press (>6s) - Check for updates/upload data or enter sleep mode

## Display Pages
1. Status - Shows basic status information
2. Beacons - Lists detected beacons with signal strength
3. Position - Shows calculated position coordinates
4. System - Shows battery and connectivity status

## Development
To extend the project:
1. Add new modules in the `PetCollar_Modules` directory
2. Update the `modules.h` file to include and initialize your module
3. Add new functionality to the main application file

# ESP32 Pet Collar

A smart pet collar project based on ESP32 with BLE tracking, web integration, and WebSocket support.

## Features

- BLE beacon scanning and proximity detection
- Position triangulation using multiple beacons
- Configurable alert modes (buzzer, vibration, or both)
- Web interface for monitoring collar status
- WebSocket support for real-time data streaming
- OTA firmware updates
- Battery management and power saving

## Prerequisites

### Hardware
- ESP32 development board
- OLED display (SSD1306)
- Buzzer and vibration motor (optional)
- BLE beacons for tracking

### Software
- Arduino IDE 1.8.0 or later
- ESP32 Arduino Core

## Required Libraries

1. **WebSockets** by Markus Sattler
   - Install via Arduino Library Manager: Search for "WebSockets" by Markus Sattler
   - Or install manually: https://github.com/Links2004/arduinoWebSockets

2. **ArduinoJson** by Benoit Blanchon
   - Install via Arduino Library Manager: Search for "ArduinoJson"

3. **ESP32 BLE Arduino** (comes with ESP32 Arduino Core)

## Installation

1. Install the ESP32 Arduino Core following the instructions at:
   https://github.com/espressif/arduino-esp32/blob/master/docs/arduino-ide/boards_manager.md

2. Install the required libraries listed above

3. Clone or download this repository

4. Open the PetCollar.ino file in Arduino IDE

5. Configure your board in Tools > Board > ESP32 Arduino

6. Select the correct COM port in Tools > Port

7. Compile and upload the code to your ESP32 board

## Memory Configuration

If you encounter "text section exceeds available space in board" error:
1. Go to Tools → Partition Scheme
2. Select "Huge APP (3MB No OTA/1MB SPIFFS)" or "Minimal SPIFFS"

## Usage

1. After uploading the code, open the Serial Monitor (115200 baud)

2. Set up WiFi connection:
   ```
   set_wifi YOUR_SSID YOUR_PASSWORD
   ```

3. Check WiFi status:
   ```
   wifi_status
   ```
   This will show the IP address for the web interface and WebSocket URL

4. Access the web interface by navigating to the displayed IP address in a browser

5. For WebSocket connection from a web app, use the WebSocket URL:
   ```
   ws://ESP32_IP_ADDRESS:81
   ```

## WebSocket Integration

The collar now supports WebSocket connections to stream real-time data to a web application. This allows for:

- Live updates of collar position
- Real-time proximity alerts
- Battery status monitoring
- System state changes

To connect to the WebSocket server from your web application:

```javascript
const socket = new WebSocket('ws://ESP32_IP_ADDRESS:81');

socket.onopen = () => {
  console.log('WebSocket connected');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Process data updates
  console.log('Received data:', data);
};

socket.onclose = () => {
  console.log('WebSocket disconnected');
};
```

## Troubleshooting

### Common Issues

#### 1. Collar Not Connecting to WiFi
```bash
# Check serial monitor output
# Should see "WiFi connected" and IP address
# If not connecting, verify credentials:
set_wifi "YourNetworkName" "YourPassword"
```

#### 2. WebSocket Connection Failed
**Symptoms:** Web app shows "Connection Error" when trying to connect to collar

**Troubleshooting Steps:**
1. **Verify collar is connected to WiFi:**
   ```bash
   wifi_status
   # Should show: "WiFi connected - IP: 192.168.x.x"
   ```

2. **Check WebSocketsServer library:**
   - Ensure "WebSockets by Markus Sattler" library is installed
   - Version should be 2.3.x or newer
   - Without this library, collar compiles but WebSocket fails silently

3. **Test WebSocket server manually:**
   - Use the "Test" button in the web interface
   - Check browser console (F12) for detailed error messages
   - Common error messages and solutions:
     ```
     "WebSocket connection failed" → Check IP address and port
     "Connection refused" → Collar not responding (power/WiFi issue)
     "Connection timeout" → Network/firewall blocking port 8080
     ```

4. **Network connectivity:**
   ```bash
   # From your computer, ping the collar IP:
   ping 192.168.x.x
   # Should get responses if on same network
   ```

5. **Port accessibility:**
   - Collar serves WebSocket on port 8080
   - Check if firewall is blocking this port
   - Try connecting from same device that can ping the collar

6. **WebSocket URL format:**
   ```
   ✅ Correct:   ws://192.168.1.100:8080
   ❌ Wrong:     http://192.168.1.100:8080
   ❌ Wrong:     192.168.1.100:8080
   ❌ Wrong:     wss://192.168.1.100:8080 (secure WebSocket not supported)
   ```

#### 3. Data Not Updating
**Symptoms:** Connected but no real-time data visible

**Solutions:**
- Data updates every 500ms (WEBSOCKET_UPDATE_INTERVAL)
- Check browser console for JSON parsing errors
- Verify collar is actively scanning for beacons (needs PetZone beacons running)

#### 4. Commands Not Working
**Symptoms:** Control buttons don't trigger collar responses

**Solutions:**
- Check WebSocket connection is active (green status)
- Verify command format in browser console
- Collar should log received commands in serial monitor
- Test with simple command: "trigger_alert"

### Serial Monitor Commands

For troubleshooting, use these commands in the Arduino IDE Serial Monitor:

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# Pet Collar & Beacon System

A comprehensive pet tracking system with ESP32-based collar and beacon devices, plus a Next.js web application for monitoring and control.

## 🚀 Quick Setup Guide

### **Step 1: Flash Beacon Devices**
1. Open `BeaconDevice/BeaconDevice.ino` in Arduino IDE
2. Select ESP32 board and appropriate port
3. Flash to at least 3 ESP32 devices for triangulation
4. Place beacons in different rooms/locations

### **Step 2: Configure Collar Device**
1. Open `PetCollar/PetCollar.ino` in Arduino IDE
2. Flash to ESP32 collar device
3. Open Serial Monitor (115200 baud)
4. Configure WiFi: `set_wifi YOUR_SSID YOUR_PASSWORD`
5. Set device ID: `set_device PETCOLLAR001 your_token_here`
6. Check connection: `wifi_status`

### **Step 3: Start Web Application**
```bash
npm install
npm run dev
```

### **Step 4: Connect Web App to Collar**
1. Open http://localhost:3000/settings
2. Update WebSocket URL to your collar's IP (shown in serial monitor)
3. Example: `ws://192.168.1.100:8080`
4. The connection status should show "Connected"

## 🔧 Troubleshooting

### Collar Not Connecting to Web App
1. **Check WiFi**: Use `wifi_status` command in serial monitor
2. **Verify IP**: Note the IP address from `wifi_status` output
3. **Update WebSocket URL**: Use the collar's IP in settings page
4. **Check Network**: Ensure collar and computer are on same network

### No Beacons Detected
1. **Verify Beacon Power**: LED should blink on beacon devices
2. **Check Distance**: Beacons should be within ~10 meters
3. **Serial Debug**: Use `list_beacons` command to see detected devices
4. **Restart Scan**: Use `factory_reset` if needed

### WebSocket Connection Failed
1. **Firewall**: Check if port 8080 is blocked
2. **Network**: Ensure devices are on same subnet
3. **Restart**: Power cycle the collar device
4. **Serial Commands**: Use `wifi_status` to verify connectivity

## 📡 Serial Commands

Connect to collar via serial monitor (115200 baud):

### WiFi & Network
- `set_wifi SSID PASSWORD` - Configure WiFi credentials
- `wifi_status` - Check connection status and IP address
- `set_device ID TOKEN` - Set device identification

### Beacon & Position
- `list_beacons` - Show all detected beacons
- `get_position` - Display current calculated position
- `set_threshold VALUE` - Set proximity alert threshold (-65 default)

### Alert System
- `set_alert_mode MODE` - Set alert mode (0=none, 1=buzzer, 2=vibration, 3=both)
- `test_buzzer` - Test buzzer functionality
- `set_frequency HZ` - Set buzzer frequency
- `set_volume LEVEL` - Set buzzer volume (0-255)
- `set_vibration LEVEL` - Set vibration intensity (0-255)

### System
- `get_battery` - Show battery status
- `force_upload` - Upload data to web app immediately
- `factory_reset` - Reset all settings
- `help` - Show all available commands

## 🏗️ System Architecture

### Hardware Components
- **Collar Device**: ESP32 with OLED display, buzzer, vibration motor
- **Beacon Devices**: ESP32 devices broadcasting BLE signals
- **Web Application**: Next.js app for monitoring and control

### Communication Flow
1. **Beacons** → BLE advertising → **Collar** (proximity detection)
2. **Collar** → WiFi/HTTP → **Web App** (data upload)
3. **Web App** → WebSocket → **Collar** (real-time control)

### Key Features
- Real-time pet location tracking via triangulation
- Proximity alerts when pet approaches beacons
- Remote control via web interface
- Battery monitoring and power management
- Over-the-air firmware updates

## 🔌 Hardware Connections

### Collar Device (ESP32)
```
Pin 25 → Buzzer positive
Pin 26 → Vibration motor positive
Pin 2  → Status LED
Pin 0  → Button (with pullup)
Pin 21 → OLED SDA
Pin 22 → OLED SCL
Pin 34 → Battery voltage divider (optional)
```

### Beacon Device (ESP32)
```
Pin 2  → Status LED
Pin 0  → Button (with pullup)
```

## 🌐 Web App Features

### Real-time Dashboard
- Live collar connection status
- Battery level monitoring
- Beacon detection display
- System state indicators

### Remote Control
- Trigger alerts manually
- Change alert modes
- Adjust buzzer/vibration settings
- Monitor beacon proximity

### Settings Management
- WebSocket URL configuration
- Alert preferences
- Notification settings

## 📊 API Endpoints

### Collar Data Upload
```
POST /api/collar/data
Headers:
  X-Device-ID: PETCOLLAR001
  X-Device-Token: your_token_here
Content-Type: application/json
```

### WebSocket Commands
```javascript
// Trigger alert
{ "command": "trigger_alert", "reason": "Manual Alert", "duration": 5000 }

// Set alert mode
{ "command": "set_alert_mode", "mode": 1 }

// Adjust settings
{ "command": "set_buzzer_frequency", "frequency": 2000 }
{ "command": "set_vibration_intensity", "intensity": 128 }
```

## 🔒 Security Notes

- Change default device tokens in production
- Use HTTPS for API endpoints in production
- Implement proper authentication for web interface
- Consider encrypting WebSocket communications

## 📝 Development Notes

### ESP32 Memory Configuration
If you encounter "text section exceeds available space" error:
1. Go to Tools → Partition Scheme
2. Select "Huge APP (3MB No OTA/1MB SPIFFS)"

### Required Libraries
- ESP32 Arduino Core
- ArduinoJson
- Adafruit SSD1306
- BLE libraries (included with ESP32 core)

## 🐛 Known Issues

1. **WebSocket Reconnection**: May require manual reconnection after collar restart
2. **Beacon Range**: Limited to ~10 meter range for reliable detection
3. **Battery Monitoring**: Requires voltage divider circuit for accurate readings
4. **Triangulation Accuracy**: Requires at least 3 beacons for position calculation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Test with actual hardware
4. Submit pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details

### Arduino Libraries Required

Install these libraries through the Arduino IDE Library Manager:

1. **WiFi** (built-in ESP32 library)
2. **HTTPClient** (built-in ESP32 library)
3. **ArduinoJson** by Benoit Blanchon (version 6.x)
4. **WebSocketsServer** by Markus Sattler ⚠️ **CRITICAL**
5. **ESP32Servo** by Kevin Harrington (if using servo features)
6. **Adafruit SSD1306** and **Adafruit GFX Library** for OLED display

**⚠️ Important:** The `WebSocketsServer` library is essential for collar communication. Without it, the collar will compile but WebSocket connections will fail.

**Installation Steps:**
1. Open Arduino IDE
2. Go to `Tools > Manage Libraries...`
3. Search for "WebSockets by Markus Sattler"
4. Install the latest version (usually 2.3.x or newer)

### Web Application Setup

## 📱 Device Overview

This system consists of multiple hardware components:

### 🦮 Pet Collar (ESP32)
- **Location**: `PetCollar/PetCollar.ino`
- **Features**: GPS tracking, BLE scanning, accelerometer, vibration alerts, WiFi connectivity
- **Communication**: WebSocket server, HTTP API endpoints
- **Purpose**: Main tracking device attached to pet's collar

### 📍 Indoor Beacons (ESP32)
- **Location**: `BeaconDevice/BeaconDevice.ino`
- **Features**: BLE advertising, battery monitoring, location metadata
- **Communication**: Bluetooth Low Energy (BLE) broadcasting
- **Purpose**: Indoor positioning reference points for triangulation

### 📹 Camera Beacons (ESP32-CAM)
- **Location**: `CameraBeacon/CameraBeacon.ino`
- **Features**: Live video streaming, BLE broadcasting, WiFi connectivity, snapshot capture
- **Communication**: HTTP video streams, WebSocket status, BLE advertising
- **Purpose**: Visual monitoring combined with positioning data
- **Setup Guide**: `CameraBeacon/README_Hebrew.md` (Hebrew) / `BeaconDevice/README.md` (English)

### 🌐 Web Application (Next.js)
- **Location**: `src/` directory
- **Features**: Real-time tracking, device management, camera feeds, data visualization
- **Communication**: WebSocket connections, REST API
- **Purpose**: User interface for monitoring and controlling the pet tracking system
