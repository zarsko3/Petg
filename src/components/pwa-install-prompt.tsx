'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Share, Plus, PawPrint } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase()
    const isiOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    
    setIsIOS(isiOS)
    setIsAndroid(isAndroidDevice)

    // Check if already installed
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed before (client-side only)
    try {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed')
      if (dismissed) {
        return
      }
    } catch (error) {
      console.log('localStorage not available:', error)
    }

    // Enhanced debugging
    console.log('🔍 PWA Install Prompt Debug:', {
      userAgent,
      isIOS: isiOS,
      isAndroid: isAndroidDevice,
      isStandalone,
      isInWebAppiOS,
      isHTTPS: location.protocol === 'https:',
      isLocalhost: location.hostname === 'localhost'
    })

    // Listen for the beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('✅ beforeinstallprompt event fired!', e)
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show our custom prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 2000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ App installed!')
      setIsInstalled(true)
      setShowPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Fallback: Show prompt after delay for iOS or if no beforeinstallprompt
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && (isiOS || isAndroidDevice)) {
        console.log('📱 Showing fallback PWA prompt')
        setShowPrompt(true)
      }
    }, 10000) // Show after 10 seconds as fallback

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(fallbackTimer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome native install
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      
      setDeferredPrompt(null)
    } else {
      // For iOS or fallback - just hide the prompt
      setShowPrompt(false)
      // Could show instructions here
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember dismissal for 24 hours (client-side only)
    try {
      localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
      setTimeout(() => {
        try {
          localStorage.removeItem('pwa-prompt-dismissed')
        } catch (error) {
          console.log('localStorage cleanup failed:', error)
        }
      }, 24 * 60 * 60 * 1000) // 24 hours
    } catch (error) {
      console.log('localStorage not available:', error)
    }
  }

  // Don't render anything during SSR
  if (!mounted) {
    return null
  }

  // Don't show if already installed
  if (isInstalled) {
    return null
  }

  // Check if dismissed recently (client-side only)
  try {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return null
    }
  } catch (error) {
    console.log('localStorage not available:', error)
  }

  if (!showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white font-rounded">
              Install Pet Collar App
            </h3>
            
            {isIOS ? (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <div className="flex items-center gap-1 mb-2">
                  <span>Tap</span>
                  <Share className="inline w-4 h-4 mx-1" />
                  <span>then "Add to Home Screen" to install</span>
                  <PawPrint className="inline w-4 h-4 ml-1 text-teal-500" />
                </div>
                <p className="text-xs">Get the full app experience without Safari!</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span>Add to your home screen for the best experience - no browser, just your pet's app!</span>
                <PawPrint className="w-4 h-4 text-teal-500" />
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              {!isIOS ? (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors touch-target"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
              ) : (
                <button
                  onClick={() => setShowPrompt(false)}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors touch-target"
                >
                  <Plus className="w-4 h-4" />
                  Got it!
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors touch-target"
              >
                Maybe later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
} 