export function EmptyState({
  icon,
  children,
  action
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-control)] border-2 border-dashed border-line-strong/70 bg-surface-2/60 px-6 py-10 text-center">
      {icon && (
        <div className="blob animate-wiggle mb-3 flex h-14 w-14 items-center justify-center bg-accent-soft text-2xl text-accent">
          {icon}
        </div>
      )}
      <p className="max-w-sm text-[15px] leading-relaxed text-fg-muted">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
