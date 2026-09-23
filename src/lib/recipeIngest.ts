/**
 * Orchestrates turning a URL into a Recipe + Ingredient rows.
 *
 * Video platforms (YouTube/TikTok/Instagram) go through videoIngest.ts
 * (yt-dlp caption/description fetch, optional audio-transcription fallback).
 * Everything else is treated as a plain recipe webpage and goes through
 * webRecipeIngest.ts, which prefers a site's Schema.org Recipe JSON-LD
 * (a clean, structured ingredient list) over scraping visible text.
 */

import { detectSourceType, extractIngredientsSection, ingestVideoUrl, looksLikeIngredientList } from "./videoIngest";
import { ingestWebRecipeUrl } from "./webRecipeIngest";
import { parseIngredientBlock, type ParsedIngredient } from "./ingredientParser";
import { extractRecipeFromText } from "./llmExtract";
import type { RecipeSourceType } from "@prisma/client";

export interface IngestedRecipe {
  title: string | null;
  sourceType: RecipeSourceType;
  rawExtractedText: string;
  ingredients: ParsedIngredient[];
  instructions: string | null;
  needsManualInput: boolean;
}

export async function ingestRecipeFromUrl(url: string): Promise<IngestedRecipe> {
  const sourceType = detectSourceType(url);

  if (sourceType === "WEB") {
    const web = await ingestWebRecipeUrl(url);
    return {
      title: web.title,
      sourceType,
      rawExtractedText: web.ingredients.map((i) => i.rawLine).join("\n"),
      ingredients: web.ingredients,
      instructions: web.instructions,
      needsManualInput: web.needsManualInput
    };
  }

  const video = await ingestVideoUrl(url);

  if (video.needsManualInput || !video.rawText.trim()) {
    return {
      title: video.title,
      sourceType: video.sourceType,
      // Even when we're handing this to the user to fill in manually, give
      // them just the ingredients block (if one can be found) rather than
      // the entire caption — timestamps, promo links, and method steps
      // included.
      rawExtractedText: extractIngredientsSection(video.rawText),
      ingredients: [],
      instructions: null,
      needsManualInput: true
    };
  }

  // Prefer the LLM extractor whenever it's configured, regardless of
  // whether the caption "looks like" a clean list — real captions almost
  // always mix the ingredients in with timestamps, intro text, method
  // steps, and promo links, which the deterministic line-by-line parser
  // can't tell apart from real ingredient lines. The LLM is explicitly
  // instructed to pull out only actual ingredients.
  if (process.env.ANTHROPIC_API_KEY) {
    const extracted = await extractRecipeFromText(video.rawText);
    return {
      title: extracted.title ?? video.title,
      sourceType: video.sourceType,
      rawExtractedText: extractIngredientsSection(video.rawText),
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      needsManualInput: extracted.noIngredientsFound
    };
  }

  // No LLM configured — fall back to the deterministic parser, but only
  // ever feed it (and show the user) the isolated ingredients section,
  // never the full raw caption.
  if (looksLikeIngredientList(video.rawText)) {
    const section = extractIngredientsSection(video.rawText);
    const ingredients = parseIngredientBlock(section);
    return {
      title: video.title,
      sourceType: video.sourceType,
      rawExtractedText: section,
      ingredients,
      instructions: null,
      needsManualInput: ingredients.length === 0
    };
  }

  return {
    title: video.title,
    sourceType: video.sourceType,
    rawExtractedText: extractIngredientsSection(video.rawText),
    ingredients: [],
    instructions: null,
    needsManualInput: true
  };
}
