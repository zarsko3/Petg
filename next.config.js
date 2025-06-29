const withPWA = require('next-pwa')({
  dest: 'public',
  // PWA is disabled in development to avoid stale cache issues during development
  // This is normal and expected - the warning "[PWA] PWA support is disabled" is shown twice by next-pwa
  // To test PWA functionality: run "npm run build && npm start" or deploy to Vercel
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})

// Allowed development origins to silence CORS warnings
const allowedDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.35:8080',
  'ws://localhost:3001',
  'ws://127.0.0.1:3001',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
    domains: [],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['konva'],
  webpack: (config, { isServer }) => {
    // Handle canvas for Konva SSR
    if (isServer) {
      config.externals.push({
        canvas: 'commonjs canvas',
      })
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      // CORS headers for development collar connections
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      // AR/WebXR support headers
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless', // Less restrictive than require-corp
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Security headers for AR/WebXR
          {
            key: 'Permissions-Policy',
            value: 'camera=*, gyroscope=*, accelerometer=*, magnetometer=*, xr-spatial-tracking=*, microphone=*, geolocation=*',
          },
          // Ensure HTTPS in production
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      // Special headers for AR pages
      {
        source: '/mobile/location',
        headers: [
          {
            key: 'Feature-Policy',
            value: 'camera *, gyroscope *, accelerometer *, magnetometer *, xr-spatial-tracking *',
          },
        ],
      },
    ]
  },
  // 🔄 Development WebSocket proxy (Vercel handles this in production)
  async rewrites() {
    return [
      // WebSocket proxy for development
      {
        source: '/ws',
        destination: process.env.COLLAR_TUNNEL_URL 
          ? process.env.COLLAR_TUNNEL_URL
          : process.env.COLLAR_IP 
            ? `http://${process.env.COLLAR_IP}:8080`
            : 'http://192.168.1.35:8080'
      }
    ]
  },
  
  // Ensure HTTPS redirect in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: `${process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'}/:path*`,
          permanent: true,
        },
      ]
    }
    return []
  },
}

module.exports = withPWA(nextConfig)