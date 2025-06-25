"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wifi, MapPin, Settings, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={cn(
      "h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleSidebar} 
          className="ml-auto flex items-center mb-6"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className={cn("ml-2", collapsed ? "hidden" : "inline")}>
            {collapsed ? "Expand" : "Collapse"}
          </span>
        </Button>
        
        <nav className="space-y-1">
          <NavLink 
            href="/" 
            icon={<Home className="h-5 w-5" />} 
            label="Dashboard" 
            collapsed={collapsed}
            active={pathname === "/"}
          />
          <NavLink 
            href="/location" 
            icon={<MapPin className="h-5 w-5" />} 
            label="Location" 
            collapsed={collapsed}
            active={pathname === "/location"}
          />
          <NavLink 
            href="/location-setup" 
            icon={<Home className="h-5 w-5" />} 
            label="Setup Tracking" 
            collapsed={collapsed}
            active={pathname === "/location-setup"}
          />
          <NavLink 
            href="/beacons" 
            icon={<Wifi className="h-5 w-5" />} 
            label="Beacons" 
            collapsed={collapsed}
            active={pathname === "/beacons"}
          />
          <NavLink 
            href="/settings" 
            icon={<Settings className="h-5 w-5" />} 
            label="Settings" 
            collapsed={collapsed}
            active={pathname === "/settings"}
          />
        </nav>
      </div>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
}

function NavLink({ href, icon, label, collapsed, active }: NavLinkProps) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        active 
          ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium" 
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
        collapsed ? "justify-center" : ""
      )}
    >
      <div className={cn(
        "text-gray-500",
        active ? "text-purple-600 dark:text-purple-400" : ""
      )}>
        {icon}
      </div>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
} 