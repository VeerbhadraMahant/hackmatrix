import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

/**
 * primary = Ember fill, exactly one CTA per view.
 * secondary = outline, Ink text.
 * ghost = no border, for tertiary actions (e.g. nav, example prompts).
 */
export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-chip font-semibold transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none",
        // min-height keeps tap targets >=44px on the default size without
        // changing the button's declared padding/text scale.
        size === "md" ? "min-h-11 px-4 py-2 text-sm" : "min-h-9 px-3 py-1.5 text-xs",
        variant === "primary" && "bg-ember text-paper hover:bg-ember-dark",
        variant === "secondary" && "border border-mist text-ink hover:bg-fog",
        variant === "ghost" && "text-graphite hover:bg-fog",
        className
      )}
      {...props}
    />
  );
}
