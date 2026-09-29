"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "finpilot-theme";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Polished dark/light theme toggle component with Framer Motion tactile physics,
 * animated Sun/Moon icons, localStorage persistence, system preference fallback,
 * and graceful SSR hydration handling.
 */
export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialDark = saved ? saved === "dark" : prefersDark;

      setIsDark(initialDark);
      document.documentElement.classList.toggle("dark", initialDark);
    } catch {
      // In restricted iframe or non-browser environments, safely fallback
    } finally {
      setMounted(true);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
    } catch {
      // Storage access may fail in private browsing mode
    }
  };

  // SSR hydration safeguard: avoid mismatched initial server markup
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label="Toggle theme"
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-chip border border-mist bg-paper/60 text-graphite opacity-60",
          className
        )}
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-chip border border-mist bg-paper/80 text-graphite hover:text-ink hover:bg-fog backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        showLabel ? "h-9 px-3 gap-2 text-xs font-medium" : "h-9 w-9",
        className
      )}
    >
      <div className="relative h-4 w-4 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.svg
              key="moon"
              initial={{ scale: 0.4, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, rotate: 45, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ember"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </motion.svg>
          ) : (
            <motion.svg
              key="sun"
              initial={{ scale: 0.4, rotate: 45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.4, rotate: -45, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-500"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="text-ink font-medium">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </motion.button>
  );
}

export default ThemeToggle;
