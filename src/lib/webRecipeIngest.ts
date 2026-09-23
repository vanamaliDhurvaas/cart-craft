/**
 * Recipe ingestion from a plain recipe webpage (not a video platform).
 *
 * Most recipe blogs (especially ones built on WordPress recipe plugins, e.g.
 * WP Recipe Maker / Tasty Recipes) embed Schema.org "Recipe" structured data
 * as JSON-LD for Google's recipe rich snippets — this is a far more reliable
 * source than scraping visible page text, since `recipeIngredient` is
 * already a clean array of ingredient lines. We try that first and only
 * fall back to stripping visible text + LLM extraction if no JSON-LD Recipe
 * is present.
 */

import { parseIngredientBlock, type ParsedIngredient } from "./ingredientParser";
import { extractRecipeFromText } from "./llmExtract";

export interface WebIngestResult {
  title: string | null;
  ingredients: ParsedIngredient[];
  instructions: string | null;
  servings: number | null;
  needsManualInput: boolean;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Some sites block requests with no/unusual User-Agent.
      "user-agent":
        "Mozilla/5.0 (compatible; MealPrepBot/1.0; +https://github.com/) AppleWebKit/537.36"
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch page (${res.status})`);
  return res.text();
}

/** Find every JSON-LD block that describes (or contains, via @graph) a Schema.org Recipe. */
function extractRecipeJsonLd(html: string): Record<string, any> | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  const isRecipe = (node: any) => {
    const type = node?.["@type"];
    return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
  };

  for (const block of blocks) {
    let parsed: any;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch {
      continue; // malformed JSON-LD is common in the wild — just skip it
    }

    const candidates: any[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      if (isRecipe(candidate)) return candidate;
      // Recipe is sometimes nested inside a top-level @graph array.
      if (Array.isArray(candidate?.["@graph"])) {
        const found = candidate["@graph"].find(isRecipe);
        if (found) return found;
      }
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function instructionsFromJsonLd(recipe: Record<string, any>): string | null {
  const steps = recipe.recipeInstructions;
  if (!steps) return null;
  if (typeof steps === "string") return steps;
  if (Array.isArray(steps)) {
    return steps
      .map((s) => (typeof s === "string" ? s : s?.text))
      .filter(Boolean)
      .join("\n");
  }
  return null;
}

function parseServings(recipe: Record<string, any>): number | null {
  const yield_ = recipe.recipeYield;
  const raw = Array.isArray(yield_) ? yield_[0] : yield_;
  const match = String(raw ?? "").match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export async function ingestWebRecipeUrl(url: string): Promise<WebIngestResult> {
  const html = await fetchHtml(url);

  const recipeJsonLd = extractRecipeJsonLd(html);
  if (recipeJsonLd && Array.isArray(recipeJsonLd.recipeIngredient) && recipeJsonLd.recipeIngredient.length > 0) {
    const ingredients = parseIngredientBlock(recipeJsonLd.recipeIngredient.join("\n"));
    return {
      title: recipeJsonLd.name ?? null,
      ingredients,
      instructions: instructionsFromJsonLd(recipeJsonLd),
      servings: parseServings(recipeJsonLd),
      needsManualInput: ingredients.length === 0
    };
  }

  // No structured data found — fall back to visible text + LLM extraction.
  const text = stripHtml(html).slice(0, 20000);
  if (!text) {
    return { title: null, ingredients: [], instructions: null, servings: null, needsManualInput: true };
  }

  const extracted = await extractRecipeFromText(text);
  return {
    title: extracted.title,
    ingredients: extracted.ingredients,
    instructions: extracted.instructions,
    servings: extracted.servings,
    needsManualInput: extracted.noIngredientsFound
  };
}
