'use client'

import { usePathname } from 'next/navigation'
import BottomNavBar from './bottom-nav-bar'
import HeaderBar from './header-bar'

interface MobileLayoutClientProps {
  children: React.ReactNode
}

export function MobileLayoutClient({ children }: MobileLayoutClientProps) {
  const pathname = usePathname()
  
  // Hide navigation on the welcome page
  const isWelcomePage = pathname === '/mobile' || pathname === '/mobile/'

  return (
    <div className="mobile-layout min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header Bar - Hidden on Welcome */}
      {!isWelcomePage && <HeaderBar />}
      
      {/* Main Content */}
      <main className={`flex-1 overflow-hidden ${
        !isWelcomePage ? 'pt-12 pb-16' : ''
      }`}>
        {children}
      </main>
      
      {/* Clean Bottom Navigation - Hidden on Welcome */}
      {!isWelcomePage && <BottomNavBar />}
    </div>
  )
} 