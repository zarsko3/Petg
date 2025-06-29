'use client'

import './mobile-globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { CollarServiceProvider } from '@/components/collar-service-provider'
import { Toaster } from 'sonner'
import BottomNavBar from '@/components/mobile/bottom-nav-bar'
import HeaderBar from '@/components/mobile/header-bar'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

const inter = Inter({ subsets: ['latin'] })

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <CollarServiceProvider>
        <div className={`${inter.className} mobile-layout bg-pet-surface min-h-screen`}>
          {/* Fixed Header */}
          <HeaderBar />
          
          {/* Main Content with proper spacing for fixed header and bottom nav */}
          <main className="pt-20 pb-20 min-h-screen">
            {children}
          </main>
          
          {/* Fixed Bottom Navigation */}
          <BottomNavBar />
          
          {/* PWA Install Prompt */}
          <PWAInstallPrompt />
          
          {/* Toast Notifications */}
          <Toaster 
            position="top-center"
            theme="light"
            className="toaster group"
            toastOptions={{
              classNames: {
                toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-gray-950 dark:group-[.toaster]:text-gray-50 dark:group-[.toaster]:border-gray-800",
                description: "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400",
                actionButton: "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50 dark:group-[.toast]:bg-gray-50 dark:group-[.toast]:text-gray-900",
                cancelButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 dark:group-[.toast]:bg-gray-800 dark:group-[.toast]:text-gray-400",
              },
            }}
          />
        </div>
      </CollarServiceProvider>
    </ThemeProvider>
  )
} 