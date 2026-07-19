import { describe, expect, it } from "vitest";
import {
  isHallmarked,
  requiresHallmark,
  validateHuid,
} from "../lib/hallmark/requires-hallmark.js";

describe("hallmark rules", () => {
  it("requires hallmark for gold above weight threshold", () => {
    expect(requiresHallmark({ metal: "Gold", weightGrams: 4.5 })).toBe(true);
    expect(requiresHallmark({ metal: "Gold", weightGrams: 1 })).toBe(false);
    expect(requiresHallmark({ metal: "Silver", weightGrams: 10 })).toBe(false);
  });

  it("detects hallmarked units by huid or legacy number", () => {
    expect(isHallmarked({ huid: "A1B2C3" })).toBe(true);
    expect(isHallmarked({ hallmarkNumber: "OLD123" })).toBe(true);
    expect(isHallmarked({})).toBe(false);
  });

  it("validates 6-character HUID format", () => {
    expect(validateHuid("a1b2c3")).toBe("A1B2C3");
    expect(() => validateHuid("ABC")).toThrow();
  });
});
