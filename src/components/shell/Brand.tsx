import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logo mark + wordmark. The mark is a little woven market basket — the
 * "cart" in CartCraft, drawn with a craft/handmade feel rather than a
 * generic wire supermarket cart. `wordmark` controls when the text shows:
 * always, only from `md` up, or never.
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
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8.5 9.3C8.5 6.1 9.9 4 12 4s3.5 2.1 3.5 5.3" />
          <path d="M5.3 9.3h13.4l-1.7 9.2a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6z" />
          <path d="M6.6 12.6h10.8" />
          <path d="M7.3 15.9h9.4" />
        </svg>
      </span>
      {wordmark !== "never" && (
        <span
          className={cn(
            "font-display text-[20px] font-medium tracking-tight text-fg",
            wordmark === "md" && "hidden md:inline"
          )}
        >
          CartCraft
        </span>
      )}
    </Link>
  );
}
