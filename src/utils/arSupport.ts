/**
 * AR Support Detection Utility
 * Checks for WebXR AR capabilities on the current device/browser
 */

// Extend Navigator interface to include WebXR
declare global {
  interface Navigator {
    xr?: XRSystem
  }
  
  interface XRSystem {
    isSessionSupported(mode: string): Promise<boolean>
    requestSession(mode: string, options?: any): Promise<XRSession>
  }
  
  interface XRSession {
    end(): Promise<void>
  }
}

export interface ARCapabilities {
  isSupported: boolean
  hasWebXR: boolean
  supportsImmersiveAR: boolean
  userAgent: string
  reason?: string
}

/**
 * Check if AR is supported on this device/browser
 */
export const isARSupported = async (): Promise<boolean> => {
  try {
    // First check if we're likely on a capable device
    if (!isLikelyARCapable()) {
      console.log('Device unlikely to support AR based on user agent')
      return false
    }

    if (!navigator.xr) {
      console.log('WebXR API not available')
      return false
    }
    
    const supported = await navigator.xr.isSessionSupported('immersive-ar')
    console.log('WebXR immersive-ar support:', supported)
    return supported
  } catch (error) {
    console.warn('AR support check failed:', error)
    return false
  }
}

/**
 * Get detailed AR capabilities information
 */
export const getARCapabilities = async (): Promise<ARCapabilities> => {
  const capabilities: ARCapabilities = {
    isSupported: false,
    hasWebXR: false,
    supportsImmersiveAR: false,
    userAgent: navigator.userAgent
  }

  console.log('Checking AR capabilities for:', navigator.userAgent)

  // Check for WebXR API
  if (!navigator.xr) {
    capabilities.reason = 'WebXR API not available'
    console.log('WebXR API not found')
    return capabilities
  }

  capabilities.hasWebXR = true
  console.log('WebXR API found')

  try {
    // Check for immersive AR session support
    capabilities.supportsImmersiveAR = await navigator.xr.isSessionSupported('immersive-ar')
    capabilities.isSupported = capabilities.supportsImmersiveAR
    
    console.log('Immersive AR support:', capabilities.supportsImmersiveAR)
    
    if (!capabilities.supportsImmersiveAR) {
      capabilities.reason = 'Immersive AR sessions not supported'
    }
  } catch (error) {
    capabilities.reason = `AR capability check failed: ${error}`
    console.warn('AR capability check failed:', error)
  }

  return capabilities
}

/**
 * Check if device is likely to support AR based on user agent
 * Updated to be more permissive for iOS devices
 */
export const isLikelyARCapable = (): boolean => {
  const ua = navigator.userAgent.toLowerCase()
  console.log('Checking AR capability for user agent:', ua)
  
  // iOS devices with ARKit support (iOS 11+, but really iOS 14+ for WebXR)
  if (ua.includes('iphone') || ua.includes('ipad')) {
    // More permissive iOS version check
    const iosMatch = ua.match(/os (\d+)_/) || ua.match(/version\/(\d+)/)
    if (iosMatch) {
      const version = parseInt(iosMatch[1])
      console.log('iOS version detected:', version)
      // iOS 14+ should support WebXR AR
      if (version >= 14) {
        console.log('iOS device likely supports AR')
        return true
      }
    }
    // If we can't parse version but it's iPhone/iPad, assume it might work
    console.log('iOS device detected, assuming AR capable')
    return true
  }
  
  // Android devices with ARCore support
  if (ua.includes('android')) {
    console.log('Android device detected')
    // Chrome on Android with WebXR support
    if (ua.includes('chrome')) {
      // Check Android version - ARCore requires Android 7+
      const androidMatch = ua.match(/android (\d+)/)
      if (androidMatch) {
        const version = parseInt(androidMatch[1])
        console.log('Android version detected:', version)
        if (version >= 7) {
          console.log('Android device likely supports AR')
          return true
        }
      }
      // Default to true for Chrome on Android if we can't parse version
      console.log('Chrome on Android, assuming AR capable')
      return true
    }
  }
  
  console.log('Device unlikely to support AR')
  return false
}

/**
 * Request AR permissions (if needed)
 */
export const requestARPermissions = async (): Promise<boolean> => {
  try {
    if (!navigator.xr) {
      return false
    }

    // Some browsers require explicit permission request
    // This is a no-op if permissions are already granted
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay']
    })
    
    // Immediately end the session - we were just checking permissions
    await session.end()
    return true
  } catch (error) {
    console.warn('AR permission request failed:', error)
    return false
  }
}

/**
 * Get user-friendly error message for AR issues
 */
export const getARErrorMessage = (capabilities: ARCapabilities): string => {
  if (!capabilities.hasWebXR) {
    return 'Your browser doesn\'t support AR. Try using Safari on iOS 14+ or Chrome on Android.'
  }
  
  if (!capabilities.supportsImmersiveAR) {
    return 'AR is not available on this device. Make sure you\'re using Safari on iOS 14+ or Chrome on a compatible Android device.'
  }
  
  return capabilities.reason || 'AR is not available right now. Please try again later.'
} 