/**
 * Dynamic Icon Loader
 * 
 * This module provides dynamic loading of Lucide React icons to reduce bundle size.
 * Icons are loaded on-demand using React.lazy() and dynamic imports.
 * 
 * Usage:
 * import { DynamicIcon } from '@/lib/dynamic-icons';
 * <DynamicIcon name="Home" className="w-4 h-4" />
 */

import React, { Suspense, ComponentType } from 'react';
import { LucideProps } from 'lucide-react';

// Cache for loaded icons to avoid re-importing
const iconCache = new Map<string, ComponentType<LucideProps>>();

// Loading fallback component
const IconFallback: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <div 
    className={`animate-pulse bg-gray-300 rounded ${className}`}
    style={{ minWidth: '1rem', minHeight: '1rem' }}
  />
);

// Dynamic icon loader function
const loadIcon = (iconName: string): ComponentType<LucideProps> => {
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }

  const LazyIcon = React.lazy(async () => {
    try {
      const iconModule = await import('lucide-react');
      const IconComponent = (iconModule as any)[iconName];
      
      if (!IconComponent) {
        // Return a placeholder icon
        return { default: iconModule.AlertCircle };
      }
      
      return { default: IconComponent };
    } catch (error) {
      // Return a placeholder icon on error
      const iconModule = await import('lucide-react');
      return { default: iconModule.AlertCircle };
    }
  });

  iconCache.set(iconName, LazyIcon);
  return LazyIcon;
};

// Dynamic Icon Component
interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: React.ComponentType<LucideProps>;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ 
  name, 
  fallback,
  ...props 
}) => {
  const IconComponent = loadIcon(name);
  
  return (
    <Suspense fallback={<IconFallback className={props.className} />}>
      <IconComponent {...props} />
    </Suspense>
  );
};

// Common icons that can be preloaded for better UX
export const preloadCommonIcons = async () => {
  const commonIcons = [
    'Home', 'Settings', 'User', 'Menu', 'X', 'ChevronRight', 
    'ChevronLeft', 'Plus', 'Edit', 'Trash2', 'Save', 'Check',
    'AlertCircle', 'Info', 'Wifi', 'WifiOff', 'Activity',
    'Battery', 'MapPin', 'Heart', 'Shield'
  ];
  
  const loadPromises = commonIcons.map(iconName => {
    try {
      loadIcon(iconName);
    } catch (error) {
      // No warning or logging for preloading
    }
  });
  
  await Promise.allSettled(loadPromises);
};

// Utility to create a static icon component for frequently used icons
export const createStaticIcon = (iconName: string) => {
  return React.memo<LucideProps>((props) => (
    <DynamicIcon name={iconName} {...props} />
  ));
};

// Pre-made components for the most common icons (optional optimization)
export const HomeIcon = createStaticIcon('Home');
export const SettingsIcon = createStaticIcon('Settings'); 
export const MenuIcon = createStaticIcon('Menu');
export const UserIcon = createStaticIcon('User');
export const HeartIcon = createStaticIcon('Heart');
export const ShieldIcon = createStaticIcon('Shield');
export const WifiIcon = createStaticIcon('Wifi');
export const WifiOffIcon = createStaticIcon('WifiOff');
export const ActivityIcon = createStaticIcon('Activity');
export const BatteryIcon = createStaticIcon('Battery');
export const MapPinIcon = createStaticIcon('MapPin');
export const AlertCircleIcon = createStaticIcon('AlertCircle');

// Icon name type for better TypeScript support
export type IconName = 
  | 'Home' | 'Settings' | 'User' | 'Menu' | 'X' | 'Plus' | 'Edit' | 'Trash2'
  | 'Save' | 'Check' | 'AlertCircle' | 'Info' | 'Wifi' | 'WifiOff' | 'Activity'
  | 'Battery' | 'MapPin' | 'Heart' | 'Shield' | 'ChevronRight' | 'ChevronLeft'
  | 'ChevronDown' | 'ChevronUp' | 'Loader2' | 'RefreshCw' | 'Bell' | 'BellOff'
  | 'Volume2' | 'VolumeX' | 'Zap' | 'Grid3X3' | 'Calendar' | 'Clock'
  | 'Dog' | 'Cat' | 'PawPrint' | 'Camera' | 'Video' | 'Download' | 'Upload'
  | 'Share' | 'Copy' | 'Eye' | 'EyeOff' | 'Lock' | 'Unlock' | 'Key'
  | 'Mail' | 'Phone' | 'Globe' | 'Link' | 'LinkOff' | 'Search' | 'Filter'
  | 'Sort' | 'Grid' | 'List' | 'Map' | 'Navigation' | 'Compass' | 'Target'
  | 'PlayCircle' | 'PauseCircle' | 'StopCircle' | 'Square' | 'Circle'
  | 'Triangle' | 'Pentagon' | 'Maximize2' | 'Minimize2' | 'ZoomIn' | 'ZoomOut'
  | 'RotateCcw' | 'RotateCw' | 'Undo' | 'Redo' | 'ArrowLeft' | 'ArrowRight'
  | 'ArrowUp' | 'ArrowDown' | 'Sun' | 'Moon' | 'Star' | 'StarOff'
  | 'Bookmark' | 'BookmarkCheck' | 'Flag' | 'Tag' | 'Hash' | 'At'
  | 'Percent' | 'Dollar' | 'Euro' | 'Pound' | 'CreditCard' | 'Wallet'
  | 'ShoppingCart' | 'ShoppingBag' | 'Gift' | 'Award' | 'Trophy' | 'Medal';

export default DynamicIcon; 