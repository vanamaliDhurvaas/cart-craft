/**
 * Match an aggregated shopping-list ingredient name to a Kroger catalog
 * product. Kroger's product search already does keyword ranking, so this
 * mostly just picks a sensible top candidate and attaches a rough
 * confidence score the UI can use to prompt for manual review when it's low.
 */

import { searchProducts, type KrogerProduct } from "./kroger";

export interface MatchResult {
  product: KrogerProduct | null;
  confidence: number; // 0-1, heuristic
}

function tokenOverlapScore(a: string, b: string): number {
  const norm = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const setA = norm(a);
  const setB = norm(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}

export async function matchIngredientToProduct(
  ingredientName: string,
  locationId: string
): Promise<MatchResult> {
  const candidates = await searchProducts(ingredientName, locationId);
  if (candidates.length === 0) return { product: null, confidence: 0 };

  let best = candidates[0];
  let bestScore = tokenOverlapScore(ingredientName, candidates[0].description);
  for (const c of candidates.slice(1)) {
    const score = tokenOverlapScore(ingredientName, c.description);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  return { product: best, confidence: Math.min(1, bestScore) };
}
