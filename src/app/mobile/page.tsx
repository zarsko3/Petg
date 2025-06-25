'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SignInButton, useUser } from '@clerk/nextjs'
import { Heart, Shield, MapPin, Bell, ChevronRight, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MobileWelcomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  // Use try-catch for Clerk hooks to handle context issues gracefully
  let isSignedIn = false
  let user = null
  
  try {
    const clerkData = useUser()
    isSignedIn = clerkData.isSignedIn || false
    user = clerkData.user
  } catch (error) {
    console.log('Clerk context not available, using guest mode')
  }

  useEffect(() => {
    setMounted(true)
    // Redirect to dashboard if already signed in
    if (isSignedIn && mounted) {
      router.push('/mobile/dashboard')
    }
  }, [isSignedIn, router, mounted])

  if (!mounted) {
    return (
      <div className="mobile-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    )
  }

  const features = [
    {
      icon: MapPin,
      title: 'Real-time Location',
      description: 'Track your pet\'s exact location with precision indoor mapping'
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Get instant notifications when your pet leaves safe zones'
    },
    {
      icon: Shield,
      title: 'Safety Zones',
      description: 'Set up virtual boundaries and monitor activity patterns'
    },
    {
      icon: Heart,
      title: 'Health Monitoring',
      description: 'Monitor your pet\'s activity levels and daily routines'
    }
  ]

  return (
    <div className="mobile-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 flex flex-col h-full safe-area-top">
        {/* Header */}
        <div className="flex-1 flex flex-col justify-center px-6 text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
              <Heart className="h-12 w-12 text-purple-600 animate-pulse" />
            </div>
          </div>

          {/* Welcome Text */}
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to
            <br />
            <span className="text-yellow-300">PetGuard</span>
          </h1>
          <p className="text-xl text-purple-100 mb-12 leading-relaxed">
            Keep your furry friend safe with smart collar technology and real-time monitoring
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div 
                  key={feature.title}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-left"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <Icon className="h-8 w-8 text-yellow-300 mb-3" />
                  <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-purple-100 text-xs leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-8 space-y-4">
          {/* Only show SignInButton if Clerk is available */}
          {typeof window !== 'undefined' && (
            <SignInButton mode="modal">
              <button className="w-full bg-white text-purple-700 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 mobile-button touch-target flex items-center justify-center">
                <User className="h-5 w-5 mr-2" />
                Sign In to Your Account
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            </SignInButton>
          )}

          <Link href="/mobile/dashboard">
            <button className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white py-4 rounded-2xl font-semibold text-lg transition-all duration-300 mobile-button touch-target flex items-center justify-center">
              Continue as Guest
              <ChevronRight className="h-5 w-5 ml-2" />
            </button>
          </Link>

          <p className="text-center text-purple-200 text-sm mt-6">
            Guest mode provides limited features. Sign in for full access to your pet's data.
          </p>
        </div>
      </div>
    </div>
  )
} 