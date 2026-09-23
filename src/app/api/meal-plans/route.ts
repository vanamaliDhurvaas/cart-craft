import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const MealPlanSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(), // ISO date
  endDate: z.string()
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const plans = await prisma.mealPlan.findMany({
    where: { userId },
    include: { entries: { include: { recipe: true } } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = MealPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "name, startDate and endDate are required." }, { status: 400 });
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const plan = await prisma.mealPlan.create({
    data: { userId, name: parsed.data.name, startDate, endDate }
  });
  return NextResponse.json(plan, { status: 201 });
}
