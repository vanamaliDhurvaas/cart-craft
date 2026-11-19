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
  /**
   * Human-readable explanation of *why* manual entry is needed, shown to the
   * user instead of a one-size-fits-all "couldn't extract" message. Null
   * when needsManualInput is false.
   */
  extractionNote: string | null;
}

const AI_CONFIGURED = () => Boolean(process.env.ANTHROPIC_API_KEY);
const AUDIO_CONFIGURED = () => Boolean(process.env.OPENAI_API_KEY);

export async function ingestRecipeFromUrl(url: string): Promise<IngestedRecipe> {
  const sourceType = detectSourceType(url);

  if (sourceType === "WEB") {
    const web = await ingestWebRecipeUrl(url);
    let extractionNote: string | null = null;
    if (web.needsManualInput) {
      extractionNote = AI_CONFIGURED()
        ? "This page doesn't use the structured recipe format search engines look for, and AI extraction didn't find a clear ingredient list on the page either."
        : "This page doesn't use the structured recipe format search engines look for, so we'd need AI extraction turned on (ANTHROPIC_API_KEY) to read the ingredients out of the page text.";
    }
    return {
      title: web.title,
      sourceType,
      rawExtractedText: web.ingredients.map((i) => i.rawLine).join("\n"),
      ingredients: web.ingredients,
      instructions: web.instructions,
      needsManualInput: web.needsManualInput,
      extractionNote
    };
  }

  const video = await ingestVideoUrl(url);

  if (video.needsManualInput || !video.rawText.trim()) {
    const extractionNote = !video.rawText.trim()
      ? "We couldn't get a caption, description, or transcript for this video at all."
      : video.usedAudioTranscription
        ? "We checked the video's caption and transcribed the audio, but neither mentioned a clear ingredient list — this video may only show ingredients as on-screen text or graphics, which we can't read yet."
        : AUDIO_CONFIGURED()
          ? "The caption didn't contain a clear ingredient list."
          : "The caption didn't contain a clear ingredient list, and audio transcription (OPENAI_API_KEY) isn't turned on to check what's said out loud.";
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
      needsManualInput: true,
      extractionNote
    };
  }

  // Prefer the LLM extractor whenever it's configured, regardless of
  // whether the caption "looks like" a clean list — real captions almost
  // always mix the ingredients in with timestamps, intro text, method
  // steps, and promo links, which the deterministic line-by-line parser
  // can't tell apart from real ingredient lines. The LLM is explicitly
  // instructed to pull out only actual ingredients.
  if (AI_CONFIGURED()) {
    const extracted = await extractRecipeFromText(video.rawText);
    const extractionNote = extracted.noIngredientsFound
      ? video.usedAudioTranscription
        ? "AI checked the caption and the spoken audio, but didn't find a clear ingredient list in either — this video may only show ingredients as on-screen text or graphics, which we can't read yet."
        : "AI checked the caption but didn't find a clear ingredient list."
      : null;
    return {
      title: extracted.title ?? video.title,
      sourceType: video.sourceType,
      rawExtractedText: extractIngredientsSection(video.rawText),
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      needsManualInput: extracted.noIngredientsFound,
      extractionNote
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
      needsManualInput: ingredients.length === 0,
      extractionNote:
        ingredients.length === 0
          ? "We found what looked like an ingredients section but couldn't parse the individual lines. Turning on AI extraction (ANTHROPIC_API_KEY) handles messy formatting like this much better."
          : null
    };
  }

  return {
    title: video.title,
    sourceType: video.sourceType,
    rawExtractedText: extractIngredientsSection(video.rawText),
    ingredients: [],
    instructions: null,
    needsManualInput: true,
    extractionNote:
      "AI extraction (ANTHROPIC_API_KEY) isn't turned on, so we could only check the caption for an obvious ingredient list, and didn't find one."
  };
}
