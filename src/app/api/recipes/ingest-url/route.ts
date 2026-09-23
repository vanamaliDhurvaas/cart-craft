import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { ingestRecipeFromUrl } from "@/lib/recipeIngest";

const IngestSchema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });
  }

  let ingested;
  try {
    ingested = await ingestRecipeFromUrl(parsed.data.url);
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't process that URL: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (ingested.needsManualInput) {
    // Don't silently create an empty recipe — hand the caller what we found
    // (title + raw caption text, if any) so the UI can prompt for manual entry.
    return NextResponse.json(
      {
        needsManualInput: true,
        title: ingested.title,
        rawExtractedText: ingested.rawExtractedText,
        sourceType: ingested.sourceType
      },
      { status: 200 }
    );
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId,
      title: ingested.title || "Untitled recipe",
      sourceUrl: parsed.data.url,
      sourceType: ingested.sourceType,
      instructions: ingested.instructions,
      rawExtractedText: ingested.rawExtractedText,
      ingredients: {
        create: ingested.ingredients.map((i, idx) => ({
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

  return NextResponse.json({ needsManualInput: false, recipe }, { status: 201 });
}
