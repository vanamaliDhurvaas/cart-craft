import { describe, expect, it } from "vitest";
import { packagesNeeded, parseSizeDescription } from "../units";

describe("parseSizeDescription", () => {
  it("parses a two-word volume unit", () => {
    expect(parseSizeDescription("32 FL OZ")).toEqual({
      unit: "fl oz",
      family: "volume",
      baseValue: 32 * 29.5735
    });
  });

  it("parses a count unit shorthand ('CT')", () => {
    const parsed = parseSizeDescription("12 CT");
    expect(parsed?.family).toBe("count");
    expect(parsed?.baseValue).toBe(12);
  });

  it("ignores trailing descriptor words like 'BAG'", () => {
    const parsed = parseSizeDescription("5 LB BAG");
    expect(parsed?.family).toBe("weight");
    expect(parsed?.baseValue).toBeCloseTo(5 * 453.592, 1);
  });

  it("returns null for unparseable strings", () => {
    expect(parseSizeDescription(null)).toBeNull();
    expect(parseSizeDescription("")).toBeNull();
    expect(parseSizeDescription("family size")).toBeNull();
  });
});

describe("packagesNeeded", () => {
  it("buys just one bottle for a small volume amount (the reported syrup bug)", () => {
    // 4 tbsp needed, a 32 fl oz bottle available — must NOT come out as 4.
    expect(packagesNeeded(4, "tbsp", "32 FL OZ")).toBe(1);
  });

  it("buys one carton of eggs for a single-egg need", () => {
    expect(packagesNeeded(1, "each", "12 CT")).toBe(1);
  });

  it("buys multiple packages when the need genuinely exceeds one package", () => {
    // 40 fl oz needed, only sold in 16 fl oz bottles -> need 3.
    expect(packagesNeeded(40, "fl oz", "16 FL OZ")).toBe(3);
  });

  it("falls back to 1 package for volume/weight items with no usable size data", () => {
    expect(packagesNeeded(4, "tbsp", null)).toBe(1);
    expect(packagesNeeded(2, "cup", "family size")).toBe(1);
  });

  it("falls back to the rounded raw quantity for discrete counted items with no size data", () => {
    expect(packagesNeeded(3, "each", null)).toBe(3);
  });

  it("falls back to the rounded raw quantity when the ingredient's unit isn't recognized", () => {
    expect(packagesNeeded(2.4, "to taste", "32 FL OZ")).toBe(2);
  });

  it("never returns less than 1", () => {
    expect(packagesNeeded(0.1, "tsp", "32 FL OZ")).toBe(1);
  });
});
