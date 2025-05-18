import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import { Wifi, MapPin, Settings, Home } from 'lucide-react'
import { ThemeProvider } from '@/components/theme-provider'
import { Header } from '@/components/header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Petg Dashboard',
  description: 'Dashboard for Petg BLE-based smart collar',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="petg-theme"
        >
          <div className="h-screen flex flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)] overflow-hidden">
              {/* Sidebar Navigation */}
              <div className="w-16 md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                <div className="p-4 md:p-6">
                  <nav className="space-y-2">
                    <Link href="/" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Home className="h-5 w-5 text-gray-500" />
                      <span className="hidden md:inline">Status</span>
                    </Link>
                    <Link href="/location" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <span className="hidden md:inline">Location</span>
                    </Link>
                    <Link href="/beacons" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Wifi className="h-5 w-5 text-gray-500" />
                      <span className="hidden md:inline">Beacons</span>
                    </Link>
                    <Link href="/settings" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Settings className="h-5 w-5 text-gray-500" />
                      <span className="hidden md:inline">Settings</span>
                    </Link>
                  </nav>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-hidden">
                <main className="h-full overflow-auto p-6">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}