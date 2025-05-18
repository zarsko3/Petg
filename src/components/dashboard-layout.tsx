import { cn } from "@/lib/utils"
import { spacing } from "@/lib/theme"

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div
        className={cn(
          "grid gap-6 p-4 pt-20 md:grid-cols-6 lg:grid-cols-12 xl:gap-8",
          className
        )}
      >
        {/* Main content area - 8 columns on large screens */}
        <div className="space-y-6 md:col-span-4 lg:col-span-8">
          {/* Activity Tracker */}
          <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
            {children}
          </div>
        </div>

        {/* Right sidebar - 4 columns on large screens */}
        <div className="space-y-6 md:col-span-2 lg:col-span-4">
          {/* Status Cards */}
          <div className="grid gap-4">
            {/* Status cards will be rendered here */}
          </div>

          {/* Daily Statistics */}
          <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Daily Statistics
            </h3>
            <div className="space-y-4">
              {/* Statistics content will be rendered here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 