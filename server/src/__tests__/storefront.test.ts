import { describe, expect, it } from "vitest";
import { generateWebOrderNo } from "../lib/storefront/web-order-no.js";

describe("generateWebOrderNo", () => {
  it("starts at WEB-YYYY-0001 when no prior orders", () => {
    const year = new Date().getFullYear();
    expect(generateWebOrderNo([])).toBe(`WEB-${year}-0001`);
  });

  it("increments from existing web order numbers", () => {
    const year = new Date().getFullYear();
    const existing = [`WEB-${year}-0001`, `WEB-${year}-0003`, `ORD-${year}-0001`];
    expect(generateWebOrderNo(existing)).toBe(`WEB-${year}-0004`);
  });
});
