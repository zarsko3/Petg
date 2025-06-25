'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bluetooth, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { usePairCollar, isWebBluetoothSupported } from '@/hooks/usePairCollar'
import { Collar } from '@/lib/types'

interface CollarPairDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (collar: Collar) => void
}

export function CollarPairDialog({ open, onOpenChange, onSuccess }: CollarPairDialogProps) {
  const [nickname, setNickname] = useState('')
  const { isScanning, isPairing, error, pairCollar, reset } = usePairCollar({
    onSuccess: (collar) => {
      console.log('✅ Collar paired successfully:', collar)
      onSuccess?.(collar)
      setNickname('')
      reset()
    },
    onError: (error) => {
      console.error('❌ Pairing failed:', error)
    }
  })

  const handlePair = async () => {
    if (!nickname.trim()) {
      return
    }

    try {
      await pairCollar(nickname.trim())
    } catch (error) {
      // Error already handled by the hook
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setNickname('')
    reset()
  }

  if (!open) return null

  const isBluetoothSupported = isWebBluetoothSupported()
  const isLoading = isScanning || isPairing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bluetooth className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pair New Collar
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect your pet's smart collar
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!isBluetoothSupported ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Bluetooth Not Supported
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                    Your device or browser doesn't support Web Bluetooth. Please use a compatible browser on a device with Bluetooth capabilities.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Nickname Input */}
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Collar Nickname
                </Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="e.g., Buddy's Collar"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Give your collar a friendly name to identify it easily
                </p>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded">
                    <Bluetooth className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Pairing Instructions
                    </h3>
                    <ol className="text-sm text-blue-700 dark:text-blue-200 space-y-1 list-decimal list-inside">
                      <li>Make sure your collar is powered on</li>
                      <li>Press and hold the pairing button for 3 seconds</li>
                      <li>The LED should start blinking blue</li>
                      <li>Click "Start Pairing" below</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                        Pairing Failed
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success State */}
              {!error && !isLoading && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hidden">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                        Collar Paired Successfully!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-200">
                        Your collar is now connected and ready to use.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          
          {isBluetoothSupported && (
            <Button
              onClick={handlePair}
              disabled={!nickname.trim() || isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isScanning ? 'Scanning...' : 'Pairing...'}
                </>
              ) : (
                <>
                  <Bluetooth className="h-4 w-4 mr-2" />
                  Start Pairing
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 