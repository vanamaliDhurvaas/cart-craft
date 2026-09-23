import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const SetStoreSchema = z.object({ locationId: z.string() });

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SetStoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "locationId is required." }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { krogerLocationId: parsed.data.locationId } });
  return NextResponse.json({ ok: true });
}
