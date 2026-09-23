/**
 * Deterministic parser for structured ingredient lines, e.g.:
 *   "2 1/2 cups all-purpose flour"
 *   "1/2 tsp salt"
 *   "3 large eggs"
 *   "Salt and pepper, to taste"
 *
 * This handles the common "qty [unit] name" shape without calling an LLM.
 * Messy free text (video captions, prose transcripts) should go through
 * llmExtract.ts instead; both paths produce the same ParsedIngredient shape.
 */

import { normalizeUnit } from "./units";

export interface ParsedIngredient {
  rawLine: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  notes: string | null;
}

const VULGAR_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875
};

// Words that commonly precede the real unit and should be ignored, plus
// size adjectives that aren't units but shouldn't be swallowed into "name".
const SIZE_WORDS = new Set(["large", "medium", "small", "extra-large", "jumbo"]);

/** Parse a leading quantity (supports "2", "2.5", "2 1/2", "1/2", vulgar fractions). */
function parseLeadingQuantity(text: string): { quantity: number | null; rest: string } {
  let s = text.trim();

  // Replace a leading vulgar fraction char, possibly preceded by a whole number.
  const vulgarMatch = s.match(/^(\d+\s*)?([¼½¾⅓⅔⅛⅜⅝⅞])(\s+|$)/);
  if (vulgarMatch) {
    const whole = vulgarMatch[1] ? parseFloat(vulgarMatch[1].trim()) : 0;
    const frac = VULGAR_FRACTIONS[vulgarMatch[2]];
    return { quantity: whole + frac, rest: s.slice(vulgarMatch[0].length) };
  }

  // "2 1/2" mixed number
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)(\s+|$)/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    return { quantity: whole + num / den, rest: s.slice(mixedMatch[0].length) };
  }

  // "1/2" simple fraction
  const fracMatch = s.match(/^(\d+)\/(\d+)(\s+|$)/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    return { quantity: num / den, rest: s.slice(fracMatch[0].length) };
  }

  // Range "2-3" -> take the average as a reasonable single estimate.
  const rangeMatch = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(\s+|$)/);
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1]);
    const b = parseFloat(rangeMatch[2]);
    return { quantity: (a + b) / 2, rest: s.slice(rangeMatch[0].length) };
  }

  // Plain integer/decimal
  const numMatch = s.match(/^(\d+(?:\.\d+)?)(\s+|$)/);
  if (numMatch) {
    return { quantity: parseFloat(numMatch[1]), rest: s.slice(numMatch[0].length) };
  }

  return { quantity: null, rest: s };
}

export function parseIngredientLine(line: string): ParsedIngredient {
  const rawLine = line.trim();
  let working = rawLine;

  // Split off a trailing parenthetical or ", note" as notes, e.g.
  // "1 onion, diced" -> notes "diced"; "2 cups flour (sifted)" -> notes "sifted"
  let notes: string | null = null;
  const parenMatch = working.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    notes = parenMatch[1].trim();
    working = working.slice(0, parenMatch.index).trim();
  }
  const commaMatch = working.match(/,\s*([^,]+)$/);
  if (!notes && commaMatch && commaMatch[1].length < 40) {
    notes = commaMatch[1].trim();
    working = working.slice(0, commaMatch.index).trim();
  }

  const { quantity, rest } = parseLeadingQuantity(working);
  let remainder = rest.trim();

  // Try to peel off a unit word (possibly preceded by a size word like "large").
  let unit: string | null = null;
  const tokens = remainder.split(/\s+/);
  if (tokens.length > 0) {
    let idx = 0;
    if (SIZE_WORDS.has(tokens[0]?.toLowerCase())) idx = 1;
    // Try two-word units first (e.g. "fl oz") then one-word.
    const twoWord = tokens.slice(idx, idx + 2).join(" ").toLowerCase();
    const oneWord = tokens[idx]?.toLowerCase();
    if (normalizeUnit(twoWord)) {
      unit = normalizeUnit(twoWord)!.canonical;
      remainder = tokens.slice(idx + 2).join(" ");
    } else if (oneWord && normalizeUnit(oneWord)) {
      unit = normalizeUnit(oneWord)!.canonical;
      remainder = tokens.slice(idx + 1).join(" ");
    } else if (idx === 1) {
      // Size word with no explicit unit, e.g. "3 large eggs" -> unit "each"
      unit = quantity !== null ? "each" : null;
      remainder = tokens.slice(1).join(" ");
    }
  }

  const name = remainder.trim().replace(/^of\s+/i, "") || rawLine;

  return { rawLine, quantity, unit, name, notes };
}

/**
 * A short "For X" line with no quantity is a recipe sub-section label
 * ("For Pasta Sauce", "For the garnish", "For Garnish:") rather than an
 * ingredient — common when a recipe groups ingredients by component.
 */
function isSectionLabel(line: string): boolean {
  return /^for\s+\S.*$/i.test(line) && !/\d/.test(line);
}

/** Parse a whole ingredients block, one ingredient per line. Skips blank/section-header-only lines. */
export function parseIngredientBlock(text: string): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*••]\s*/, "").trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^#+\s/.test(l)) // skip markdown headers like "## For the sauce"
    .filter((l) => !isSectionLabel(l)) // skip plain "For Pasta Sauce" / "For Garnish" style sub-headers
    .map(parseIngredientLine);
}
