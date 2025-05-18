import { cn } from "@/lib/utils"
import { colors } from "@/lib/theme"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface StatusCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  status: "health" | "connectivity" | "activity"
  description?: string
  className?: string
}

export function StatusCard({
  title,
  value,
  icon: Icon,
  status,
  description,
  className,
}: StatusCardProps) {
  const statusColors = {
    health: colors.health,
    connectivity: colors.connectivity,
    activity: colors.activity,
  }

  const color = statusColors[status]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800",
        className
      )}
      style={{ height: "56px" }}
    >
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color.light}20` }}
              aria-hidden="true"
            >
              <Icon
                className="h-5 w-5"
                style={{ color: color.primary }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{description || title}</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex-1 space-y-1">
          <p
            className="text-sm font-medium text-gray-500 dark:text-gray-400"
            id={`status-${title.toLowerCase()}-label`}
          >
            {title}
          </p>
          <p
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            aria-labelledby={`status-${title.toLowerCase()}-label`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  )
} 