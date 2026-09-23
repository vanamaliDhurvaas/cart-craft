import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

/**
 * Un-marks every "in cart" item on this list. Kroger's Cart API can't tell
 * us what's actually still in the user's cart (write-only — see push-cart
 * route comment), so if the user clears items directly in the Kroger app,
 * this is how they tell us to forget that and let those items be pushed
 * again.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const list = await prisma.shoppingList.findFirst({ where: { id, userId } });
  if (!list) return NextResponse.json({ error: "Shopping list not found." }, { status: 404 });

  const { count } = await prisma.shoppingListItem.updateMany({
    where: { shoppingListId: list.id, addedToCart: true },
    data: { addedToCart: false }
  });

  if (count > 0) {
    await prisma.shoppingList.update({ where: { id: list.id }, data: { status: "MATCHED" } });
  }

  return NextResponse.json({ ok: true, itemsReset: count });
}
