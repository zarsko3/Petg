'use client'

import { useState, useCallback } from 'react'
import { CollarPairRequest, CollarPairRequestSchema, Collar } from '@/lib/types'

interface PairCollarState {
  isScanning: boolean
  isPairing: boolean
  error: string | null
  pairedCollar: Collar | null
}

interface PairCollarOptions {
  onSuccess?: (collar: Collar) => void
  onError?: (error: string) => void
}

export function usePairCollar(options: PairCollarOptions = {}) {
  const [state, setState] = useState<PairCollarState>({
    isScanning: false,
    isPairing: false,
    error: null,
    pairedCollar: null,
  })

  const checkBluetoothSupport = useCallback(() => {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not supported in this browser')
    }
    if (!window.isSecureContext) {
      throw new Error('Web Bluetooth requires HTTPS or localhost')
    }
  }, [])

  const requestDevice = useCallback(async () => {
    checkBluetoothSupport()

    setState(prev => ({ ...prev, isScanning: true, error: null }))

    try {
      console.log('🔍 Requesting Bluetooth device...')
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'PetCollar' },
          { namePrefix: 'ESP32' },
          { services: ['12345678-1234-1234-1234-123456789abc'] }, // Custom collar service UUID
        ],
        optionalServices: [
          'battery_service',
          'device_information',
          '12345678-1234-1234-1234-123456789abc', // Custom collar service
        ]
      })

      console.log('✅ Device selected:', device.name, device.id)
      
      if (!device.name) {
        throw new Error('Device name not available')
      }

      // Extract MAC address from device ID or use a placeholder
      const bleMac = device.id.replace(/[:-]/g, '').toUpperCase().match(/.{2}/g)?.join(':') || 
                    '00:00:00:00:00:00'

      return {
        device,
        bleMac,
        name: device.name,
      }
    } catch (error: any) {
      console.error('❌ Bluetooth device request failed:', error)
      
      let errorMessage = 'Failed to select device'
      if (error.name === 'NotFoundError') {
        errorMessage = 'No collar found. Please ensure your collar is in pairing mode.'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Bluetooth access denied. Please enable Bluetooth permissions.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Bluetooth not supported on this device.'
      } else if (error.message) {
        errorMessage = error.message
      }

      setState(prev => ({ ...prev, isScanning: false, error: errorMessage }))
      options.onError?.(errorMessage)
      throw error
    } finally {
      setState(prev => ({ ...prev, isScanning: false }))
    }
  }, [checkBluetoothSupport, options])

  const connectAndPair = useCallback(async (deviceInfo: { device: BluetoothDevice; bleMac: string; name: string }, nickname: string) => {
    setState(prev => ({ ...prev, isPairing: true, error: null }))

    try {
      console.log('🔗 Connecting to device...')
      
      // Connect to GATT server
      const server = await deviceInfo.device.gatt?.connect()
      if (!server) {
        throw new Error('Failed to connect to device GATT server')
      }

      console.log('✅ Connected to GATT server')

      // Validate pairing request data
      const pairRequest: CollarPairRequest = {
        ble_mac: deviceInfo.bleMac,
        nickname: nickname.trim(),
      }

      const validatedRequest = CollarPairRequestSchema.parse(pairRequest)

      // Send pairing request to backend
      console.log('📡 Sending pairing request to backend...')
      const response = await fetch('/api/collar/pair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const collar: Collar = await response.json()
      console.log('✅ Collar paired successfully:', collar)

      setState(prev => ({ 
        ...prev, 
        isPairing: false, 
        pairedCollar: collar,
        error: null 
      }))

      // Broadcast WebSocket event for real-time updates
      if (typeof window !== 'undefined' && (window as any).collarWebSocket) {
        (window as any).collarWebSocket.send(JSON.stringify({
          type: 'collarPaired',
          data: collar
        }))
      }

      options.onSuccess?.(collar)
      return collar

    } catch (error: any) {
      console.error('❌ Collar pairing failed:', error)
      
      const errorMessage = error.message || 'Failed to pair collar'
      setState(prev => ({ 
        ...prev, 
        isPairing: false, 
        error: errorMessage 
      }))
      
      options.onError?.(errorMessage)
      throw error
    }
  }, [options])

  const pairCollar = useCallback(async (nickname: string) => {
    try {
      const deviceInfo = await requestDevice()
      return await connectAndPair(deviceInfo, nickname)
    } catch (error) {
      // Error already handled in requestDevice or connectAndPair
      throw error
    }
  }, [requestDevice, connectAndPair])

  const reset = useCallback(() => {
    setState({
      isScanning: false,
      isPairing: false,
      error: null,
      pairedCollar: null,
    })
  }, [])

  return {
    ...state,
    pairCollar,
    reset,
    isBluetoothSupported: typeof navigator !== 'undefined' && !!navigator.bluetooth,
  }
}

// Utility function to check if device supports Web Bluetooth
export const isWebBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 
         'bluetooth' in navigator && 
         window.isSecureContext
} 