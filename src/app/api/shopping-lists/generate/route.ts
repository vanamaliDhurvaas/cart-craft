import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { aggregateIngredients } from "@/lib/aggregate";

const GenerateSchema = z.object({ mealPlanId: z.string() });

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "mealPlanId is required." }, { status: 400 });

  const plan = await prisma.mealPlan.findFirst({
    where: { id: parsed.data.mealPlanId, userId },
    include: { entries: { include: { recipe: { include: { ingredients: true } } } } }
  });
  if (!plan) return NextResponse.json({ error: "Meal plan not found." }, { status: 404 });
  if (plan.entries.length === 0) {
    return NextResponse.json({ error: "This meal plan has no recipes assigned yet." }, { status: 400 });
  }

  const inputs = plan.entries.flatMap((entry) =>
    entry.recipe.ingredients.map((ing) => ({
      ingredient: {
        rawLine: ing.rawLine,
        quantity: ing.quantity,
        unit: ing.unit,
        name: ing.name,
        notes: ing.notes
      },
      multiplier: entry.servingsMultiplier
    }))
  );

  const aggregated = aggregateIngredients(inputs);

  const shoppingList = await prisma.shoppingList.create({
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

  return NextResponse.json(shoppingList, { status: 201 });
}
