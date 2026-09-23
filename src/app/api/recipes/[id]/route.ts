import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { parseIngredientBlock } from "@/lib/ingredientParser";

const UpdateRecipeSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive().optional(),
  ingredientsText: z.string().min(1, "Enter at least one ingredient line")
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, servings, ingredientsText } = parsed.data;
  const parsedIngredients = parseIngredientBlock(ingredientsText);

  const recipe = await prisma.$transaction(async (tx) => {
    await tx.ingredient.deleteMany({ where: { recipeId: id } });
    return tx.recipe.update({
      where: { id },
      data: {
        title,
        servings: servings ?? 1,
        ingredients: {
          create: parsedIngredients.map((i, idx) => ({
            rawLine: i.rawLine,
            quantity: i.quantity,
            unit: i.unit,
            name: i.name,
            notes: i.notes,
            sortOrder: idx
          }))
        }
      },
      include: { ingredients: true }
    });
  });

  return NextResponse.json(recipe);
}

/**
 * Deleting a recipe cascades (per prisma/schema.prisma) to its ingredients
 * and to any MealPlanEntry rows that reference it — i.e. it also disappears
 * from any meal plans it was assigned to. The UI warns about this before
 * calling DELETE.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
