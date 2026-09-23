import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const EntrySchema = z.object({
  recipeId: z.string(),
  date: z.string(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).default("DINNER"),
  servingsMultiplier: z.number().positive().default(1)
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const plan = await prisma.mealPlan.findFirst({ where: { id, userId } });
  if (!plan) return NextResponse.json({ error: "Meal plan not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = EntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({ where: { id: parsed.data.recipeId, userId } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const entry = await prisma.mealPlanEntry.create({
    data: {
      mealPlanId: plan.id,
      recipeId: recipe.id,
      date: new Date(parsed.data.date),
      mealType: parsed.data.mealType,
      servingsMultiplier: parsed.data.servingsMultiplier
    },
    include: { recipe: true }
  });

  return NextResponse.json(entry, { status: 201 });
}
