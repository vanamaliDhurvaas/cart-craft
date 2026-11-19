import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Providers } from "./providers";
import { cn } from "@/lib/cn";
import { ThemeScript } from "@/components/shell/ThemeScript";
import { AppShell } from "@/components/shell/AppShell";
import { PublicShell } from "@/components/shell/PublicShell";
import "./globals.css";

// Fraunces is a "soft" variable serif — we load its optical-size and
// softness axes so headings can render in the rounder, friendlier cut.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"]
});
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "CartCraft — recipes to a Kroger cart",
  description: "Save the recipes you love, plan your week, and let CartCraft fill your Kroger cart."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
    : null;

  // suppressHydrationWarning: ThemeScript adds the "dark" class to <html>
  // before hydration (and some browser extensions inject attributes there
  // too). This only suppresses the warning for this element.
  return (
    <html lang="en" className={cn(fraunces.variable, nunito.variable)} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <Providers>
          {user ? <AppShell user={user}>{children}</AppShell> : <PublicShell>{children}</PublicShell>}
        </Providers>
      </body>
    </html>
  );
}
