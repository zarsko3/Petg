'use client'

import './mobile-globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
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
      </div>
    </ThemeProvider>
  )
} 