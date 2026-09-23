import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MatchButton, ItemRow, PushToCartButton, ResetCartButton } from "./ShoppingListActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/cn";

const STATUS: Record<string, { label: string; variant: "muted" | "warn" | "success" }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  MATCHED: { label: "Matched", variant: "warn" },
  PUSHED_TO_KROGER: { label: "In Kroger cart", variant: "success" }
};

export default async function ShoppingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [list, user] = await Promise.all([
    prisma.shoppingList.findFirst({
      where: { id, userId },
      include: { items: { orderBy: { ingredientName: "asc" } }, mealPlan: true }
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } })
  ]);
  if (!list) notFound();

  const unresolvedNote = list.items.filter((i) => i.quantity === 0).length;
  const matchedCount = list.items.filter((i) => i.krogerProductId).length;
  const readyCount = list.items.filter((i) => i.userConfirmed && i.krogerProductId && !i.addedToCart).length;
  const inCartCount = list.items.filter((i) => i.addedToCart).length;
  const hasInCartItems = inCartCount > 0;
  const status = STATUS[list.status] ?? { label: list.status, variant: "muted" as const };

  return (
    <>
      <PageHeader
        eyebrow="Shopping list"
        title={list.mealPlan.name}
        subtitle={`${list.items.length} ingredients combined from every recipe in this plan.`}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Link href="/shopping-list" className="text-sm font-medium text-fg-muted hover:text-fg">
              All lists
            </Link>
          </div>
        }
      />

      {unresolvedNote > 0 && (
        <Alert variant="warn">
          {unresolvedNote} item(s) had quantities we couldn&apos;t confidently combine (mixed units, or &quot;to
          taste&quot;) — they&apos;re flagged <strong>review</strong> below. Double-check those before pushing.
        </Alert>
      )}

      {/* Progress rail */}
      <ol className="stagger mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <ProgressStep n={1} label="Match" done={matchedCount === list.items.length && list.items.length > 0} active={matchedCount === 0} />
        <ProgressStep n={2} label="Review" done={readyCount + inCartCount === list.items.length && list.items.length > 0} active={matchedCount > 0 && readyCount === 0 && inCartCount === 0} />
        <ProgressStep n={3} label="Push to cart" done={inCartCount === list.items.length && list.items.length > 0} active={readyCount > 0} />
      </ol>

      <div className="stagger space-y-4">
        <Card>
          <StepTitle n={1} title="Match to Kroger products" />
          <MatchButton
            listId={list.id}
            hasStore={Boolean(user.krogerLocationId)}
            matchedCount={matchedCount}
            total={list.items.length}
          />
        </Card>

        <Card className="p-0!">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <StepTitle n={2} title="Review & confirm" />
            <p className="-mt-2 mb-2 text-sm text-fg-muted">
              Tick each item you want, swap in a different product if the match isn&apos;t right.
            </p>
          </div>
          <ul className="divide-y divide-line px-5 sm:px-6">
            {list.items.map((item) => (
              <ItemRow key={item.id} item={item} listId={list.id} />
            ))}
          </ul>
          <div className="h-3" />
        </Card>

        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--accent-glow), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative">
            <StepTitle n={3} title="Push to your Kroger cart" />
            <p className="-mt-2 mb-5 text-sm leading-relaxed text-fg-muted">
              Only checked, matched items get added — and we work out how many packages you actually need. You&apos;ll
              still confirm and pay in the Kroger app; no app can submit payment on your behalf.
            </p>
            <PushToCartButton listId={list.id} readyCount={readyCount} />
            {hasInCartItems && <ResetCartButton listId={list.id} />}
          </div>
        </Card>
      </div>
    </>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft font-display text-xs font-semibold text-accent ring-1 ring-accent/20">
        {n}
      </span>
      <h2 className="font-display text-[22px] text-fg">{title}</h2>
    </div>
  );
}

function ProgressStep({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2.5 text-sm transition-colors",
        done
          ? "border-accent/30 bg-accent-soft text-accent"
          : active
            ? "border-line-strong bg-surface text-fg"
            : "border-line bg-surface-2 text-fg-faint"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          done ? "bg-accent text-accent-fg" : active ? "bg-amber text-accent-fg" : "bg-surface-3 text-fg-muted"
        )}
      >
        {done ? "✓" : n}
      </span>
      <span className="truncate font-medium">{label}</span>
    </li>
  );
}
