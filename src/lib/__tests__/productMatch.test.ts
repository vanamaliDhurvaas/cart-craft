import { describe, expect, it, vi } from "vitest";

vi.mock("../kroger", () => ({
  searchProducts: vi.fn()
}));

import { matchIngredientToProduct } from "../productMatch";
import { searchProducts } from "../kroger";

describe("matchIngredientToProduct", () => {
  it("returns null product with 0 confidence when there are no candidates", async () => {
    (searchProducts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const result = await matchIngredientToProduct("flour", "loc1");
    expect(result.product).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("picks the candidate with the highest token overlap", async () => {
    (searchProducts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { productId: "1", upc: "111", description: "Kroger Brand Ketchup 20oz", brand: "Kroger", sizeDescription: "20oz" },
      { productId: "2", upc: "222", description: "All-Purpose Flour 5lb Bag", brand: "Kroger", sizeDescription: "5lb" }
    ]);
    const result = await matchIngredientToProduct("all-purpose flour", "loc1");
    expect(result.product?.productId).toBe("2");
    expect(result.confidence).toBeGreaterThan(0);
  });
});
