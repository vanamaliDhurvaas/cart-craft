import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const UpdateMealPlanSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(), // ISO date
  endDate: z.string()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await prisma.mealPlan.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Meal plan not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateMealPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "name, startDate and endDate are required." }, { status: 400 });
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const plan = await prisma.mealPlan.update({
    where: { id },
    data: { name: parsed.data.name, startDate, endDate }
  });
  return NextResponse.json(plan);
}

/**
 * Deleting a meal plan cascades (per prisma/schema.prisma) to its entries
 * and to any shopping lists generated from it. The UI warns about this
 * before calling DELETE.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await prisma.mealPlan.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Meal plan not found." }, { status: 404 });

  await prisma.mealPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
