"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";
import { Brand } from "./Brand";
import { BackgroundGlow } from "./BackgroundGlow";
import { BookIcon, CalendarIcon, CartIcon, HomeIcon, LogOutIcon, StoreIcon } from "@/components/ui/Icons";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon, exact: true },
  { href: "/recipes", label: "Recipes", icon: BookIcon },
  { href: "/meal-plan", label: "Meal plan", icon: CalendarIcon },
  { href: "/shopping-list", label: "Shopping", icon: CartIcon },
  { href: "/settings/kroger", label: "Kroger", icon: StoreIcon }
];

/**
 * Cozy top-nav layout for signed-in users: one warm header with a rounded
 * "tray" of nav pills, content centered underneath with plenty of air, and
 * a small footer. No sidebar — it should feel like a kitchen notebook, not
 * an admin console.
 */
export function AppShell({
  user,
  children
}: {
  user: { name: string | null; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();
  const firstName = user.name?.trim().split(" ")[0];

  const pills = (
    <nav
      aria-label="Main"
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface-solid p-1 shadow-card"
    >
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all duration-300 sm:px-3.5",
              active ? "bg-accent text-accent-fg shadow-glow" : "text-fg-muted hover:bg-surface-2 hover:text-fg active:scale-[0.97]"
            )}
          >
            <Icon
              size={16}
              className={cn("shrink-0 transition-transform duration-300", !active && "group-hover:-rotate-6 group-hover:scale-110")}
            />
            <span className={cn(active ? "inline" : "hidden sm:inline")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      <BackgroundGlow />

      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
          <Brand wordmark="md" />

          {/* Desktop nav sits in the middle of the bar */}
          <div className="hidden md:block">{pills}</div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="ml-1 flex items-center gap-2 rounded-full border border-line bg-surface-solid py-1 pl-1 pr-1 shadow-card sm:pr-3">
              <span className="blob flex h-8 w-8 items-center justify-center bg-amber-soft font-display text-sm font-semibold text-amber">
                {initials}
              </span>
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-fg sm:inline">
                {firstName || "Your kitchen"}
              </span>
              <Link
                href="/api/auth/signout"
                title="Sign out"
                aria-label="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-full text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <LogOutIcon size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile nav: scrollable row under the bar */}
        <div className="mx-auto max-w-5xl overflow-x-auto px-5 pb-3 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max">{pills}</div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">{children}</div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-8 pt-4 sm:px-8">
        <div className="divider-wavy mb-4" aria-hidden />
        <p className="text-center text-xs text-fg-faint">
          Made for home cooks · You always review and pay in the Kroger app — we just fill the cart.
        </p>
      </footer>
    </div>
  );
}
