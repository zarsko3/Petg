# Pet Collar Mobile App

A modern, mobile-first React Native/Next.js web application for monitoring and controlling smart pet collar systems. Built with React 18, Next.js 15, and optimized exclusively for mobile devices.

## 🚀 Features

### Core Pages
- **Welcome Screen**: Beautiful onboarding with Clerk authentication
- **Dashboard**: Real-time collar statistics and pet status
- **Location Tracking**: Interactive indoor map with live video feed
- **Activity Monitoring**: Detailed activity analytics and health metrics
- **Settings**: Collar configuration and app preferences

### Mobile-First Design
- ✅ Touch-optimized interactions
- ✅ iOS/Android safe areas support
- ✅ Bottom navigation for easy thumb access
- ✅ Swipe gestures and mobile animations
- ✅ Responsive layouts for all screen sizes
- ✅ PWA-ready for home screen installation

## 🛠 Tech Stack

### Frontend
- **React 18** - Latest React with concurrent features
- **Next.js 15** - App Router with server components
- **TypeScript** - Full type safety
- **TailwindCSS** - Utility-first styling
- **Shadcn/UI** - Modern component library

### Authentication
- **Clerk** - Secure authentication with social providers
- Guest mode support for demonstration

### Maps & Location
- **Leaflet** - Lightweight mapping library
- **React-Leaflet** - React integration for maps
- Custom indoor map implementation
- Real-time beacon tracking

### Real-time Communication
- **WebSocket** - Live collar data streaming
- **Custom Mobile WebSocket Service** - Mobile-optimized connection handling
- Automatic reconnection with backoff
- Toast notifications for alerts

### Icons & UI
- **Lucide React** - Modern icon library
- **Next Themes** - Dark/light mode support
- **Sonner** - Beautiful toast notifications

## 📱 Mobile App Structure

```
src/app/mobile/
├── layout.tsx              # Mobile-specific layout
├── page.tsx                # Welcome screen
├── dashboard/page.tsx      # Main dashboard
├── location/page.tsx       # Location tracking
├── activity/page.tsx       # Activity analytics
├── settings/page.tsx       # Settings & configuration
└── mobile-globals.css      # Mobile-specific styles

src/components/mobile/
├── mobile-navigation.tsx   # Bottom tab navigation
├── mobile-header.tsx       # Reusable header component
└── leaflet-map.tsx         # Indoor mapping component

src/lib/
├── mobile-websocket.ts     # WebSocket service
└── mobile-utils.ts         # Mobile utilities

src/hooks/
└── useMobileWebSocket.ts   # React hooks for WebSocket
```

## 🎨 Design System

### Color Scheme
- **Primary**: Purple (#7c3aed) - Brand color for actions
- **Secondary**: Blue (#3b82f6) - Information and maps
- **Success**: Green (#10b981) - Positive states
- **Warning**: Yellow (#f59e0b) - Alerts and notifications
- **Error**: Red (#ef4444) - Errors and critical alerts

### Mobile Optimizations
- **Touch Targets**: Minimum 44px tap targets
- **Safe Areas**: iOS notch and home indicator support
- **Gestures**: Swipe navigation and pull-to-refresh
- **Typography**: Optimized font sizes for mobile reading
- **Spacing**: Mobile-appropriate spacing scale

## 🔌 Real-time Features

### WebSocket Integration
The mobile app uses a custom WebSocket service optimized for mobile connections:

```typescript
// Subscribe to real-time updates
const { isConnected, latestData } = useMobileWebSocket()

// Get collar data with fallback to demo mode
const { data, refetch } = useMobileCollarData(3000)
```

### Supported Real-time Events
- **Status Updates**: Battery, signal strength, temperature
- **Location Updates**: Real-time position tracking
- **Activity Updates**: Movement and exercise data
- **Alert System**: Push notifications for collar events
- **Battery Monitoring**: Low battery warnings

## 📍 Location Features

### Indoor Mapping
- **Beacon Network**: BLE beacon position tracking
- **Interactive Map**: Touch-enabled Leaflet map
- **Real-time Positioning**: Live pet location updates
- **Room Detection**: Automatic room identification
- **Safety Zones**: Geofenced safe areas

### Video Integration
- **Live Camera Feed**: ESP32-CAM integration ready
- **Mobile Video Player**: Touch controls and fullscreen
- **Connection Status**: Real-time streaming indicators
- **Bandwidth Optimization**: Mobile-optimized streaming

## ⚙️ Configuration

### Environment Variables
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_WEBSOCKET_URL=ws://your-collar-ip:3001
```

### Mobile-Specific Settings
```typescript
// Mobile layout configuration
const mobileConfig = {
  safeAreaInsets: true,
  bottomNavigation: true,
  swipeGestures: true,
  vibrationFeedback: true,
  pushNotifications: true
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Clerk account (free tier available)
- ESP32-S3 collar hardware (optional for demo mode)

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Clerk keys

# Start development server
npm run dev
```

### Mobile Testing
```bash
# Test on mobile device (same network)
npm run dev -- --hostname 0.0.0.0

# Or use ngrok for external testing
npx ngrok http 3000
```

## 📱 PWA Features

### Progressive Web App
- **Installable**: Add to home screen
- **Offline Support**: Cached resources
- **Push Notifications**: Background alerts
- **App-like Experience**: Native feel

### Service Worker
- Cache-first strategy for static assets
- Network-first for real-time data
- Background sync for offline actions
- Push notification handling

## 🔒 Security

### Authentication
- JWT token management
- Secure session handling
- Guest mode with limited access
- Automatic token refresh

### WebSocket Security
- WSS for production (HTTPS)
- Connection authentication
- Message validation
- Rate limiting protection

## 🎯 Performance

### Mobile Optimizations
- **Bundle Splitting**: Code splitting for faster loads
- **Image Optimization**: Next.js automatic optimization
- **Lazy Loading**: Component-based lazy loading
- **Caching**: Aggressive caching strategies
- **Compression**: Gzip/Brotli compression

### Memory Management
- Component cleanup on unmount
- WebSocket connection pooling
- Image memory optimization
- Background task management

## 🧪 Testing

### Mobile Testing Strategy
```bash
# Unit tests
npm run test

# Mobile device testing
npm run dev:mobile

# PWA testing
npm run build && npm run start
```

### Browser Testing
- **Chrome DevTools**: Mobile device simulation
- **Safari**: iOS testing
- **Firefox**: Android testing
- **Real Device**: Network testing

## 📊 Analytics & Monitoring

### Collar Metrics
- Battery usage patterns
- Signal strength history
- Activity level trends
- Location heat maps
- Alert frequency analysis

### App Performance
- Real-time connection status
- WebSocket reliability metrics
- User interaction tracking
- Error monitoring and reporting

## 🔄 Deployment

### Mobile PWA Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
npx vercel --prod

# Or deploy to Netlify
npm run build && netlify deploy --prod
```

### Hardware Integration
1. Configure ESP32-S3 collar firmware
2. Set up WebSocket server on collar
3. Configure beacon network
4. Test real-time connectivity
5. Enable push notifications

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/mobile-enhancement`
3. Test on multiple mobile devices
4. Submit pull request with mobile testing evidence

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

- **Hardware Issues**: Check ESP32-S3 documentation
- **App Issues**: Create GitHub issue
- **Feature Requests**: Use discussion tab
- **Security Issues**: Email security@petcollar.app

---

**Built with ❤️ for pet safety and mobile-first experience** 