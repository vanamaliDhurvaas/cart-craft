import { cn } from "@/lib/cn";

const variants = {
  default: "bg-accent-soft text-accent",
  success: "bg-accent-soft text-accent",
  muted: "bg-surface-3 text-fg-muted",
  warn: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger"
};

/** Little rounded label — like a sticker on a jar. */
export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
