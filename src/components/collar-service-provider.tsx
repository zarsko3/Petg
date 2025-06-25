  'use client';

import { useEffect } from 'react';
import { getCollarService } from '@/lib/collar-websocket-service';

interface CollarServiceProviderProps {
  children: React.ReactNode;
}

export function CollarServiceProvider({ children }: CollarServiceProviderProps) {
  useEffect(() => {
    console.log('🛑 CollarServiceProvider: Manual mode - auto-connection disabled');
    console.log('💡 CollarServiceProvider: Use manual configuration page to connect to collar');
    
    // Initialize service but don't auto-connect (manual mode)
    const service = getCollarService();
    
    return () => {
      console.log('🧹 CollarServiceProvider: Cleaning up WebSocket service...');
      service.disconnect();
    };
  }, []);

  return <>{children}</>;
} 