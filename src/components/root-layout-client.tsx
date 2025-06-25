'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/header'
import { SidebarNav } from '@/components/sidebar-nav'
import { ErrorBoundary } from '@/components/error-boundary'

interface RootLayoutClientProps {
  children: React.ReactNode
}

export function RootLayoutClient({ children }: RootLayoutClientProps) {
  const pathname = usePathname()
  
  // Check if we're on a mobile route
  const isMobileRoute = pathname.startsWith('/mobile')
  
  // For mobile routes, just render children directly (no desktop sidebar)
  if (isMobileRoute) {
    return <>{children}</>
  }
  
  // For desktop routes, render with sidebar and header
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar Navigation */}
        <SidebarNav />
        
        {/* Main Content */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-hidden">
          <main className="h-full overflow-auto p-6">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  )
} 