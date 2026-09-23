import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KrogerStoreForm } from "./KrogerStoreForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon, LinkIcon, StoreIcon } from "@/components/ui/Icons";

export default async function KrogerSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const { connected: justConnected } = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const connected = Boolean(user.krogerAccessToken);

  return (
    <>
      <PageHeader
        eyebrow="Your store"
        title="Kroger account"
        subtitle="Connect your Kroger account so we can push your shopping list straight into your real cart. You'll still open the Kroger app to review and pay — no third-party app can submit payment for you."
        actions={
          <Badge variant={connected ? "success" : "warn"}>{connected ? "Connected" : "Not connected"}</Badge>
        }
      />

      {justConnected && <Alert variant="success">Kroger account connected — now pick your store below.</Alert>}

      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--accent-glow), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon size={18} className="text-accent" />
              Connection
            </CardTitle>
            {connected ? (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                  <CheckIcon size={14} strokeWidth={3} />
                </span>
                <div>
                  <p className="font-medium text-fg">Your Kroger account is linked.</p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Access tokens refresh automatically whenever you push items to your cart.
                  </p>
                  <ButtonLink href="/api/kroger/connect" variant="ghost" size="sm" className="mt-4 -ml-3">
                    Reconnect
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <>
                <p className="mb-5 text-sm leading-relaxed text-fg-muted">
                  You&apos;ll be sent to Kroger to sign in and approve cart access, then brought right back here.
                </p>
                <ButtonLink href="/api/kroger/connect">
                  <LinkIcon size={16} />
                  Connect Kroger account
                </ButtonLink>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon size={18} className="text-accent" />
            Preferred store
          </CardTitle>
          <p className="mb-5 text-sm leading-relaxed text-fg-muted">
            Item availability, pricing, and cart pushes all use this store location.
          </p>
          <KrogerStoreForm currentLocationId={user.krogerLocationId} />
        </Card>
      </div>
    </>
  );
}
