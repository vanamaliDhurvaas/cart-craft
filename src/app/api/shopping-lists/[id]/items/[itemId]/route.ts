import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const UpdateItemSchema = z.object({
  userConfirmed: z.boolean().optional(),
  quantity: z.number().positive().optional(),
  krogerProductId: z.string().nullable().optional(),
  matchedProductDescription: z.string().nullable().optional(),
  matchedProductSize: z.string().nullable().optional(),
  matchConfidence: z.number().min(0).max(1).nullable().optional(),
  // Lets the user un-mark an item after removing it from their Kroger cart
  // directly — we have no way to detect that on our own (see route comment
  // on POST .../push-cart: Kroger's Cart API is write-only, it doesn't
  // expose reading current cart contents back).
  addedToCart: z.boolean().optional()
});

/**
 * Lets the user tweak quantity/confirm, correct a mismatched product before
 * pushing to cart, or swap in a different Kroger product entirely (picking
 * an alternative from GET .../alternatives).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const list = await prisma.shoppingList.findFirst({ where: { id, userId } });
  if (!list) return NextResponse.json({ error: "Shopping list not found." }, { status: 404 });

  const existingItem = await prisma.shoppingListItem.findFirst({ where: { id: itemId, shoppingListId: list.id } });
  if (!existingItem) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const item = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: parsed.data
  });
  return NextResponse.json(item);
}
