import { cn } from "@/lib/utils";

/**
 * Renders a 0-1 confidence as a small chip. Visual weight scales with
 * confidence: high confidence reads as a solid, filled chip; low confidence
 * reads as tentative (dashed border, lighter text) -- without introducing a
 * second accent color.
 */
export function ConfidenceChip({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const tier = value >= 0.75 ? "high" : value >= 0.45 ? "medium" : "low";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-2 py-0.5 text-xs font-medium",
        tier === "high" && "border border-mist bg-fog text-graphite",
        tier === "medium" && "border border-mist text-pewter",
        tier === "low" && "border border-dashed border-mist text-steel",
        className
      )}
      title={`Confidence: ${pct}%`}
    >
      {pct}% confidence
    </span>
  );
}
