'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Check, X, Info, Download } from 'lucide-react'

export default function PWATestPage() {
  const [pwaStatus, setPwaStatus] = useState({
    isHTTPS: false,
    hasManifest: false,
    hasServiceWorker: false,
    hasIcons: false,
    isStandalone: false,
    isInstallable: false,
    beforeInstallPromptFired: false,
    userAgent: '',
    displayMode: '',
    platform: ''
  })

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showManualPrompt, setShowManualPrompt] = useState(false)

  useEffect(() => {
    // Check PWA requirements
    const checkPWAStatus = () => {
      // Ensure we're on the client side
      if (typeof window === 'undefined') return

      const status = {
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        hasManifest: false,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasIcons: false,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isInstallable: false,
        beforeInstallPromptFired: false,
        userAgent: navigator.userAgent,
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
        platform: navigator.platform
      }

      // Check for manifest
      const manifestLink = document.querySelector('link[rel="manifest"]')
      status.hasManifest = !!manifestLink

      // Check for icons
      fetch('/manifest.json')
        .then(response => response.json())
        .then(manifest => {
          status.hasIcons = manifest.icons && manifest.icons.length > 0
          setPwaStatus(prev => ({ ...prev, hasIcons: true }))
        })
        .catch(() => {
          setPwaStatus(prev => ({ ...prev, hasIcons: false }))
        })

      setPwaStatus(status)
    }

    checkPWAStatus()

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('✅ beforeinstallprompt fired!', e)
      e.preventDefault()
      setDeferredPrompt(e)
      setPwaStatus(prev => ({ ...prev, beforeInstallPromptFired: true, isInstallable: true }))
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('✅ App installed!')
      setPwaStatus(prev => ({ ...prev, isStandalone: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Show manual prompt after delay if no beforeinstallprompt
    const timer = setTimeout(() => {
      if (!deferredPrompt) {
        setShowManualPrompt(true)
      }
    }, 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [deferredPrompt])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('Install prompt result:', outcome)
      setDeferredPrompt(null)
    }
  }

  const getStatusIcon = (condition: boolean) => 
    condition ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />

  return (
    <div className="min-h-screen bg-pet-surface p-6 pt-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <Smartphone className="w-16 h-16 mx-auto text-teal-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            PWA Install Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Debug why the install banner isn't showing
          </p>
        </div>

        {/* PWA Requirements Checklist */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-pet">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            PWA Requirements
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>HTTPS or localhost</span>
              {getStatusIcon(pwaStatus.isHTTPS)}
            </div>
            <div className="flex items-center justify-between">
              <span>Manifest file</span>
              {getStatusIcon(pwaStatus.hasManifest)}
            </div>
            <div className="flex items-center justify-between">
              <span>Service Worker support</span>
              {getStatusIcon(pwaStatus.hasServiceWorker)}
            </div>
            <div className="flex items-center justify-between">
              <span>App icons</span>
              {getStatusIcon(pwaStatus.hasIcons)}
            </div>
            <div className="flex items-center justify-between">
              <span>Already installed</span>
              {getStatusIcon(pwaStatus.isStandalone)}
            </div>
            <div className="flex items-center justify-between">
              <span>beforeinstallprompt fired</span>
              {getStatusIcon(pwaStatus.beforeInstallPromptFired)}
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-pet">
          <h2 className="text-lg font-bold mb-4">Device Information</h2>
          <div className="space-y-2 text-sm">
            <div><strong>User Agent:</strong> {pwaStatus.userAgent}</div>
            <div><strong>Platform:</strong> {pwaStatus.platform}</div>
            <div><strong>Display Mode:</strong> {pwaStatus.displayMode}</div>
            <div><strong>Protocol:</strong> {typeof window !== 'undefined' ? location.protocol : 'N/A'}</div>
            <div><strong>Hostname:</strong> {typeof window !== 'undefined' ? location.hostname : 'N/A'}</div>
          </div>
        </div>

        {/* Install Button */}
        {pwaStatus.beforeInstallPromptFired && deferredPrompt && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-pet">
            <h2 className="text-lg font-bold mb-4 text-green-600">Ready to Install!</h2>
            <button
              onClick={handleInstall}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Install Pet Collar App
            </button>
          </div>
        )}

        {/* Manual Instructions */}
        {showManualPrompt && !pwaStatus.beforeInstallPromptFired && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-pet">
            <h2 className="text-lg font-bold mb-4 text-orange-600">Manual Installation</h2>
            <div className="space-y-3 text-sm">
              <p><strong>Android Chrome:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Look for the install icon in the address bar</li>
                <li>Or go to menu → "Add to Home screen"</li>
                <li>The app needs to meet engagement heuristics</li>
              </ul>
              
              <p><strong>iOS Safari:</strong></p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Tap the Share button</li>
                <li>Select "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ul>
            </div>
          </div>
        )}

        {/* Troubleshooting */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-pet">
          <h2 className="text-lg font-bold mb-4 text-blue-600">Why isn't it working?</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Common reasons:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li>App already installed (check home screen)</li>
              <li>Not enough user engagement (need to interact with app)</li>
              <li>Browser doesn't support PWA installs</li>
              <li>Missing icons or manifest issues</li>
              <li>User has dismissed install prompt before</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 