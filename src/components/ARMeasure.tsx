'use client'

import { useState, useCallback, useRef, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ARButton, Interactive, XR, createXRStore } from '@react-three/xr'
import * as THREE from 'three'
import { X, MapPin, RotateCcw, Check, AlertTriangle } from 'lucide-react'
import { Point3D, to2D, normalise, validateFloorPlan } from '@/lib/floorPlan'

interface ARMeasureProps {
  onFinish: (points: Point3D[]) => void
  onCancel: () => void
  isVisible: boolean
}

interface ReticleProps {
  onSelect: (position: THREE.Vector3) => void
  points: THREE.Vector3[]
}

// Reticle component for hit testing
function Reticle({ onSelect, points }: ReticleProps) {
  const reticleRef = useRef<THREE.Mesh>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  // Simple reticle geometry - a ring with a dot in the center
  return (
    <group>
      {/* Reticle ring */}
      <mesh ref={reticleRef} visible={isVisible}>
        <ringGeometry args={[0.05, 0.07, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0.8} />
      </mesh>
      
      {/* Center dot */}
      <mesh visible={isVisible}>
        <sphereGeometry args={[0.01]} />
        <meshBasicMaterial color="white" />
      </mesh>
      
      {/* Captured points visualization */}
      {points.map((point, index) => (
        <group key={index} position={point}>
          {/* Point marker */}
          <mesh>
            <sphereGeometry args={[0.03]} />
            <meshBasicMaterial color={index === 0 ? '#10B981' : '#3B82F6'} />
          </mesh>
          
          {/* Point label */}
          <mesh position={[0, 0.1, 0]}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshBasicMaterial 
              color="white" 
              transparent 
              opacity={0.9}
            />
          </mesh>
          
          {/* Connect points with lines - simplified approach */}
          {index > 0 && (
            <mesh>
              <cylinderGeometry args={[0.001, 0.001, point.distanceTo(points[index - 1])]} />
              <meshBasicMaterial color="#3B82F6" />
            </mesh>
          )}
          
          {/* Close the polygon if we have enough points */}
          {index === points.length - 1 && points.length > 2 && (
            <mesh>
              <cylinderGeometry args={[0.001, 0.001, point.distanceTo(points[0])]} />
              <meshBasicMaterial color="#10B981" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

// AR Scene component
function ARScene({ onPointCapture, points, store }: { 
  onPointCapture: (position: THREE.Vector3) => void
  points: THREE.Vector3[]
  store: any
}) {
  const handleSelect = useCallback((position: THREE.Vector3) => {
    // Snap to floor (y = 0 or hit test result)
    const floorPosition = new THREE.Vector3(position.x, 0, position.z)
    onPointCapture(floorPosition)
  }, [onPointCapture])

  return (
    <XR store={store}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Hit test reticle */}
        <Interactive onSelect={() => {
          // This will be called when user taps in AR
          // For now, we'll simulate a hit test at origin
          const position = new THREE.Vector3(0, 0, 0)
          handleSelect(position)
        }}>
          <Reticle onSelect={handleSelect} points={points} />
        </Interactive>
      </Suspense>
    </XR>
  )
}

export function ARMeasure({ onFinish, onCancel, isVisible }: ARMeasureProps) {
  const [points, setPoints] = useState<THREE.Vector3[]>([])
  const [isARActive, setIsARActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Create XR store
  const store = createXRStore()

  const handlePointCapture = useCallback((position: THREE.Vector3) => {
    setPoints(prev => [...prev, position.clone()])
    setError(null)
  }, [])

  const handleUndo = useCallback(() => {
    setPoints(prev => prev.slice(0, -1))
    setError(null)
  }, [])

  const handleReset = useCallback(() => {
    setPoints([])
    setError(null)
  }, [])

  const handleFinish = useCallback(async () => {
    try {
      setIsProcessing(true)
      setError(null)

      if (points.length < 3) {
        setError('At least 3 points required to create a floor plan')
        return
      }

      // Convert Three.js Vector3 to Point3D
      const point3Ds: Point3D[] = points.map(p => ({ x: p.x, y: p.y, z: p.z }))
      
      // Convert to 2D and validate
      const point2Ds = to2D(point3Ds)
      const validation = validateFloorPlan(point2Ds)
      
      if (!validation.valid) {
        setError(validation.error || 'Invalid floor plan')
        return
      }

      // Normalize and finish
      const normalized = normalise(point2Ds)
      console.log('AR Floor plan captured:', { point3Ds, normalized })
      
      onFinish(point3Ds)
    } catch (error) {
      console.error('Error processing AR floor plan:', error)
      setError('Failed to process floor plan. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [points, onFinish])

  const canFinish = points.length >= 3 && !isProcessing

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* AR Canvas */}
      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 1.6, 0], fov: 75 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(window.devicePixelRatio)
          gl.setSize(window.innerWidth, window.innerHeight)
        }}
      >
        {/* AR Scene with XR support */}
        <ARScene onPointCapture={handlePointCapture} points={points} store={store} />
      </Canvas>

      {/* AR Button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <ARButton
          store={store}
          style={{
            background: isARActive ? '#EF4444' : '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer'
          }}
        >
          {(status) => {
            switch (status) {
              case 'unsupported':
                return 'AR Not Supported'
              case 'exited':
                setIsARActive(false)
                return 'Start AR'
              case 'entered':
                setIsARActive(true)
                return 'Exit AR'
              default:
                return 'Start AR'
            }
          }}
        </ARButton>
      </div>

      {/* Instructions Overlay */}
      <div className="absolute top-20 left-4 right-4 z-10">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold">Room Mapping</h3>
          </div>
          <p className="text-sm text-gray-200 mb-2">
            {isARActive 
              ? 'Move your phone slowly to detect the floor, then tap each corner of the room'
              : 'Tap "Start AR" to begin room mapping'
            }
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-300">
            <span>Points captured: {points.length}</span>
            <span>Minimum needed: 3</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-40 left-4 right-4 z-10">
          <div className="bg-red-500/90 backdrop-blur-sm rounded-xl p-4 text-white">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-4 right-4 z-10 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between gap-4">
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-3 bg-gray-700/80 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-gray-600/80 transition-all"
          >
            <X className="h-5 w-5" />
            Cancel
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {points.length > 0 && (
              <>
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600/80 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-blue-500/80 transition-all"
                >
                  <RotateCcw className="h-5 w-5" />
                  Undo
                </button>
                
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-red-600/80 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-red-500/80 transition-all"
                >
                  Reset
                </button>
              </>
            )}

            {canFinish && (
              <button
                onClick={handleFinish}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600/80 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-emerald-500/80 transition-all disabled:opacity-50"
              >
                <Check className="h-5 w-5" />
                {isProcessing ? 'Processing...' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 