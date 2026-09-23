import { describe, expect, it } from "vitest";
import { detectSourceType, extractIngredientsSection, looksLikeIngredientList } from "../videoIngest";

describe("detectSourceType", () => {
  it("detects youtube", () => {
    expect(detectSourceType("https://www.youtube.com/watch?v=abc123")).toBe("YOUTUBE");
    expect(detectSourceType("https://youtu.be/abc123")).toBe("YOUTUBE");
  });
  it("detects tiktok", () => {
    expect(detectSourceType("https://www.tiktok.com/@chef/video/12345")).toBe("TIKTOK");
  });
  it("detects instagram", () => {
    expect(detectSourceType("https://www.instagram.com/reel/abc123/")).toBe("INSTAGRAM");
  });
  it("falls back to web for anything else", () => {
    expect(detectSourceType("https://www.allrecipes.com/recipe/123/thing")).toBe("WEB");
  });
  it("falls back to web for unparseable urls", () => {
    expect(detectSourceType("not a url")).toBe("WEB");
  });
});

describe("looksLikeIngredientList", () => {
  it("returns true when an explicit Ingredients: header is present", () => {
    expect(looksLikeIngredientList("Ingredients:\n2 cups flour\n1 egg")).toBe(true);
  });

  it("returns true when several qty-led lines are present without a header", () => {
    const text = "2 cups flour\n1 tsp salt\n3 eggs\n1/2 cup milk";
    expect(looksLikeIngredientList(text)).toBe(true);
  });

  it("returns false for a caption with no ingredient list", () => {
    expect(looksLikeIngredientList("so good today 😍 #foodie #yum")).toBe(false);
  });

  it("returns false for null", () => {
    expect(looksLikeIngredientList(null)).toBe(false);
  });

  it("returns true for a bare 'Ingredients' header with no colon (real caption formatting)", () => {
    const text = "Some intro text\n\nINGREDIENTS\n2 cups flour\n1 tsp salt\n3 eggs\n\nMETHOD\n1. Mix it all.";
    expect(looksLikeIngredientList(text)).toBe(true);
  });
});

describe("extractIngredientsSection", () => {
  it("isolates the block between an Ingredients header and the next section header", () => {
    const caption = [
      "A Simple and Quick Tomato Pasta Recipe made with Garlic, Fresh Tomatoes.",
      "JUMP TO:",
      "0:00 Intro",
      "0:35 Boil the Pasta",
      "INGREDIENTS",
      "2 Cups | 200g Dried Pasta",
      "1/2 Teaspoon Salt",
      "2 Big Tomatoes, roughly sliced",
      "METHOD",
      "1. Bring water to a boil.",
      "2. Add pasta.",
      "Subscribe for more recipes!",
      "https://www.youtube.com/@example"
    ].join("\n");

    const section = extractIngredientsSection(caption);
    expect(section).toBe("2 Cups | 200g Dried Pasta\n1/2 Teaspoon Salt\n2 Big Tomatoes, roughly sliced");
    expect(section).not.toContain("JUMP TO");
    expect(section).not.toContain("Subscribe");
    expect(section).not.toContain("METHOD");
  });

  it("keeps trailing text on an inline 'Ingredients: ...' header line", () => {
    const text = "Ingredients: 2 cups flour, 1 tsp salt\nMethod\nMix well.";
    expect(extractIngredientsSection(text)).toBe("2 cups flour, 1 tsp salt");
  });

  it("falls back to the full trimmed text when no Ingredients header is found", () => {
    const text = "  so good today 😍 #foodie  ";
    expect(extractIngredientsSection(text)).toBe("so good today 😍 #foodie");
  });

  it("takes everything to the end when there's no following section header", () => {
    const text = "Ingredients\n2 cups flour\n1 egg";
    expect(extractIngredientsSection(text)).toBe("2 cups flour\n1 egg");
  });
});
