import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/toast-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { Header } from '@/components/header'
import { SidebarNav } from '@/components/sidebar-nav'
import { CollarServiceProvider } from '@/components/collar-service-provider'
import { ClerkProviderWrapper } from '@/components/clerk-provider-wrapper'
import { RootLayoutClient } from '@/components/root-layout-client'
import { StagewiseToolbar } from '@stagewise/toolbar-next'
import { ReactPlugin } from '@stagewise-plugins/react'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#4CC9C8',
}

export const metadata: Metadata = {
  title: 'Pet Collar - Smart Pet Monitoring',
  description: 'Keep your pet safe with real-time monitoring and location tracking',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Petg',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
    'msapplication-TileColor': '#4CC9C8',
  } as Record<string, string>,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="petg-theme"
          >
            <ToastProvider />
            <CollarServiceProvider>
              <RootLayoutClient>
                {children}
              </RootLayoutClient>
            </CollarServiceProvider>
          </ThemeProvider>
        </ClerkProviderWrapper>
        <StagewiseToolbar 
          config={{
            plugins: [ReactPlugin]
          }}
        />
      </body>
    </html>
  )
}