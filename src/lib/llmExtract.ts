/**
 * LLM-based ingredient extraction for messy free text: video captions,
 * transcripts, or prose recipe blogs that don't have a clean "qty unit name"
 * ingredient list. The deterministic parser (ingredientParser.ts) should be
 * tried first on anything that already looks like a bulleted ingredient
 * list; reach for this when that's not the case.
 *
 * Requires ANTHROPIC_API_KEY. Model is configurable via ANTHROPIC_MODEL —
 * defaults to a fast/cheap model since this is a structured-extraction task,
 * not open-ended reasoning. See https://platform.claude.com/docs/en/about-claude/models/overview
 * for the current model list if the default below is no longer available.
 */

import type { ParsedIngredient } from "./ingredientParser";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-6";

export interface ExtractedRecipe {
  title: string | null;
  servings: number | null;
  ingredients: ParsedIngredient[];
  instructions: string | null;
  /** true if the model reported it could not find a usable ingredient list. */
  noIngredientsFound: boolean;
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured recipe data from raw text such as a social media video caption/description, a spoken-word transcript, or an unstructured recipe blog post.

Respond with ONLY a JSON object (no markdown fences, no commentary) matching this shape:
{
  "title": string | null,
  "servings": number | null,
  "ingredients": [ { "quantity": number | null, "unit": string | null, "name": string, "notes": string | null } ],
  "instructions": string | null,
  "noIngredientsFound": boolean
}

Rules:
- Only include actual food/grocery ingredients, not equipment or garnish instructions embedded in prose.
- Convert fractions and vulgar fractions to decimal numbers (e.g. "1/2" -> 0.5).
- If a quantity is genuinely not stated (e.g. "salt to taste"), set quantity and unit to null but still include the ingredient by name.
- If the text has no discernible ingredient list at all (e.g. it's just a caption like "so good 😍 #recipe" with no food details), set noIngredientsFound to true and return an empty ingredients array.
- Do not invent ingredients that aren't mentioned in the text.`;

export async function extractRecipeFromText(rawText: string): Promise<ExtractedRecipe> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. LLM-based ingredient extraction requires an Anthropic API key — see .env.example."
    );
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawText.slice(0, 20000) }]
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const textBlock = data?.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("Anthropic API returned no text content to parse.");
  }

  let parsed: {
    title?: string | null;
    servings?: number | null;
    ingredients?: Array<{ quantity: number | null; unit: string | null; name: string; notes: string | null }>;
    instructions?: string | null;
    noIngredientsFound?: boolean;
  };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error(
      `Could not parse LLM extraction response as JSON. Raw response: ${textBlock.text.slice(0, 500)}`
    );
  }

  const ingredients: ParsedIngredient[] = (parsed.ingredients ?? []).map((i) => ({
    rawLine: [i.quantity, i.unit, i.name].filter(Boolean).join(" ") || i.name,
    quantity: i.quantity ?? null,
    unit: i.unit ?? null,
    name: i.name,
    notes: i.notes ?? null
  }));

  return {
    title: parsed.title ?? null,
    servings: parsed.servings ?? null,
    ingredients,
    instructions: parsed.instructions ?? null,
    noIngredientsFound: parsed.noIngredientsFound ?? ingredients.length === 0
  };
}
