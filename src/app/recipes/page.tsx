import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RecipeIngestCard, ManualRecipeCard, RecipeCard } from "./RecipeForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BookIcon } from "@/components/ui/Icons";

export default async function RecipesPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const recipes = await prisma.recipe.findMany({
    where: { userId },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <PageHeader
        eyebrow="Your recipe box"
        title="Recipes"
        subtitle="Paste a link from a video or a recipe page, or jot one down yourself — we'll tidy up the ingredients."
      />

      <div className="stagger space-y-4">
        <RecipeIngestCard />
        <ManualRecipeCard />
      </div>

      <section id="recipe-list" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-fg">
            In the box <span className="font-sans text-base text-fg-faint">({recipes.length})</span>
          </h2>
          {recipes.length > 0 && (
            <a href="/meal-plan" className="text-sm font-semibold text-accent hover:text-accent-strong">
              Plan these →
            </a>
          )}
        </div>

        {recipes.length === 0 ? (
          <EmptyState icon={<BookIcon size={22} />}>Nothing saved yet — paste a link above and we'll add your first one.</EmptyState>
        ) : (
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
