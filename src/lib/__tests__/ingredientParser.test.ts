import { describe, expect, it } from "vitest";
import { parseIngredientLine, parseIngredientBlock } from "../ingredientParser";

describe("parseIngredientLine", () => {
  it("parses a simple qty+unit+name", () => {
    const r = parseIngredientLine("2 cups all-purpose flour");
    expect(r.quantity).toBe(2);
    expect(r.unit).toBe("cup");
    expect(r.name).toBe("all-purpose flour");
  });

  it("parses mixed number fractions", () => {
    const r = parseIngredientLine("2 1/2 cups sugar");
    expect(r.quantity).toBe(2.5);
    expect(r.unit).toBe("cup");
    expect(r.name).toBe("sugar");
  });

  it("parses simple fractions", () => {
    const r = parseIngredientLine("1/2 tsp salt");
    expect(r.quantity).toBe(0.5);
    expect(r.unit).toBe("tsp");
    expect(r.name).toBe("salt");
  });

  it("parses vulgar fraction characters", () => {
    const r = parseIngredientLine("½ cup milk");
    expect(r.quantity).toBe(0.5);
    expect(r.unit).toBe("cup");
    expect(r.name).toBe("milk");
  });

  it("handles size words with no explicit unit as count", () => {
    const r = parseIngredientLine("3 large eggs");
    expect(r.quantity).toBe(3);
    expect(r.unit).toBe("each");
    expect(r.name).toBe("eggs");
  });

  it("extracts trailing note in parentheses", () => {
    const r = parseIngredientLine("2 cups flour (sifted)");
    expect(r.notes).toBe("sifted");
    expect(r.name).toBe("flour");
  });

  it("extracts trailing comma note", () => {
    const r = parseIngredientLine("1 onion, diced");
    expect(r.notes).toBe("diced");
    expect(r.name).toBe("onion");
  });

  it("falls back gracefully when there is no quantity", () => {
    const r = parseIngredientLine("Salt and pepper to taste");
    expect(r.quantity).toBeNull();
    expect(r.name.length).toBeGreaterThan(0);
  });
});

describe("parseIngredientBlock", () => {
  it("parses multiple lines and skips bullets/headers", () => {
    const block = `## For the sauce\n- 2 tbsp olive oil\n- 1 clove garlic, minced\n\n3 cups water`;
    const items = parseIngredientBlock(block);
    expect(items).toHaveLength(3);
    expect(items[0].unit).toBe("tbsp");
    expect(items[1].name).toBe("garlic");
    expect(items[2].quantity).toBe(3);
  });

  it("skips plain 'For X' sub-section labels with no quantity", () => {
    const block = `2 cups flour\nFor Pasta Sauce\n2 big tomatoes, sliced\nFor Garnish\nfresh basil leaves`;
    const items = parseIngredientBlock(block);
    expect(items.map((i) => i.rawLine)).not.toContain("For Pasta Sauce");
    expect(items.map((i) => i.rawLine)).not.toContain("For Garnish");
    expect(items).toHaveLength(3);
  });

  it("does not skip a 'For ...' line that has a quantity in it", () => {
    const block = `For garnish: 2 tbsp fresh basil`;
    const items = parseIngredientBlock(block);
    expect(items).toHaveLength(1);
  });
});
