import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "outline";
}

/** 6px-radius chip for categories, tags, status labels. */
export function Chip({ className, tone = "neutral", ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-medium transition-colors duration-150",
        tone === "neutral" && "bg-fog text-graphite",
        tone === "accent" && "bg-ember/10 text-ember-dark",
        tone === "outline" && "border border-mist text-graphite",
        className
      )}
      {...props}
    />
  );
}
