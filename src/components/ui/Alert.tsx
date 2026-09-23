import { cn } from "@/lib/cn";

const variants = {
  info: "border-line bg-surface-2 text-fg-muted before:bg-fg-faint",
  warn: "border-amber/25 bg-amber-soft text-fg before:bg-amber",
  success: "border-accent/25 bg-accent-soft text-fg before:bg-accent",
  error: "border-danger/25 bg-danger-soft text-fg before:bg-danger"
};

/** A gentle note with a colored ribbon down the left edge. */
export function Alert({
  variant = "info",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      className={cn(
        "animate-fade-up relative mb-5 overflow-hidden rounded-[var(--radius-control)] border py-3 pl-5 pr-4 text-sm leading-relaxed",
        "before:absolute before:inset-y-2 before:left-1.5 before:w-1 before:rounded-full",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
