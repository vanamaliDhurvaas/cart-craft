"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { MoonIcon, SunIcon } from "@/components/ui/Icons";

/** Day / evening switch. Light (cream) is the default look. */
export function ThemeToggle({ className }: { className?: string }) {
  // Start unknown so the server and first client render agree; read the real
  // value (set by ThemeScript) after mount.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* private mode etc. — theme still applies for this page load */
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to daytime look" : "Switch to evening look"}
      title={dark ? "Daytime" : "Evening"}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-solid text-fg-muted shadow-card",
        "transition-all duration-300 hover:-translate-y-px hover:border-line-strong hover:text-amber active:scale-95",
        className
      )}
    >
      <span
        className={cn(
          "absolute transition-all duration-500",
          dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
        )}
      >
        <SunIcon size={18} />
      </span>
      <span
        className={cn(
          "absolute transition-all duration-500",
          dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}
      >
        <MoonIcon size={18} />
      </span>
    </button>
  );
}
