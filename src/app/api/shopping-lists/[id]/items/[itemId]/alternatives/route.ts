import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { searchProducts } from "@/lib/kroger";

/**
 * Lists candidate Kroger products for one shopping-list item, so the user
 * can pick a different match than the one we auto-selected (e.g. a
 * different brand/size of white bread).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const list = await prisma.shoppingList.findFirst({ where: { id, userId } });
  if (!list) return NextResponse.json({ error: "Shopping list not found." }, { status: 404 });

  const item = await prisma.shoppingListItem.findFirst({ where: { id: itemId, shoppingListId: list.id } });
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.krogerLocationId) {
    return NextResponse.json({ error: "Set a preferred Kroger store first (Settings → Kroger)." }, { status: 400 });
  }

  try {
    const candidates = await searchProducts(item.ingredientName, user.krogerLocationId);
    return NextResponse.json({ candidates });
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't search Kroger products: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
