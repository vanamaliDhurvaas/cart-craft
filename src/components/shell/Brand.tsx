import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logo mark + wordmark. The mark is a little sage blob with a sprig inside —
 * meant to feel like a stamp on a jar label, not a tech logo.
 * `wordmark` controls when the text shows: always, only from `md` up, or never.
 */
export function Brand({
  className,
  wordmark = "always"
}: {
  className?: string;
  wordmark?: "always" | "md" | "never";
}) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "blob relative flex h-10 w-10 items-center justify-center bg-accent text-accent-fg shadow-glow",
          "transition-transform duration-500 ease-out group-hover:rotate-[-8deg] group-hover:scale-105"
        )}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 21V10" />
          <path d="M12 14c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6z" />
          <path d="M12 11c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z" />
          <path d="M8 21h8" />
        </svg>
      </span>
      {wordmark !== "never" && (
        <span
          className={cn(
            "font-display text-[20px] font-medium tracking-tight text-fg",
            wordmark === "md" && "hidden md:inline"
          )}
        >
          Meal Prep
        </span>
      )}
    </Link>
  );
}
