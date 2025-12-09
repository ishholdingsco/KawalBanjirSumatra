import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", noHover = false, ...props }) {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 bg-white text-gray-900",
    none: "", // No default styling - useful for custom colors
  }

  // Base classes - conditionally include transition-colors
  const baseClasses = cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    !noHover && "transition-colors" // Only add transition if hover is enabled
  );

  return (
    <div
      className={cn(
        baseClasses,
        !noHover && variants[variant], // Only apply variant (with hover) if hover is enabled
        className
      )}
      {...props}
    />
  )
}

export { Badge }
