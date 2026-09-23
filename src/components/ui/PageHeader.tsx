export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned slot for a primary action or status. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 font-display text-[15px] italic text-accent">{eyebrow}</p>}
        <h1 className="font-display text-[34px] leading-[1.1] text-fg sm:text-[42px]">{title}</h1>
        {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
