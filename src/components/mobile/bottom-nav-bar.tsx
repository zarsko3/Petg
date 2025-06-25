'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Map, Settings } from 'lucide-react';

const navItems = [
  { href: '/mobile/dashboard', label: 'Home', icon: Home },
  { href: '/mobile/location', label: 'Location', icon: Map },
  { href: '/mobile/settings', label: 'Settings', icon: Settings },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg z-50 safe-area-bottom mobile-nav">
      <ul className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 p-3 rounded-2xl mx-1 touch-target min-h-[44px] relative overflow-hidden group ${
                  isActive 
                    ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 shadow-teal-glow' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/40 dark:to-teal-800/30 rounded-2xl" />
                )}
                
                {/* Icon with enhanced styling */}
                <div className={`relative z-10 mb-1 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}>
                  <Icon 
                    size={22} 
                    className={`${isActive ? 'drop-shadow-sm' : ''}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  
                  {/* Pulse effect for active item */}
                  {isActive && (
                    <div className="absolute inset-0 bg-teal-400/20 rounded-full animate-ping" />
                  )}
                </div>
                
                {/* Label with better typography */}
                <span className={`relative z-10 font-rounded leading-tight ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}>
                  {label}
                </span>
                
                {/* Hover effect backdrop */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
} 