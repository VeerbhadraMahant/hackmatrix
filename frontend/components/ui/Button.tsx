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
        "inline-flex items-center justify-center gap-2 rounded-chip font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
        variant === "primary" && "bg-ember text-paper hover:bg-ember-dark",
        variant === "secondary" && "border border-mist text-ink hover:bg-fog",
        variant === "ghost" && "text-graphite hover:bg-fog",
        className
      )}
      {...props}
    />
  );
}
