"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Menu, Bell, LogOut, LogIn } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { usePetgStore } from "@/lib/store"
import { CollarStatusIndicator } from "@/components/collar-status-indicator"

// Simple fallback components for when auth is not available
const WelcomeMessage = ({ isSignedIn, userName }: { isSignedIn: boolean; userName: string }) => (
  <>{isSignedIn ? `Hello, ${userName}!` : 'Welcome!'}</>
);

const AuthButton = ({ 
  isSignedIn, 
  onLogout 
}: { 
  isSignedIn: boolean; 
  onLogout: () => void;
}) => {
  if (isSignedIn) {
    return (
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onLogout}
        className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
      >
        <LogOut className="h-5 w-5" />
        <span className="sr-only">Logout</span>
      </Button>
    );
  }
  
  return (
    <Link href="/sign-in">
      <Button 
        variant="ghost" 
        size="icon"
        className="text-purple-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20"
      >
        <LogIn className="h-5 w-5" />
        <span className="sr-only">Login</span>
      </Button>
    </Link>
  );
};

export function Header() {
  // Use hydration-safe mounted state pattern
  const [mounted, setMounted] = useState(false)
  const [hasNewNotifications] = useState(true)
  const [isClerkAvailable, setIsClerkAvailable] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userName, setUserName] = useState('User')
  
  const { user, setUser } = usePetgStore((state) => ({
    user: state.user,
    setUser: state.setUser
  }))

  // Demo login/logout functions for when Clerk is not available
  const handleDemoLogin = useCallback(() => {
    setIsSignedIn(true);
    setUser({ name: 'Demo' });
    setUserName('Demo');
  }, [setUser]);

  const handleDemoLogout = useCallback(() => {
    setIsSignedIn(false);
    setUser(null);
    setUserName('User');
  }, [setUser]);

  // Safe client-side effect - only runs once
  useEffect(() => {
    setMounted(true);
    
    // Check if Clerk is available
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    setIsClerkAvailable(!!publishableKey && !publishableKey.includes('YOUR_PUBLISHABLE_KEY'));
  }, []);

  // SSR-safe rendering: Use minimal UI until client-side hydration is complete
  if (!mounted) {
    return (
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9"></div>
            <span className="text-lg font-semibold">Loading...</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9"></div>
          </div>
        </div>
      </header>
    )
  }
  
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="lg:hidden w-9 h-9 p-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <nav className="space-y-2 p-4">
                <Link href="/" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Dashboard</span>
                </Link>
                <Link href="/location" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Location</span>
                </Link>
                <Link href="/location-setup" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Setup Tracking</span>
                </Link>
                <Link href="/beacons" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Beacons</span>
                </Link>
                <Link href="/settings" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Settings</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <span className="text-lg font-semibold">
            <WelcomeMessage isSignedIn={isSignedIn} userName={userName} />
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Collar Connection Status */}
          <CollarStatusIndicator />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {hasNewNotifications && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-4 space-y-4">
                <h3 className="font-medium">Recent Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex-1">
                      <p className="text-sm">Movement detected in living room</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex-1">
                      <p className="text-sm">Low battery - 20%</p>
                      <p className="text-xs text-gray-500">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex-1">
                      <p className="text-sm">Daily activity goal reached</p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <ThemeToggle />
          
          <AuthButton 
            isSignedIn={isSignedIn} 
            onLogout={handleDemoLogout} 
          />
        </div>
      </div>
    </header>
  )
} 