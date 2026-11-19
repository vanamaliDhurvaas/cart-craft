import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { aggregateIngredients } from "@/lib/aggregate";

const QuickOrderSchema = z.object({
  servingsMultiplier: z.coerce.number().positive().max(50).default(1)
});

/**
 * "Quick order" a single recipe: skip the full meal-plan UI entirely. Under
 * the hood this still creates a meal plan (the schema requires every
 * shopping list to belong to one), but it's a same-day, one-entry plan the
 * user never sees or names themselves — the response is just the finished
 * shopping list, ready to review and push to Kroger.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: recipeId } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = QuickOrderSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "servingsMultiplier must be a positive number." }, { status: 400 });
  }
  const { servingsMultiplier } = parsed.data;

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { ingredients: true }
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  if (recipe.ingredients.length === 0) {
    return NextResponse.json(
      { error: "This recipe has no ingredients yet — add some before ordering." },
      { status: 400 }
    );
  }

  const today = new Date();
  const aggregated = aggregateIngredients(
    recipe.ingredients.map((ing) => ({
      ingredient: {
        rawLine: ing.rawLine,
        quantity: ing.quantity,
        unit: ing.unit,
        name: ing.name,
        notes: ing.notes
      },
      multiplier: servingsMultiplier
    }))
  );

  const shoppingList = await prisma.$transaction(async (tx) => {
    const plan = await tx.mealPlan.create({
      data: {
        userId,
        name: `Quick order: ${recipe.title}`,
        startDate: today,
        endDate: today
      }
    });

    await tx.mealPlanEntry.create({
      data: {
        mealPlanId: plan.id,
        recipeId: recipe.id,
        date: today,
        servingsMultiplier
      }
    });

    return tx.shoppingList.create({
      data: {
        userId,
        mealPlanId: plan.id,
        status: "DRAFT",
        items: {
          create: aggregated.map((item) => ({
            ingredientName: item.name,
            quantity: item.quantity,
            unit: item.unit
          }))
        }
      },
      include: { items: true }
    });
  });

  return NextResponse.json(shoppingList, { status: 201 });
}
