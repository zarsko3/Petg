'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Map, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationLayoutProps {
  children: React.ReactNode;
  mapComponent: React.ReactNode;
  listComponent: React.ReactNode;
  actionBar?: React.ReactNode;
  className?: string;
}

export function LocationLayout({
  children,
  mapComponent,
  listComponent,
  actionBar,
  className
}: LocationLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'map' | 'list' | 'split'>('split');

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setActiveView('map'); // Default to map on mobile
      } else {
        setActiveView('split'); // Default to split on desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  return (
    <div className={cn("h-screen flex flex-col bg-gray-50 dark:bg-gray-900", className)}>
      {/* Action Bar - Sticky at top */}
      {actionBar && (
        <div className="flex-shrink-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {actionBar}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile View Controls */}
        {isMobile && (
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            <button
              onClick={() => setActiveView('map')}
              className={cn(
                "p-2 rounded-lg shadow-lg transition-all",
                activeView === 'map' 
                  ? "bg-blue-600 text-white" 
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
              aria-label="Show map view"
            >
              <Map className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={cn(
                "p-2 rounded-lg shadow-lg transition-all",
                activeView === 'list' 
                  ? "bg-blue-600 text-white" 
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
              aria-label="Show list view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Map Section */}
        <div 
          className={cn(
            "relative transition-all duration-300 ease-in-out",
            // Desktop split view
            !isMobile && activeView === 'split' && "w-1/2",
            !isMobile && activeView === 'map' && "w-full",
            !isMobile && activeView === 'list' && "w-0",
            // Mobile view
            isMobile && activeView === 'map' && "w-full",
            isMobile && activeView === 'list' && "w-0",
            isMobile && activeView === 'split' && "w-full"
          )}
        >
          <div className="h-full relative">
            {mapComponent}
            
            {/* Desktop Split View Toggle */}
            {!isMobile && (
              <button
                onClick={() => setActiveView(activeView === 'split' ? 'map' : 'split')}
                className="absolute top-4 right-4 z-30 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label={activeView === 'split' ? 'Expand map' : 'Show split view'}
              >
                {activeView === 'split' ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* List Section */}
        <div 
          className={cn(
            "relative transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700",
            // Desktop split view
            !isMobile && activeView === 'split' && "w-1/2",
            !isMobile && activeView === 'map' && "w-0",
            !isMobile && activeView === 'list' && "w-full",
            // Mobile view - drawer
            isMobile && activeView === 'map' && "absolute right-0 top-0 h-full w-80 transform translate-x-full",
            isMobile && activeView === 'list' && "absolute right-0 top-0 h-full w-full transform translate-x-0",
            isMobile && activeView === 'split' && "absolute right-0 top-0 h-full w-80 transform translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            {/* Mobile Drawer Header */}
            {isMobile && activeView !== 'map' && (
              <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Location List
                  </h2>
                  <button
                    onClick={() => setActiveView('map')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close list view"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* List Content */}
            <div className="flex-1 overflow-hidden">
              {listComponent}
            </div>
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {isMobile && activeView !== 'map' && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 z-10"
            onClick={() => setActiveView('map')}
            aria-label="Close drawer"
          />
        )}
      </div>

      {/* Additional Children (e.g., modals, overlays) */}
      {children}
    </div>
  );
}

// Hook for managing layout state
export function useLocationLayout() {
  const [activeView, setActiveView] = useState<'map' | 'list' | 'split'>('split');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return {
    activeView,
    setActiveView,
    isDrawerOpen,
    setIsDrawerOpen
  };
}

