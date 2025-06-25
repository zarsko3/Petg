'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface ClerkProviderWrapperProps {
  children: React.ReactNode;
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  const [isClerkAvailable, setIsClerkAvailable] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if Clerk API keys are configured
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    setIsClerkAvailable(!!publishableKey && !publishableKey.includes('YOUR_PUBLISHABLE_KEY'));
  }, []);

  // During initial SSR or before mount, don't attempt to render Clerk
  if (!mounted) {
    return <>{children}</>;
  }

  if (isClerkAvailable) {
    return (
      <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#ffffff',
            colorInputBackground: '#ffffff',
            colorInputText: '#1f2937',
            colorText: '#1f2937',
            colorTextSecondary: '#6b7280',
            colorDanger: '#ef4444',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '12px',
            spacingUnit: '1rem'
          },
          elements: {
            // Main container
            rootBox: 'w-full',
            card: 'bg-transparent shadow-none border-0 p-0 w-full',
            
            // Headers
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            
            // Social buttons - perfectly centered with icons
            socialButtonsBlockButton: `
              !bg-white !border !border-gray-200 dark:!border-gray-600 
              hover:!bg-gray-50 dark:hover:!bg-gray-700 
              !rounded-xl !transition-all !duration-200 
              !py-3 !px-4 !w-full !flex !items-center !justify-center !gap-3
              !text-gray-700 dark:!text-gray-300 !font-medium !text-base
              !mb-3 !h-12 !shadow-sm hover:!shadow-md
              focus:!outline-none focus:!ring-2 focus:!ring-blue-500/20
            `,
            
            socialButtonsBlockButtonText: `
              !text-gray-700 dark:!text-gray-300 !font-medium !text-base
              !flex !items-center !justify-center !gap-2
            `,
            
            // Divider styling to match design
            dividerLine: '!bg-gray-200 dark:!bg-gray-600 !h-px !my-6',
            dividerText: `
              !text-gray-500 dark:!text-gray-400 !text-sm !font-medium 
              !px-4 !bg-white dark:!bg-gray-800 !uppercase !tracking-wider
            `,
            
            // Form elements
            formButtonPrimary: `
              !bg-gradient-to-r !from-blue-600 !to-indigo-600
              hover:!from-blue-700 hover:!to-indigo-700 
              active:!from-blue-800 active:!to-indigo-800
              !text-white !font-semibold !py-3 !px-6 !rounded-xl 
              !shadow-lg hover:!shadow-xl active:!shadow-md
              !transition-all !duration-200 !transform hover:!scale-[1.02]
              !border-0 !text-base !w-full !h-12
              focus:!outline-none focus:!ring-4 focus:!ring-blue-500/20
              !cursor-pointer
            `,
            
            // Input fields
            formFieldInput: `
              !border !border-gray-200 dark:!border-gray-600 
              focus:!border-blue-500 dark:focus:!border-blue-400 
              focus:!ring-4 focus:!ring-blue-500/20
              !rounded-xl !px-4 !py-3 !text-base !w-full !h-12
              !bg-white dark:!bg-gray-700 
              !text-gray-900 dark:!text-gray-100
              placeholder:!text-gray-500 dark:placeholder:!text-gray-400
              !transition-all !duration-200 !shadow-none
            `,
            
            formFieldLabel: `
              !text-gray-700 dark:!text-gray-300 
              !font-semibold !text-sm !mb-2 !block
            `,
            
            // Links and actions
            footerActionLink: `
              !text-blue-600 hover:!text-blue-700 
              dark:!text-blue-400 dark:hover:!text-blue-300 
              !font-medium !transition-colors !duration-200 !text-sm
            `,
            
            formFieldAction: `
              !text-blue-600 hover:!text-blue-700 
              dark:!text-blue-400 dark:hover:!text-blue-300 
              !font-medium !text-sm !transition-colors !duration-200
            `,
            
            // Hide Clerk branding and logos completely
            footer: 'hidden',
            footerAction: 'hidden',
            logoBox: 'hidden',
            logoImage: 'hidden',
            
            // Form container
            form: '!space-y-4',
            
            // Alert messages
            formFieldSuccessText: '!text-green-600 dark:!text-green-400 !text-sm !mt-1',
            formFieldErrorText: '!text-red-600 dark:!text-red-400 !text-sm !mt-1',
            
            // Internal form wrapper
            formFieldRow: '!space-y-2',
            
            // Password input show/hide button
            formFieldInputShowPasswordButton: `
              !text-gray-500 hover:!text-gray-700 
              dark:!text-gray-400 dark:hover:!text-gray-200
              !transition-colors !duration-200
            `
          },
          
          layout: {
            logoImageUrl: '',
            logoPlacement: 'none',
            showOptionalFields: true,
            socialButtonsPlacement: 'top',
            socialButtonsVariant: 'blockButton',
            shimmer: false,
            helpPageUrl: undefined,
            privacyPageUrl: undefined,
            termsPageUrl: undefined
          }
        }}
        localization={{
          locale: 'en-US'
        }}
      >
        {children}
      </ClerkProvider>
    );
  } else {
    // Fallback when Clerk is not available
    console.warn('Clerk credentials not found. Authentication features will be limited to demo mode.');
    return <>{children}</>;
  }
} 