import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold " +
  "transition-all duration-300 ease-out select-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0 " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 " +
  "active:scale-[0.97]";

const variants = {
  primary:
    "bg-accent text-accent-fg shadow-glow hover:bg-accent-strong hover:shadow-glow-lg hover:-translate-y-0.5",
  secondary:
    "border border-line-strong bg-surface-solid text-fg shadow-card hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger/20"
};

const sizes = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-7 text-base"
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
);
Button.displayName = "Button";

export interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}

/** Same visual system as Button, for actions that navigate rather than submit. */
export function ButtonLink({ className, variant = "primary", size = "md", ...props }: ButtonLinkProps) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
