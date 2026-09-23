/**
 * Runs before React hydrates so the correct theme class is on <html> from
 * the very first paint — no flash of the wrong theme. The warm cream (light)
 * look is the default; "evening" mode only turns on when the user has
 * explicitly chosen it via the toggle (we don't follow the OS preference,
 * since the light palette is the intended look).
 * <html> has suppressHydrationWarning so React tolerates the class it adds.
 */
const script = `
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
