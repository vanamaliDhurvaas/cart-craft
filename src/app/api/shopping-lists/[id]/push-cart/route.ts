import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { addItemsToCart } from "@/lib/kroger";
import { packagesNeeded } from "@/lib/units";

/**
 * Pushes every matched, user-confirmed item into the user's real Kroger
 * cart. This is the "automatic" part of the flow — the user still has to
 * open the Kroger app to review and pay; no API lets us do that part.
 *
 * `addedToCart` is one-way: Kroger's Cart API only supports adding items,
 * not reading back what's currently in the cart, so we can't detect items
 * the user later removes directly in the Kroger app. If that happens, the
 * user can reset a row (or the whole list) via PATCH .../items/[itemId]
 * ({ addedToCart: false }) or POST .../reset-cart to make it eligible to
 * push again.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId },
    include: { items: true }
  });
  if (!list) return NextResponse.json({ error: "Shopping list not found." }, { status: 404 });

  const itemsToPush = list.items.filter((i) => i.userConfirmed && i.krogerProductId && !i.addedToCart);
  if (itemsToPush.length === 0) {
    return NextResponse.json(
      { error: "No confirmed, matched items to add. Review and confirm items first." },
      { status: 400 }
    );
  }

  try {
    await addItemsToCart(
      userId,
      itemsToPush.map((i) => ({
        upc: i.krogerProductId!,
        // Convert "how much the recipes need" into "how many packages to
        // buy" using the matched product's package size — not a naive
        // rounding of the raw ingredient quantity (see lib/units.ts).
        quantity: packagesNeeded(i.quantity, i.unit, i.matchedProductSize)
      }))
    );
  } catch (err) {
    return NextResponse.json({ error: `Adding to Kroger cart failed: ${(err as Error).message}` }, { status: 502 });
  }

  await prisma.shoppingListItem.updateMany({
    where: { id: { in: itemsToPush.map((i) => i.id) } },
    data: { addedToCart: true }
  });
  await prisma.shoppingList.update({
    where: { id: list.id },
    data: { status: "PUSHED_TO_KROGER", pushedAt: new Date() }
  });

  return NextResponse.json({ ok: true, itemsAdded: itemsToPush.length });
}
