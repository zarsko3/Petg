'use client'

import { useState, useEffect, useCallback } from 'react'
import { Collar } from '@/lib/types'

interface MobileCollarsState {
  collars: Collar[]
  isLoading: boolean
  error: string | null
}

export function useMobileCollars() {
  const [state, setState] = useState<MobileCollarsState>({
    collars: [],
    isLoading: true,
    error: null,
  })

  const fetchCollars = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/collars', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch collars: ${response.status}`)
      }

      const collars: Collar[] = await response.json()
      
      setState(prev => ({
        ...prev,
        collars,
        isLoading: false,
        error: null,
      }))

    } catch (error: any) {
      console.error('❌ Failed to fetch collars:', error)
      
      setState(prev => ({
        ...prev,
        collars: [],
        isLoading: false,
        error: error.message || 'Failed to fetch collars',
      }))
    }
  }, [])

  const refresh = useCallback(() => {
    fetchCollars()
  }, [fetchCollars])

  const addCollar = useCallback((collar: Collar) => {
    setState(prev => ({
      ...prev,
      collars: [...prev.collars, collar],
    }))
  }, [])

  const updateCollar = useCallback((collarId: string, updates: Partial<Collar>) => {
    setState(prev => ({
      ...prev,
      collars: prev.collars.map(collar =>
        collar.id === collarId ? { ...collar, ...updates } : collar
      ),
    }))
  }, [])

  const removeCollar = useCallback((collarId: string) => {
    setState(prev => ({
      ...prev,
      collars: prev.collars.filter(collar => collar.id !== collarId),
    }))
  }, [])

  // Initial load
  useEffect(() => {
    fetchCollars()
  }, [fetchCollars])

  return {
    ...state,
    refresh,
    addCollar,
    updateCollar,
    removeCollar,
  }
} 