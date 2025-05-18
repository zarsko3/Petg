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
  Home
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

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen border-r transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-900",
        collapsed ? "w-[70px]" : "w-[240px]",
        className
      )}
      style={{
        transition: transitions.default
      }}
    >
      <div className="p-4 h-16 flex items-center border-b">
        {!collapsed && (
          <span className="font-semibold text-lg">Navigation</span>
        )}
      </div>
      
      <div className="flex-1 overflow-auto pb-10 pt-4">
        <nav className="grid items-start gap-2 px-2">
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
      
      {!isMobile && (
        <Button
          onClick={() => setCollapsed(!collapsed)}
          variant="ghost"
          size="icon"
          className="absolute right-[-12px] top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn(
            "h-3 w-3 transition-transform",
            collapsed ? "rotate-180" : "rotate-0"
          )} />
        </Button>
      )}
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
          : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-purple-600"
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