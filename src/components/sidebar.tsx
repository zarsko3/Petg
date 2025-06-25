"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  ChevronLeft, 
  LayoutDashboard, 
  Settings, 
  Layers, 
  BarChart3,
  Users,
  FileText,
  Bell,
  Home,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { spacing, transitions, colors } from "@/lib/theme"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth <= 768) {
        setCollapsed(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen border-r transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-900",
        collapsed ? "w-16" : "w-16 md:w-64",
        className
      )}
      style={{
        transition: transitions.default
      }}
    >
      <div className="p-4 md:p-6">
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="hidden md:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span className="sr-only">{collapsed ? "Expand" : "Collapse"} sidebar</span>
          </Button>
        </div>
        <nav className="space-y-2">
          <NavItem
            href="/dashboard"
            icon={LayoutDashboard}
            text="Dashboard"
            collapsed={collapsed}
            active={pathname === "/dashboard"}
          />
          <NavItem
            href="/projects"
            icon={Layers}
            text="Projects"
            collapsed={collapsed}
            active={pathname === "/projects"}
          />
          <NavItem
            href="/analytics"
            icon={BarChart3}
            text="Analytics"
            collapsed={collapsed}
            active={pathname === "/analytics"}
          />
          <NavItem
            href="/team"
            icon={Users}
            text="Team"
            collapsed={collapsed}
            active={pathname === "/team"}
          />
          <NavItem
            href="/documents"
            icon={FileText}
            text="Documents"
            collapsed={collapsed}
            active={pathname === "/documents"}
          />
          <NavItem
            href="/notifications"
            icon={Bell}
            text="Notifications"
            collapsed={collapsed}
            active={pathname === "/notifications"}
          />
          <NavItem
            href="/settings"
            icon={Settings}
            text="Settings"
            collapsed={collapsed}
            active={pathname === "/settings"}
          />
        </nav>
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  text: string
  active?: boolean
  collapsed?: boolean
}

function NavItem({
  href,
  icon: Icon,
  text,
  active,
  collapsed,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all relative",
        active 
          ? "bg-white dark:bg-gray-800 text-purple-600 font-medium shadow-sm" 
          : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-purple-600",
        collapsed && "justify-center"
      )}
    >
      <Icon 
        className={cn(
          "h-5 w-5 transition-colors",
          active ? "text-purple-600" : "text-gray-500 group-hover:text-purple-600"
        )} 
      />
      {!collapsed && (
        <>
          <span className="flex-1">{text}</span>
          {active && (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-600 rounded-r"
              aria-hidden="true"
            />
          )}
        </>
      )}
      {collapsed && active && (
        <div 
          className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-purple-600 rounded-l"
          aria-hidden="true"
        />
      )}
    </Link>
  )
} 