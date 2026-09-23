import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRightIcon, CartIcon } from "@/components/ui/Icons";

const STATUS: Record<string, { label: string; variant: "muted" | "warn" | "success" }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  MATCHED: { label: "Matched", variant: "warn" },
  PUSHED_TO_KROGER: { label: "In Kroger cart", variant: "success" }
};

export default async function ShoppingListsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const lists = await prisma.shoppingList.findMany({
    where: { userId },
    include: { mealPlan: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <PageHeader
        eyebrow="Off to the store"
        title="Shopping lists"
        subtitle="Every list we've put together from your meal plans, and how far along it is to your Kroger cart."
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={<CartIcon size={22} />}
          action={
            <ButtonLink href="/meal-plan" variant="secondary" size="sm">
              Go to meal plans
            </ButtonLink>
          }
        >
          No lists yet — make one from a meal plan and it'll show up here.
        </EmptyState>
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
          {lists.map((l) => {
            const s = STATUS[l.status] ?? { label: l.status, variant: "muted" as const };
            return (
              <Link key={l.id} href={`/shopping-list/${l.id}`} className="group block">
                <Card interactive className="h-full">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <span className="text-xs text-fg-faint">
                      {l.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-display text-[22px] text-fg">{l.mealPlan.name}</h3>
                  <p className="mt-1 text-sm text-fg-muted">
                    {l._count.items} item{l._count.items === 1 ? "" : "s"}
                    {l.pushedAt &&
                      ` · pushed ${l.pushedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Open list <ArrowRightIcon size={12} />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
