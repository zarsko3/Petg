'use client';

import { SignIn } from '@clerk/nextjs';
import Image from 'next/image';
import { 
  Shield, 
  MapPin, 
  Activity, 
  Battery,
  Smartphone,
  Heart,
  Star,
  Users,
  Clock
} from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="flex min-h-screen">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-y-12"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-white/20 to-transparent rounded-full transform translate-x-32 translate-y-32"></div>
          </div>

          <div className="relative z-10 flex flex-col justify-between w-full">
            {/* Logo & Brand */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">PETg</h1>
                  <p className="text-blue-100 text-sm">Pet Tracking & Safety</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white leading-tight">
                  Welcome Back to<br />Your Pet's Safety Hub
                </h2>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Continue monitoring your pet's location, health, and safety with our advanced tracking system.
                </p>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <MapPin className="h-8 w-8 text-blue-200 mb-3" />
                <h3 className="text-white font-semibold mb-1">Real-time Tracking</h3>
                <p className="text-blue-100 text-sm">Monitor your pet's location anywhere, anytime</p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <Activity className="h-8 w-8 text-green-200 mb-3" />
                <h3 className="text-white font-semibold mb-1">Health Monitoring</h3>
                <p className="text-blue-100 text-sm">Track activity, sleep, and vital signs</p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <Shield className="h-8 w-8 text-purple-200 mb-3" />
                <h3 className="text-white font-semibold mb-1">Smart Alerts</h3>
                <p className="text-blue-100 text-sm">Instant notifications for safety events</p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <Smartphone className="h-8 w-8 text-yellow-200 mb-3" />
                <h3 className="text-white font-semibold mb-1">Mobile Ready</h3>
                <p className="text-blue-100 text-sm">Access from anywhere on any device</p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="space-y-4">
              <div className="flex items-center gap-6 text-blue-100">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="text-sm">10,000+ Happy Pet Owners</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-300" />
                  <span className="text-sm">4.9/5 Rating</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-blue-100">
                <Clock className="h-5 w-5" />
                <span className="text-sm">24/7 Pet Safety Monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication Form */}
        <div className="w-full lg:w-1/2 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">PETg</h1>
                <p className="text-blue-100 text-sm">Pet Tracking & Safety</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-blue-100">Sign in to continue protecting your pet</p>
          </div>

          {/* Form Container */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-8 lg:block hidden">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome Back
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Sign in to your PETg account to continue
                </p>
              </div>

              {/* Clerk Sign In Component */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                <SignIn 
                  appearance={{
                    elements: {
                      // Override any page-specific styling if needed
                      rootBox: 'w-full',
                      card: 'bg-transparent shadow-none border-0 p-0 w-full'
                    }
                  }}
                  routing="path" 
                  path="/sign-in"
                  redirectUrl="/dashboard"
                  signUpUrl="/sign-up"
                />
              </div>

              {/* Additional Links */}
              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <a 
                    href="/sign-up" 
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    Sign up for free
                  </a>
                </p>
                
                <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                  <a href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    Privacy Policy
                  </a>
                  <span>•</span>
                  <a href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    Terms of Service
                  </a>
                  <span>•</span>
                  <a href="/support" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 