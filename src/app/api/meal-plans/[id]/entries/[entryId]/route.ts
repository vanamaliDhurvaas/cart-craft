import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const UpdateEntrySchema = z.object({
  recipeId: z.string(),
  date: z.string(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  servingsMultiplier: z.number().positive()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const plan = await prisma.mealPlan.findFirst({ where: { id, userId } });
  if (!plan) return NextResponse.json({ error: "Meal plan not found." }, { status: 404 });

  const entry = await prisma.mealPlanEntry.findFirst({ where: { id: entryId, mealPlanId: plan.id } });
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const recipe = await prisma.recipe.findFirst({ where: { id: parsed.data.recipeId, userId } });
  if (!recipe) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const updated = await prisma.mealPlanEntry.update({
    where: { id: entryId },
    data: {
      recipeId: recipe.id,
      date: new Date(parsed.data.date),
      mealType: parsed.data.mealType,
      servingsMultiplier: parsed.data.servingsMultiplier
    },
    include: { recipe: true }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const plan = await prisma.mealPlan.findFirst({ where: { id, userId } });
  if (!plan) return NextResponse.json({ error: "Meal plan not found." }, { status: 404 });

  const entry = await prisma.mealPlanEntry.findFirst({ where: { id: entryId, mealPlanId: plan.id } });
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  await prisma.mealPlanEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
