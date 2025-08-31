'use client';

import dynamic from "next/dynamic";

// Dynamically import the client component with SSR disabled
const RoomsClient = dynamic(() => import("./RoomsClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-gray-600">Loading room setup...</p>
      </div>
    </div>
  ),
});

// Simple client component that renders the dynamic import
export default function Page() {
  return <RoomsClient />;
}