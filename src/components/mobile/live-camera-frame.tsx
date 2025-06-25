'use client'

import { useState, useRef, useEffect } from 'react'
import { Video, Play, Pause, Maximize2, Minimize2, RotateCcw, Wifi, WifiOff } from 'lucide-react'

interface LiveCameraFrameProps {
  streamSrc?: string
  isConnected?: boolean
  petName?: string
  onToggleExpanded?: (expanded: boolean) => void
  className?: string
}

export function LiveCameraFrame({ 
  streamSrc, 
  isConnected = false, 
  petName = 'Pet',
  onToggleExpanded,
  className = '' 
}: LiveCameraFrameProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
    setIsPlaying(!isPlaying)
  }

  const handleToggleExpanded = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onToggleExpanded?.(newExpanded)
  }

  const handleVideoError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleVideoLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setHasError(false)
    if (videoRef.current && streamSrc) {
      videoRef.current.load()
    }
  }

  useEffect(() => {
    if (streamSrc && videoRef.current) {
      setIsLoading(true)
      videoRef.current.load()
    }
  }, [streamSrc])

  return (
    <div className={`w-full aspect-video overflow-hidden rounded-lg shadow ${className}`}>
      <div 
        className="w-full h-full relative"
        style={{ maxHeight: 'calc(40vh - env(safe-area-inset-bottom))' }}
      >
        {streamSrc && isConnected ? (
          <video
            ref={videoRef}
            src={streamSrc}
            className="w-full h-full object-cover"
            playsInline
            autoPlay={isPlaying}
            muted
            onError={handleVideoError}
            onLoadedData={handleVideoLoad}
            onLoadStart={() => setIsLoading(true)}
          />
        ) : (
          // Placeholder content when no stream is available
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-teal-500 mx-auto mb-2" />
                  <p className="text-gray-400 font-medium text-sm">
                    Connecting to camera...
                  </p>
                </>
              ) : hasError ? (
                <>
                  <WifiOff className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 font-medium text-sm">
                    Connection failed
                  </p>
                  <button 
                    onClick={handleRefresh}
                    className="mt-2 px-3 py-1 text-xs text-teal-400 hover:text-teal-300 underline"
                  >
                    Try again
                  </button>
                </>
              ) : !isConnected ? (
                <>
                  <Video className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 font-medium text-sm">
                    Camera feed would appear here
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Connect collar camera to view live stream
                  </p>
                </>
              ) : !isPlaying ? (
                <>
                  <Pause className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 font-medium text-sm">
                    Video paused
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Tap play to start live stream
                  </p>
                </>
              ) : (
                <>
                  <Wifi className="h-8 w-8 text-teal-500 mx-auto mb-2" />
                  <p className="text-gray-400 font-medium text-sm">
                    Connecting to {petName}'s camera...
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Video overlay controls */}
        {(streamSrc || isConnected) && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              className="p-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-all duration-200"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white" />
              )}
            </button>

            {onToggleExpanded && (
              <button
                onClick={handleToggleExpanded}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-all duration-200"
                aria-label={isExpanded ? 'Minimize video' : 'Expand video'}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4 text-white" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-white" />
                )}
              </button>
            )}

            {hasError && (
              <button
                onClick={handleRefresh}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-all duration-200"
                aria-label="Refresh video"
              >
                <RotateCcw className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
        )}

        {/* Connection status indicator */}
        <div className="absolute bottom-2 left-2">
          <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
            isConnected && !hasError
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : hasError
              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
              : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {isConnected && !hasError ? (
              <>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </>
            ) : hasError ? (
              <>
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                Offline
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                Demo
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 