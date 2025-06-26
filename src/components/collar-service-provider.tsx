  'use client';

import { useEffect } from 'react';
import { getCollarService } from '@/lib/collar-websocket-service';
import { collarIntegration } from '@/lib/collar-integration';

interface CollarServiceProviderProps {
  children: React.ReactNode;
}

export function CollarServiceProvider({ children }: CollarServiceProviderProps) {
  useEffect(() => {
    console.log('🚀 CollarServiceProvider: Starting auto-initialization...');
    
    // Auto-initialize collar integration
    const initializeCollar = async () => {
      try {
        // Initialize both collar integration and WebSocket service
        await collarIntegration.autoInit();
        console.log('✅ CollarServiceProvider: Collar integration auto-initialized');
      } catch (error) {
        console.error('❌ CollarServiceProvider: Auto-initialization failed:', error);
        // Continue with WebSocket service anyway
      }
      
      // Initialize WebSocket service
      const service = getCollarService();
      console.log('📡 CollarServiceProvider: WebSocket service initialized');
    };
    
    initializeCollar();
    
    return () => {
      console.log('🧹 CollarServiceProvider: Cleaning up services...');
      const service = getCollarService();
      service.disconnect();
    };
  }, []);

  return <>{children}</>;
} 