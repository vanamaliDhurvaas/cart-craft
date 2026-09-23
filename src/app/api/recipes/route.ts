import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { parseIngredientBlock } from "@/lib/ingredientParser";

const ManualRecipeSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive().optional(),
  instructions: z.string().optional(),
  ingredientsText: z.string().min(1, "Enter at least one ingredient line")
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const recipes = await prisma.recipe.findMany({
    where: { userId },
    include: { ingredients: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ManualRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { title, servings, instructions, ingredientsText } = parsed.data;
  const parsedIngredients = parseIngredientBlock(ingredientsText);

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      title,
      servings: servings ?? 1,
      instructions,
      sourceType: "MANUAL",
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

  return NextResponse.json(recipe, { status: 201 });
}
