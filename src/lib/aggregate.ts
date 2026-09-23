import { fromBaseQuantity, toBaseQuantity, UnitFamily } from "./units";
import type { ParsedIngredient } from "./ingredientParser";

export interface AggregateInput {
  ingredient: ParsedIngredient;
  /** e.g. a meal-plan entry's servings multiplier (recipe scaled up/down). */
  multiplier: number;
}

export interface AggregatedItem {
  name: string;
  quantity: number;
  unit: string | null;
  /** Ingredient lines that couldn't be confidently combined (different unit family, or no parseable quantity). */
  contributingLines: string[];
}

/**
 * Normalize an ingredient name for grouping: lowercase, strip common
 * descriptors/notes, collapse whitespace, naive de-pluralize. This is
 * intentionally conservative — better to under-merge (two similar lines)
 * than to wrongly combine unrelated ingredients.
 */
export function normalizeName(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(/[.]+$/, "");
  s = s.replace(/\s+/g, " ");
  // Strip a small set of common leading descriptors that don't change identity.
  s = s.replace(/^(fresh|dried|chopped|minced|sliced|diced|ground|whole|large|small|medium)\s+/i, "");
  // Naive de-pluralization. Ordered so more specific endings are handled
  // before the generic trailing-"s" strip, and words that are already
  // singular-looking (ends in "ss"/"sses", e.g. "molasses") are left alone.
  if (s.length > 3) {
    if (s.endsWith("sses")) {
      // "molasses", "glasses" — leave as-is, stripping is more likely wrong than right.
    } else if (s.endsWith("ies")) {
      s = s.slice(0, -3) + "y"; // berries -> berry
    } else if (s.endsWith("oes")) {
      s = s.slice(0, -2); // tomatoes -> tomato, potatoes -> potato
    } else if (/(ch|sh|x|z)es$/.test(s)) {
      s = s.slice(0, -2); // peaches -> peach, dishes -> dish
    } else if (s.endsWith("s") && !s.endsWith("ss")) {
      s = s.slice(0, -1); // onions -> onion
    }
  }
  return s;
}

/**
 * Aggregate ingredients across recipes into a shopping list. Groups by
 * normalized name + unit family; sums within a family via base-unit
 * conversion. Items with unknown/mismatched units are kept as separate
 * lines flagged for manual review rather than guessed at.
 */
export function aggregateIngredients(inputs: AggregateInput[]): AggregatedItem[] {
  const groups = new Map<
    string,
    { name: string; family: UnitFamily | "unknown"; baseTotal: number; lines: string[] }
  >();

  for (const { ingredient, multiplier } of inputs) {
    const name = normalizeName(ingredient.name);
    const qty = ingredient.quantity !== null ? ingredient.quantity * multiplier : null;

    // A bare number with no unit word ("2 eggs") is a count, not "unknown" —
    // only truly unparseable quantities (null) should fall through to unknown.
    let family: UnitFamily | "unknown" = "unknown";
    let baseValue = 0;
    if (qty !== null) {
      if (ingredient.unit === null) {
        family = "count";
        baseValue = qty;
      } else {
        const base = toBaseQuantity(qty, ingredient.unit);
        family = base?.family ?? "unknown";
        baseValue = base?.value ?? 0;
      }
    }

    const key = `${name}::${family}`;
    const existing = groups.get(key);
    if (existing) {
      existing.baseTotal += baseValue;
      existing.lines.push(ingredient.rawLine);
    } else {
      groups.set(key, { name, family, baseTotal: baseValue, lines: [ingredient.rawLine] });
    }
  }

  const result: AggregatedItem[] = [];
  for (const group of groups.values()) {
    if (group.family === "unknown") {
      // Can't convert/sum — surface each contributing line as-is for manual review.
      result.push({
        name: group.name,
        quantity: 0,
        unit: null,
        contributingLines: group.lines
      });
      continue;
    }
    const { quantity, unit } = fromBaseQuantity(group.baseTotal, group.family);
    result.push({ name: group.name, quantity, unit, contributingLines: group.lines });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
