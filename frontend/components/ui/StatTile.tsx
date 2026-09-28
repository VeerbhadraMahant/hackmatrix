import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-display text-3xl sm:text-4xl text-ink leading-none">{value}</span>
      <span className="text-xs uppercase tracking-wide text-pewter">{label}</span>
      {sub ? <span className="text-xs text-graphite">{sub}</span> : null}
    </div>
  );
}
