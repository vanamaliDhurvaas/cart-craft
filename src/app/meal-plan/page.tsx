import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreatePlanForm, AddEntryForm, GenerateListButton, PlanHeader, EntryRow } from "./MealPlanForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarIcon, PlusIcon, ChevronRightIcon } from "@/components/ui/Icons";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function MealPlanPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [plans, recipes] = await Promise.all([
    prisma.mealPlan.findMany({
      where: { userId },
      include: { entries: { include: { recipe: true }, orderBy: { date: "asc" } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.recipe.findMany({ where: { userId }, select: { id: true, title: true }, orderBy: { title: "asc" } })
  ]);

  return (
    <>
      <PageHeader
        eyebrow="The week ahead"
        title="Meal plan"
        subtitle="Pick any stretch of days — a weekend, a week, a whole month — and decide what's for dinner."
      />

      <div className="stagger space-y-4">
        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--glow-b), transparent 70%)" }}
            aria-hidden
          />
          <div className="relative">
            <CardTitle className="mb-1 flex items-center gap-2">
              <PlusIcon size={18} className="text-accent" />
              New plan
            </CardTitle>
            <CreatePlanForm />
          </div>
        </Card>

        {plans.length === 0 && (
          <EmptyState icon={<CalendarIcon size={22} />}>No plans yet — start one above and we'll take it from there.</EmptyState>
        )}

        {plans.map((plan) => (
          <Card key={plan.id}>
            <PlanHeader
              plan={{ id: plan.id, name: plan.name, startDate: fmt(plan.startDate), endDate: fmt(plan.endDate) }}
              entryCount={plan.entries.length}
            />

            {plan.entries.length === 0 ? (
              <p className="rounded-[var(--radius-control)] border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-center text-sm text-fg-muted">
                Nothing on the menu yet — add a recipe below.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {plan.entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    planId={plan.id}
                    recipes={recipes}
                    entry={{
                      id: e.id,
                      date: fmt(e.date),
                      mealType: e.mealType,
                      servingsMultiplier: e.servingsMultiplier,
                      recipeId: e.recipeId,
                      recipeTitle: e.recipe.title
                    }}
                  />
                ))}
              </ul>
            )}

            <details className="group mt-4 rounded-[var(--radius-control)] border border-line bg-surface-2">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-accent [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <PlusIcon size={16} />
                  Add a recipe to this plan
                </span>
                <ChevronRightIcon size={16} className="transition-transform duration-300 group-open:rotate-90" />
              </summary>
              <div className="border-t border-line px-4 pb-4">
                <AddEntryForm planId={plan.id} recipes={recipes} />
              </div>
            </details>

            {plan.entries.length > 0 && <GenerateListButton planId={plan.id} />}
          </Card>
        ))}
      </div>
    </>
  );
}
