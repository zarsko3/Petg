'use client';

import { useEffect, useState } from 'react';
import { SignUp } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Dog, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignUpPage() {
  const [mounted, setMounted] = useState(false);
  const [isClerkAvailable, setIsClerkAvailable] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Check if Clerk is available (API key is set)
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    setIsClerkAvailable(!!publishableKey && !publishableKey.includes('YOUR_PUBLISHABLE_KEY'));
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-12 bg-gradient-to-br from-blue-600 to-purple-700 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-white rounded-full"></div>
          <div className="absolute top-1/2 right-32 w-16 h-16 bg-white rounded-full"></div>
        </div>
        
        <div className="relative z-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/20 p-3 rounded-xl">
                <Dog className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">PETg</h1>
            </div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Smart Pet Monitoring<br />Made Simple
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Join thousands of pet owners who trust PETg to keep their furry friends safe and healthy.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-2 rounded-lg mt-1">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-time Location Tracking</h3>
                <p className="text-blue-100">Monitor your pet's location and set safe zone alerts</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-2 rounded-lg mt-1">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Health & Activity Monitoring</h3>
                <p className="text-blue-100">Track activity levels, sleep patterns, and wellness metrics</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-2 rounded-lg mt-1">
                <Dog className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Smart Collar Integration</h3>
                <p className="text-blue-100">Seamless integration with BLE-enabled smart collars</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Dog className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PETg</h1>
            </div>
          </div>

          {/* Clerk Sign Up Form */}
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-3xl p-8 border border-gray-100 dark:border-gray-700">
            {isClerkAvailable ? (
              <div className="space-y-4">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Join the PETg community and start monitoring your pets today
                  </p>
                </div>
                
                <SignUp
                  appearance={{
                    elements: {
                      card: 'bg-transparent shadow-none border-0 p-0',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      footer: 'hidden'
                    }
                  }}
                  redirectUrl="/"
                  signInUrl="/sign-in"
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Join the PETg community and start monitoring your pets today
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="terms" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    I agree to the{' '}
                    <Link href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Policy</Link>
                  </label>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
                  onClick={() => window.location.href = '/'}
                >
                  Create Account
                </Button>
                
                <div className="text-center">
                  <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                    <span className="text-amber-500">⚠️</span> Demo mode - Authentication not configured
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Already have an account?{' '}
                <Link
                  href="/sign-in"
                  className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center transition-colors"
                >
                  Sign in
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </p>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors"
            >
              Continue to dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 