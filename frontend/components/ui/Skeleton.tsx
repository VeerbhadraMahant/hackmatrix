import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * A simple pulsing placeholder block for loading states, in place of a bare
 * "Loading..." string. Sizing is left to the caller via className (e.g.
 * "h-4 w-32" for a text line, "h-48 w-full" for a chart placeholder).
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-skeleton-pulse rounded-chip bg-fog", className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}
