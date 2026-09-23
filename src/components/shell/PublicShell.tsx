import Link from "next/link";
import { Brand } from "./Brand";
import { BackgroundGlow } from "./BackgroundGlow";
import { ThemeToggle } from "./ThemeToggle";

/** Layout for logged-out visitors: warm top bar, centered content, small footer. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <BackgroundGlow />
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-5 sm:px-8">
          <Brand wordmark="md" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:text-fg sm:px-3.5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-glow transition-all duration-300 hover:-translate-y-px hover:bg-accent-strong hover:shadow-glow-lg active:scale-[0.98]"
            >
              Start cooking
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 lg:py-14">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-5 pb-8 pt-4 sm:px-8">
        <div className="divider-wavy mb-4" aria-hidden />
        <p className="text-center text-xs text-fg-faint">Made for home cooks · Meal Prep</p>
      </footer>
    </div>
  );
}
