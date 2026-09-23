/**
 * Unit normalization + conversion for ingredient aggregation.
 *
 * Strategy: group units into families (volume, weight, count). Within a
 * family, convert everything to a base unit so quantities from different
 * recipes can be summed. Units from different families are never combined
 * automatically (e.g. "2 onions" + "1 cup diced onion" stay separate line
 * items) — that ambiguity is left for the user to resolve in the review UI.
 */

export type UnitFamily = "volume" | "weight" | "count";

interface UnitDef {
  family: UnitFamily;
  /** Multiplier to convert 1 of this unit into the family's base unit. */
  toBase: number;
  canonical: string;
}

// Base units: volume -> milliliters, weight -> grams, count -> each.
const UNIT_TABLE: Record<string, UnitDef> = {
  // Volume (base: ml)
  ml: { family: "volume", toBase: 1, canonical: "ml" },
  milliliter: { family: "volume", toBase: 1, canonical: "ml" },
  l: { family: "volume", toBase: 1000, canonical: "l" },
  liter: { family: "volume", toBase: 1000, canonical: "l" },
  tsp: { family: "volume", toBase: 4.9289, canonical: "tsp" },
  teaspoon: { family: "volume", toBase: 4.9289, canonical: "tsp" },
  tbsp: { family: "volume", toBase: 14.7868, canonical: "tbsp" },
  tablespoon: { family: "volume", toBase: 14.7868, canonical: "tbsp" },
  cup: { family: "volume", toBase: 236.588, canonical: "cup" },
  "fl oz": { family: "volume", toBase: 29.5735, canonical: "fl oz" },
  pint: { family: "volume", toBase: 473.176, canonical: "pint" },
  quart: { family: "volume", toBase: 946.353, canonical: "quart" },
  gallon: { family: "volume", toBase: 3785.41, canonical: "gallon" },

  // Weight (base: g)
  g: { family: "weight", toBase: 1, canonical: "g" },
  gram: { family: "weight", toBase: 1, canonical: "g" },
  kg: { family: "weight", toBase: 1000, canonical: "kg" },
  kilogram: { family: "weight", toBase: 1000, canonical: "kg" },
  oz: { family: "weight", toBase: 28.3495, canonical: "oz" },
  ounce: { family: "weight", toBase: 28.3495, canonical: "oz" },
  lb: { family: "weight", toBase: 453.592, canonical: "lb" },
  pound: { family: "weight", toBase: 453.592, canonical: "lb" },

  // Count (base: each) — includes vague-but-common "unit-ish" words.
  each: { family: "count", toBase: 1, canonical: "each" },
  count: { family: "count", toBase: 1, canonical: "each" },
  clove: { family: "count", toBase: 1, canonical: "clove" },
  slice: { family: "count", toBase: 1, canonical: "slice" },
  can: { family: "count", toBase: 1, canonical: "can" },
  package: { family: "count", toBase: 1, canonical: "package" },
  pkg: { family: "count", toBase: 1, canonical: "package" },
  bunch: { family: "count", toBase: 1, canonical: "bunch" },
  head: { family: "count", toBase: 1, canonical: "head" },
  stalk: { family: "count", toBase: 1, canonical: "stalk" }
};

// Common plurals / abbreviation variants map onto the same key.
const ALIASES: Record<string, string> = {
  tsps: "tsp",
  teaspoons: "teaspoon",
  tbsps: "tbsp",
  tablespoons: "tablespoon",
  cups: "cup",
  ozs: "oz",
  ounces: "ounce",
  lbs: "lb",
  pounds: "pound",
  grams: "gram",
  kilograms: "kilogram",
  liters: "liter",
  litres: "liter",
  litre: "liter",
  pints: "pint",
  quarts: "quart",
  gallons: "gallon",
  cloves: "clove",
  slices: "slice",
  cans: "can",
  packages: "package",
  pkgs: "package",
  bunches: "bunch",
  heads: "head",
  stalks: "stalk",
  "fl. oz": "fl oz",
  "fl oz.": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  // Package-size shorthand as it shows up in Kroger product "size" strings
  // (e.g. "12 CT", "6 EA", "5 LB BAG") rather than in recipe ingredient lines.
  ct: "count",
  ea: "each"
};

