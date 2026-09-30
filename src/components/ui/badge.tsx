import * as React from "react"
import { cn } from "@/src/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "outline" | "secondary" | "warning" }>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary-600 text-white hover:bg-primary-700": variant === "default",
          "border-transparent bg-red-500 text-white hover:bg-red-600": variant === "destructive",
          "border-transparent bg-amber-500 text-white hover:bg-amber-600": variant === "warning",
          "text-slate-900 dark:text-slate-100": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge }
