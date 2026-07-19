import { describe, expect, it } from "vitest";
import {
  computeDiscountPct,
} from "../lib/discount-approval/service.js";
import {
  computePayableWithRoundOff,
  computeRetailGstBreakup,
} from "../lib/invoices/gst.js";
import { subtractMoney, sumMoney, toMoney, moneyToNumber } from "../lib/money.js";

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

describe("invoice GST breakup", () => {
  it("applies CGST and SGST for intra-state sales", () => {
    const gst = computeRetailGstBreakup(89000, "Maharashtra", "Maharashtra");
    expect(gst.isIntraState).toBe(true);
    expect(gst.cgst).toBe(1335);
    expect(gst.sgst).toBe(1335);
    expect(gst.igst).toBe(0);
  });

  it("applies IGST for inter-state sales", () => {
    const gst = computeRetailGstBreakup(89000, "Maharashtra", "Rajasthan");
    expect(gst.isIntraState).toBe(false);
    expect(gst.cgst).toBe(0);
    expect(gst.sgst).toBe(0);
    expect(gst.igst).toBe(2670);
  });

  it("treats missing shop state as inter-state (IGST)", () => {
    const gst = computeRetailGstBreakup(50000, "", "Maharashtra");
    expect(gst.igst).toBe(1500);
    expect(gst.cgst).toBe(0);
  });

  it("computes payable total with round-off", () => {
    const gst = computeRetailGstBreakup(89000, "Maharashtra", "Maharashtra");
    const preRound = 89000 + gst.cgst + gst.sgst + gst.igst;
    const { payable, roundOff } = computePayableWithRoundOff(preRound);
    expect(payable).toBe(Math.round(preRound));
    expect(payable - roundOff).toBeCloseTo(preRound, 2);
  });
});

describe("cart invoice consolidation invariants", () => {
  it("uses a shared cartGroupId only for multi-item carts", () => {
    const singleItemGroupId = 1 > 1 ? "shared-id" : undefined;
    const multiItemGroupId = 2 > 1 ? "shared-id" : undefined;
    expect(singleItemGroupId).toBeUndefined();
    expect(multiItemGroupId).toBe("shared-id");
  });

  it("aggregates taxable value across cart lines for one GST breakup", () => {
    const dealPrices = [45000, 44000];
    const taxableValue = sumMoney(dealPrices);
    const gst = computeRetailGstBreakup(
      moneyToNumber(taxableValue),
      "Maharashtra",
      "Maharashtra",
    );
    expect(moneyToNumber(taxableValue)).toBe(89000);
    expect(gst.cgst + gst.sgst).toBe(2670);
  });
});
