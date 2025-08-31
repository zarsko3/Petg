// Server component that only does dynamic import with SSR disabled
// This ensures no client code runs during build

// Force dynamic rendering
export const dynamic = "force-dynamic";

import dynamic from 'next/dynamic'

// Dynamically import the client component with SSR disabled
// This ensures all React hooks, Clerk auth, and browser APIs only run on client
const RoomsClient = dynamic(() => import('./RoomsClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-gray-600">Loading room setup...</p>
      </div>
    </div>
  ),
})

// Simple server component that just renders the client component
export default function RoomSetupPage() {
  return <RoomsClient />
}