export function normalizeUnit(raw: string | null | undefined): UnitDef | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/\.$/, "");
  const key = ALIASES[cleaned] ?? cleaned;
  return UNIT_TABLE[key] ?? null;
}

/** Convert a quantity in `fromUnit` into the family's base unit. Returns null if unit unknown. */
export function toBaseQuantity(quantity: number, fromUnit: string | null | undefined) {
  const def = normalizeUnit(fromUnit);
  if (!def) return null;
  return { value: quantity * def.toBase, family: def.family };
}

/**
 * Pick a human-friendly display unit for a base-unit quantity within a family,
 * preferring common whole-ish sizes (e.g. don't show "2400 ml", show "10.1 cup").
 */
export function fromBaseQuantity(baseValue: number, family: UnitFamily): { quantity: number; unit: string } {
  if (family === "count") return { quantity: round(baseValue), unit: "each" };
  if (family === "weight") {
    if (baseValue >= 453.592) return { quantity: round(baseValue / 453.592), unit: "lb" };
    return { quantity: round(baseValue / 28.3495), unit: "oz" };
  }
  // volume
  if (baseValue >= 236.588) return { quantity: round(baseValue / 236.588), unit: "cup" };
  if (baseValue >= 14.7868) return { quantity: round(baseValue / 14.7868), unit: "tbsp" };
  return { quantity: round(baseValue / 4.9289), unit: "tsp" };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Parse a Kroger product "size" string (e.g. "32 FL OZ", "12 CT", "5 LB
 * BAG") into a quantity + recognized unit. Tries a two-word unit first
 * ("fl oz"), then falls back to the first token — trailing descriptor words
 * like "bag"/"jar" are simply ignored since they don't affect the amount.
 */
export function parseSizeDescription(
  raw: string | null | undefined
): { unit: string; family: UnitFamily; baseValue: number } | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return null;
  const qty = parseFloat(match[1]);
  if (!qty || qty <= 0) return null;

  const tokens = match[2].trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const twoWord = tokens.length >= 2 ? normalizeUnit(tokens.slice(0, 2).join(" ")) : null;
  const def = twoWord ?? normalizeUnit(tokens[0]);
  if (!def) return null;

  return { unit: def.canonical, family: def.family, baseValue: qty * def.toBase };
}

/**
 * How many packages of a matched product to add to the cart, given the
 * aggregated amount a recipe (or set of recipes) actually needs and, when
 * available, the product's package size.
 *
 * Without this, a naive implementation mistakes "4 tbsp of syrup needed"
 * for "4 bottles of syrup" — it treats whatever unit the ingredient was
 * measured in as if it were a count of the product itself. Here we convert
 * both the need and the package size into the same base unit and figure out
 * how many packages actually cover it, rounding up (you can't buy 0.06 of a
 * bottle) but never buying more than one when we can't tell.
 */
export function packagesNeeded(
  neededQuantity: number,
  neededUnit: string | null,
  sizeDescription: string | null | undefined
): number {
  const neededDef = normalizeUnit(neededUnit);
  const fallbackCount = Math.max(1, Math.round(neededQuantity) || 1);
  if (!neededDef) return fallbackCount;

  const neededBase = neededQuantity * neededDef.toBase;
  const size = parseSizeDescription(sizeDescription);
  if (!size || size.family !== neededDef.family || size.baseValue <= 0) {
    // No usable package-size data, or it's in a different unit family than
    // what the recipe needs. For discrete items (each/can/clove/package/…)
    // the aggregated quantity already IS the number of units to buy. For
    // volume/weight items, assume one package rather than misreading the
    // raw amount as a package count.
    return neededDef.family === "count" ? fallbackCount : 1;
  }

  return Math.max(1, Math.ceil(neededBase / size.baseValue));
}
