"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, Bell, LogOut } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { usePetgStore } from "@/lib/store"

export function Header() {
  const [mounted, setMounted] = useState(false)
  const [hasNewNotifications] = useState(true)
  const { user, setUser } = usePetgStore((state) => ({
    user: state.user,
    setUser: state.setUser
  }))

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    setUser(null);
  };

  if (!mounted) {
    return (
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="lg:hidden w-9 h-9 p-0">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold">Welcome back!</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
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
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <nav className="space-y-2 p-4">
                <Link href="/" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Status</span>
                </Link>
                <Link href="/location" className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span>Location</span>
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
            {user ? `Welcome, ${user.name}!` : 'Welcome back!'}
          </span>
        </div>

        <div className="flex items-center gap-4">
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
                      <p className="text-sm">Movement detected in Living Room</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex-1">
                      <p className="text-sm">Battery level at 20%</p>
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  )
} 