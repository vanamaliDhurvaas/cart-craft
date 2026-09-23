/** Centered paper card with a soft sage halo, used by the login and signup pages. */
export function AuthCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto max-w-md py-6 sm:py-10">
      <div
        className="animate-blob pointer-events-none absolute left-1/2 top-2 h-72 w-[440px] -translate-x-1/2 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--glow-a), transparent 72%)" }}
        aria-hidden
      />
      <div className="paper animate-fade-up relative border border-line bg-surface-solid p-7 shadow-card-hover sm:p-9">
        <h1 className="font-display text-3xl text-fg sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
