import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { matchIngredientToProduct } from "@/lib/productMatch";

/** Runs Kroger product matching for every item on a shopping list against the user's chosen store. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.krogerLocationId) {
    return NextResponse.json(
      { error: "Set a preferred Kroger store first (Settings → Kroger)." },
      { status: 400 }
    );
  }

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId },
    include: { items: true }
  });
  if (!list) return NextResponse.json({ error: "Shopping list not found." }, { status: 404 });

  for (const item of list.items) {
    try {
      const { product, confidence } = await matchIngredientToProduct(item.ingredientName, user.krogerLocationId);
      await prisma.shoppingListItem.update({
        where: { id: item.id },
        data: {
          krogerProductId: product?.upc ?? null,
          matchedProductDescription: product?.description ?? null,
          matchedProductSize: product?.sizeDescription ?? null,
          matchConfidence: confidence
        }
      });
    } catch (err) {
      // Don't let one bad lookup abort the whole list — leave it unmatched for manual review.
      console.error(`Product match failed for "${item.ingredientName}":`, err);
    }
  }

  await prisma.shoppingList.update({ where: { id: list.id }, data: { status: "MATCHED" } });

  const updated = await prisma.shoppingList.findUnique({ where: { id: list.id }, include: { items: true } });
  return NextResponse.json(updated);
}
