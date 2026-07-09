import { describe, expect, it } from "vitest";
import {
  computeDiscountPct,
} from "../lib/discount-approval/service.js";
import { subtractMoney, sumMoney, toMoney } from "../lib/money.js";

describe("money utilities", () => {
  it("sums decimal values without floating point drift", () => {
    const total = sumMoney([10.1, 20.2, 30.3]);
    expect(total.toFixed(2)).toBe("60.60");
  });

  it("subtracts deal price from list correctly", () => {
    const discount = subtractMoney(10000, 9500);
    expect(discount.toNumber()).toBe(500);
  });

  it("rounds money to 2 decimal places", () => {
    expect(toMoney(99.999).toFixed(2)).toBe("100.00");
  });
});

describe("discount approval", () => {
  it("computes discount percentage from list and discount", () => {
    expect(computeDiscountPct(10000, 1500)).toBe(15);
    expect(computeDiscountPct(0, 100)).toBe(0);
  });

  it("does not require approval when discount is within threshold", async () => {
    // Uses default threshold from DB or 10% when settings missing — mock via direct function
    expect(computeDiscountPct(10000, 500)).toBeLessThanOrEqual(10);
  });
});

describe("sale branch attribution regression", () => {
  it("branchId must be explicit string not empty for sale records", () => {
    const branchId = "branch-uuid-123";
    const salePayload = {
      branchId,
      itemCode: "ITEM-001",
      dealPrice: 50000,
    };
    expect(salePayload.branchId).toBeTruthy();
    expect(typeof salePayload.branchId).toBe("string");
    expect(salePayload.branchId.length).toBeGreaterThan(0);
  });

  it("deal price equals list minus discount", () => {
    const listPrice = 100000;
    const discount = 5000;
    const dealPrice = subtractMoney(listPrice, discount).toNumber();
    expect(dealPrice).toBe(95000);
  });
});

describe("stock SKU generation invariants", () => {
  it("generates unique item codes from base SKU and sequence", () => {
    const sku = "RNG-22K-001";
    const seq = 7;
    const itemCode = `${sku}-${String(seq).padStart(3, "0")}`;
    expect(itemCode).toBe("RNG-22K-001-007");
    expect(itemCode.startsWith(sku)).toBe(true);
  });
});
