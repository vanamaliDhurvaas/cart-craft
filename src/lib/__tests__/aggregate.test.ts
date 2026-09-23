import { describe, expect, it } from "vitest";
import { aggregateIngredients, normalizeName } from "../aggregate";
import { parseIngredientLine } from "../ingredientParser";

describe("normalizeName", () => {
  it("strips descriptors and de-pluralizes", () => {
    expect(normalizeName("Fresh Tomatoes")).toBe("tomato");
    expect(normalizeName("diced onions")).toBe("onion");
  });

  it("does not mangle words ending in double s", () => {
    expect(normalizeName("molasses")).toBe("molasses");
  });
});

describe("aggregateIngredients", () => {
  it("sums same-unit-family ingredients across recipes", () => {
    const inputs = [
      { ingredient: parseIngredientLine("1 cup flour"), multiplier: 1 },
      { ingredient: parseIngredientLine("2 cups flour"), multiplier: 1 },
      { ingredient: parseIngredientLine("1/2 cup flour"), multiplier: 2 } // -> 1 cup
    ];
    const result = aggregateIngredients(inputs);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("flour");
    expect(result[0].quantity).toBeCloseTo(4, 1); // 1 + 2 + 1 = 4 cups
    expect(result[0].unit).toBe("cup");
  });

  it("converts across compatible volume units", () => {
    const inputs = [
      { ingredient: parseIngredientLine("2 tbsp olive oil"), multiplier: 1 },
      { ingredient: parseIngredientLine("1 cup olive oil"), multiplier: 1 }
    ];
    const result = aggregateIngredients(inputs);
    expect(result).toHaveLength(1);
    // 2 tbsp ≈ 0.125 cup, so total ≈ 1.125 cup
    expect(result[0].unit).toBe("cup");
    expect(result[0].quantity).toBeCloseTo(1.13, 1);
  });

  it("keeps different unit families as separate line items", () => {
    const inputs = [
      { ingredient: parseIngredientLine("2 onions"), multiplier: 1 },
      { ingredient: parseIngredientLine("1 cup diced onion"), multiplier: 1 }
    ];
    const result = aggregateIngredients(inputs);
    expect(result).toHaveLength(2);
  });

  it("applies the servings multiplier", () => {
    const inputs = [{ ingredient: parseIngredientLine("2 eggs"), multiplier: 3 }];
    const result = aggregateIngredients(inputs);
    expect(result[0].quantity).toBe(6);
  });

  it("flags unparseable-quantity lines for manual review instead of dropping them", () => {
    const inputs = [{ ingredient: parseIngredientLine("Salt and pepper to taste"), multiplier: 1 }];
    const result = aggregateIngredients(inputs);
    expect(result).toHaveLength(1);
    expect(result[0].contributingLines).toContain("Salt and pepper to taste");
  });
});
