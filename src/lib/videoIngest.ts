/**
 * Recipe ingestion from a video URL (YouTube, TikTok, Instagram Reels) or a
 * plain recipe webpage.
 *
 * Strategy (per product decision): try the caption/description text first —
 * most recipe creators put the full ingredient list there. Only fall back to
 * downloading + transcribing audio when the caption doesn't look like it has
 * a usable ingredient list, and only if OPENAI_API_KEY is configured.
 *
 * Requires the `yt-dlp` binary on PATH (and `ffmpeg` for the audio fallback).
 * See README "Setup" section for install instructions.
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { RecipeSourceType } from "@prisma/client";

const execFileAsync = promisify(execFile);

export function detectSourceType(url: string): RecipeSourceType {
  const host = safeHostname(url);
  if (!host) return "WEB";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YOUTUBE";
  if (host.includes("tiktok.com")) return "TIKTOK";
  if (host.includes("instagram.com")) return "INSTAGRAM";
  return "WEB";
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export interface VideoMetadata {
  title: string | null;
  description: string | null;
  durationSeconds: number | null;
  webpageUrl: string;
}

/** Fetch title/description/duration without downloading the video itself. */
export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    ["--dump-json", "--no-warnings", "--skip-download", url],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  const data = JSON.parse(stdout);
  return {
    title: data.title ?? null,
    description: data.description ?? null,
    durationSeconds: typeof data.duration === "number" ? data.duration : null,
    webpageUrl: data.webpage_url ?? url
  };
}

/**
 * Heuristic check for whether a block of text already contains a usable
 * ingredient list, so we can skip the (slower, costlier) audio transcription
 * path whenever possible.
 */
export function looksLikeIngredientList(text: string | null): boolean {
  if (!text) return false;
  if (/ingredients?\s*[:\-]/i.test(text)) return true;
  // A header line that's just "Ingredients" / "INGREDIENTS" with no colon —
  // common in video descriptions that use a blank line as the separator
  // instead of punctuation.
  if (/^\s*ingredients?\s*:?\s*$/im.test(text)) return true;

  // Count lines that look like "qty [unit] name" — several such lines in a
  // row is a strong signal even without an explicit "Ingredients:" header.
  const lines = text.split(/\r?\n/);
  const quantityLinePattern = /^\s*[-*•]?\s*(\d+([./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*\w*\s+\S/;
  const matches = lines.filter((l) => quantityLinePattern.test(l)).length;
  return matches >= 3;
}

/**
 * Best-effort isolation of just the ingredients block from a full video
 * caption/description. Used as a fallback (when LLM extraction isn't
 * configured, or found nothing) so the user sees just the ingredient lines
 * to review/edit rather than the entire caption — timestamps, promo links,
 * method steps and all. Finds an "Ingredients" header line and returns text
 * up to the next section header (Method/Instructions/Directions/Steps/…) or
 * the end of the text. Falls back to the full (trimmed) text if no
 * "Ingredients" header can be found at all.
 */
export function extractIngredientsSection(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const lines = trimmed.split(/\r?\n/);
  const headerPattern = /^\s*ingredients?\s*:?\s*(.*)$/i;
  const startIdx = lines.findIndex((l) => headerPattern.test(l.trim()));
  if (startIdx === -1) return trimmed;

  // A header like "Ingredients: 2 cups flour, ..." keeps its trailing text
  // as the first line of the section instead of being discarded.
  const headerMatch = lines[startIdx].trim().match(headerPattern);
  const inlineRemainder = headerMatch?.[1]?.trim();

  const endPattern = /^\s*(method|instructions?|directions?|steps?|preparation|notes?)\s*:?\s*$/i;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endPattern.test(lines[i].trim())) {
      endIdx = i;
      break;
    }
  }

  const sectionLines = lines.slice(startIdx + 1, endIdx).map((l) => l.trim());
  if (inlineRemainder) sectionLines.unshift(inlineRemainder);
  const section = sectionLines.filter(Boolean).join("\n");

  return section.length > 0 ? section : trimmed;
}

/** Download just the audio track to a temp file, in a format Whisper accepts. */
async function downloadAudio(url: string): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "meal-prep-audio-"));
  const outTemplate = join(dir, "audio.%(ext)s");
  await execFileAsync(
    "yt-dlp",
    ["-x", "--audio-format", "mp3", "--no-warnings", "-o", outTemplate, url],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  const filePath = join(dir, "audio.mp3");
  return { filePath, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/** Transcribe an audio file via the OpenAI Whisper API. */
async function transcribeAudio(filePath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set; cannot transcribe audio. See .env.example.");
  }
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "audio/mpeg" }), "audio.mp3");
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI transcription failed (${res.status}): ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.text ?? "";
}

export interface IngestResult {
  sourceType: RecipeSourceType;
  title: string | null;
  /** Combined text (description + transcript, whichever were used) to feed into ingredient extraction. */
  rawText: string;
  usedAudioTranscription: boolean;
  /** true when neither the caption nor (if attempted) transcription yielded a usable ingredient list. */
  needsManualInput: boolean;
}

export async function ingestVideoUrl(url: string): Promise<IngestResult> {
  const sourceType = detectSourceType(url);
  const meta = await fetchVideoMetadata(url);

  if (looksLikeIngredientList(meta.description)) {
    return {
      sourceType,
      title: meta.title,
      rawText: meta.description ?? "",
      usedAudioTranscription: false,
      needsManualInput: false
    };
  }

  // Caption didn't have a clear ingredient list — try audio transcription if configured.
  if (process.env.OPENAI_API_KEY) {
    const { filePath, cleanup } = await downloadAudio(url);
    try {
      const transcript = await transcribeAudio(filePath);
      const combined = [meta.description ?? "", transcript].filter(Boolean).join("\n\n");
      return {
        sourceType,
        title: meta.title,
        rawText: combined,
        usedAudioTranscription: true,
        needsManualInput: combined.trim().length === 0
      };
    } finally {
      await cleanup();
    }
  }

  // No transcription available — hand back whatever caption text exists and
  // let the caller ask the user to paste the recipe manually.
  return {
    sourceType,
    title: meta.title,
    rawText: meta.description ?? "",
    usedAudioTranscription: false,
    needsManualInput: true
  };
}
