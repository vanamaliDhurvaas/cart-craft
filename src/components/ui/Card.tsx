import { cn } from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lift + warm shadow on hover — for cards that are (or contain) a primary action. */
  interactive?: boolean;
  /** Tighter padding for dense content (e.g. stat tiles). */
  dense?: boolean;
}

/** A sheet of cream paper: soft rounded corners, hairline edge, warm shadow. */
export function Card({ className, interactive = false, dense = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-card)] border border-line bg-surface shadow-card backdrop-blur-xl",
        dense ? "p-4 sm:p-5" : "p-5 sm:p-6",
        interactive &&
          "transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-[-0.4deg] hover:border-line-strong hover:shadow-card-hover",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("mb-4 font-display text-[22px] text-fg", className)} {...props} />;
}

/** Small italic serif label above a title or section — like a note in the margin. */
export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mb-1.5 font-display text-sm italic text-accent", className)} {...props} />
  );
}
