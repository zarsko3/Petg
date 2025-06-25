'use client';

import { ManualCollarConfig } from '@/components/manual-collar-config';

export default function ManualConfigPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Manual Collar Configuration</h1>
          <p className="text-muted-foreground">
            Configure your collar connection manually without automatic scanning
          </p>
        </div>
        
        <div className="flex justify-center">
          <ManualCollarConfig 
            onConnectionChange={(connected) => {
              console.log('Connection status changed:', connected);
            }}
          />
        </div>
        
        <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <p>
            This page allows you to manually configure the collar connection. 
            Automatic scanning has been disabled to prevent continuous network searches.
            Enter your collar's IP address and connect directly.
          </p>
        </div>
      </div>
    </div>
  );
} 