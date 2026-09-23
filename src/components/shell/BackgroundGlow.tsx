/**
 * Three slow, softly morphing color blobs behind everything — sage, peach
 * and a warm sand tone. Pure CSS, pointer-events off, tinted via theme
 * variables so it reads as sunlit paper in the day look and lamplight in the
 * evening look.
 */
export function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-float absolute -top-32 left-[-6%] h-[520px] w-[560px] blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--glow-a), transparent 72%)" }}
      />
      <div
        className="animate-float-slow absolute -bottom-40 right-[-8%] h-[600px] w-[640px] blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--glow-b), transparent 72%)" }}
      />
      <div
        className="animate-float-slow absolute top-[35%] left-[45%] h-[420px] w-[520px] blur-3xl [animation-delay:-6s]"
        style={{ background: "radial-gradient(closest-side, var(--glow-c), transparent 72%)" }}
      />
    </div>
  );
}
