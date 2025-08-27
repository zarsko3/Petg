  'use client'

  import { useRouter } from 'next/navigation'
  import { Shield, Grid3X3, MapPin } from 'lucide-react'
  interface Position {
    x: number
    y: number
  }

  interface FloatingActionButtonsProps {
    position: Position | null
    onCenterOnPet?: () => void
  }

  export function FloatingActionButtons({ position, onCenterOnPet }: FloatingActionButtonsProps) {
    const router = useRouter()

    const handleCenterOnPet = () => {
      if (onCenterOnPet) {
        onCenterOnPet()
      } else if (position) {
        console.log('Centering on pet position:', position)
        // The parent component should handle the actual centering logic
      } else {
        console.log('Cannot center: position not available')
      }
    }

    return (
      <>


        {/* Right-side floating button group - Tool panel */}
        <div
          className="absolute right-4 top-1/2 -translate-y-24 z-[1000]"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="bg-gray-100/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-3 shadow-lg flex flex-col items-center gap-3">
            {/* Safety Zones */}
            <button
              onClick={() => router.push('/mobile/zones')}
              className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-sm shadow-md border border-orange-200 grid place-items-center transition-all duration-200 hover:scale-105 group cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              aria-label="Configure safety zones"
            >
              <Shield className="h-4 w-4 text-orange-600" />
              <div className="absolute -top-10 -left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Safety Zones
              </div>
            </button>

            {/* Setup Rooms */}
            <button
              onClick={() => router.push('/mobile/setup/rooms')}
              className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-sm shadow-md border border-purple-200 grid place-items-center transition-all duration-200 hover:scale-105 group cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              aria-label="Configure room layout"
            >
              <Grid3X3 className="h-4 w-4 text-purple-600" />
              <div className="absolute -top-10 -left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Setup Rooms
              </div>
            </button>



            {/* Center on Pet - Primary action */}
            <button
              onClick={handleCenterOnPet}
              className="w-14 h-14 rounded-full bg-[#4285F4] shadow-[0_8px_24px_rgba(66,133,244,0.3)] grid place-items-center transition-all duration-200 hover:scale-105 group mt-2 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              aria-label="Center map on Buddy's location"
            >
              <MapPin className="h-5 w-5 text-white" />
              <div className="absolute -top-12 -left-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Find Buddy
              </div>
            </button>


          </div>
        </div>
    </>
  )
} 