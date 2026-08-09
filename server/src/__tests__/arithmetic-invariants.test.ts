import { describe, expect, it } from "vitest";
import { computeDiscountPct } from "../lib/discount-approval/service.js";
import {
  computePayableWithRoundOff,
  computeRetailGstBreakup,
  defaultHsnForMetal,
} from "../lib/invoices/gst.js";
import {
  formatMoney,
  moneyToNumber,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  toMoney,
} from "../lib/money.js";
import { toPaise } from "../lib/payments/razorpay.js";
import {
  applyLotDeductionPlan,
  assertSaleLineArithmetic,
  computeExchangeValue,
  computeMetalIssueLossGrams,
  computeRetailInvoiceTotal,
  convertApiXauRateToGold22kPerGram,
  planMetalLotDeductions,
  roundWeightGrams,
} from "../lib/pricing/arithmetic.js";
import {
  calculateSellingPrice,
  resolveMakingChargesPct,
  resolveMarketRateForProduct,
} from "../lib/pricing/b2b-price.js";
import {
  calculateJewelryPrice,
  calculatePhysicalMetalWeightPerSet,
  calculateTotalMetalWeight,
  resolveMetalRatePerGram,
} from "../lib/pricing/jewelry-price.js";
import { computeRunMetalWeightGrams } from "../lib/production-runs/metal-inventory.js";
import { sumMetalLotGrams } from "../lib/production-runs/metal-lot-matching.js";

/** Every retail invoice must satisfy: payable - roundOff = taxable + tax (to the paisa). */
const expectInvoiceConsistent = (
  taxableValue: number,
  shopState: string,
  placeOfSupply: string,
) => {
  const invoice = computeRetailInvoiceTotal({
    taxableValue,
    shopState,
    placeOfSupply,
  });
  expect(invoice.payable - invoice.roundOff).toBeCloseTo(invoice.preRound, 2);
  expect(invoice.preRound).toBeCloseTo(
    taxableValue + invoice.taxTotal,
    2,
  );
  return invoice;
};

describe("money.ts — paisa-exact decimal arithmetic", () => {
  const cases: Array<[string, () => unknown, unknown]> = [
    ["0.1 + 0.2 = 0.30", () => sumMoney([0.1, 0.2]).toFixed(2), "0.30"],
    ["null → 0", () => toMoney(null).toNumber(), 0],
    ["empty string → 0", () => toMoney("").toNumber(), 0],
    ["99.999 rounds to 100.00", () => formatMoney(99.999), "100.00"],
    ["99999.99 + 0.01", () => sumMoney([99999.99, 0.01]).toFixed(2), "100000.00"],
    [
      "multiply 5850 × 10.5g",
      () => multiplyMoney(5850, 10.5).toFixed(2),
      "61425.00",
    ],
    [
      "subtract list − deal",
      () => subtractMoney(125000, 118750).toNumber(),
      6250,
    ],
  ];

  it.each(cases)("%s", (_label, fn, expected) => {
    expect(fn()).toEqual(expected);
  });
});

describe("GST — CGST/SGST/IGST and round-off", () => {
  it("intra-state: CGST + SGST equals rounded 3% total tax", () => {
    const values = [100, 999.99, 33333.33, 89000, 125000.5];
    for (const taxable of values) {
      const gst = computeRetailGstBreakup(taxable, "Maharashtra", "Maharashtra");
      expect(gst.cgst).toBe(gst.sgst);
      expect(gst.igst).toBe(0);
      // Each half is rounded independently — total tax is cgst + sgst, not raw 3%.
      expect(gst.cgst).toBe(Math.round(taxable * 0.015 * 100) / 100);
      expect(gst.cgst + gst.sgst).toBe(gst.cgst * 2);
      expectInvoiceConsistent(taxable, "Maharashtra", "Maharashtra");
    }
  });

  it("inter-state: 3% IGST only", () => {
    const gst = computeRetailGstBreakup(89000, "Maharashtra", "Rajasthan");
    expect(gst.igst).toBe(2670);
    expect(gst.cgst + gst.sgst).toBe(0);
    expectInvoiceConsistent(89000, "Maharashtra", "Rajasthan");
  });

  it("payable round-off never loses more than 49 paise", () => {
    for (const taxable of [1234.56, 45678.9, 99999.99]) {
      const gst = computeRetailGstBreakup(taxable, "Gujarat", "Gujarat");
      const preRound = taxable + gst.cgst + gst.sgst;
      const { payable, roundOff } = computePayableWithRoundOff(preRound);
      expect(Math.abs(roundOff)).toBeLessThanOrEqual(0.5);
      expect(payable).toBe(Math.round(preRound));
    }
  });

  it("HSN codes for metals", () => {
    expect(defaultHsnForMetal("Gold")).toBe("7113");
    expect(defaultHsnForMetal("Silver")).toBe("7114");
    expect(defaultHsnForMetal("Other")).toBe("7117");
  });
});

describe("B2B / retail list price — weight × rate + making", () => {
  it("22K gold ring: metal + making = total", () => {
    const weight = 10.5;
    const rate = 5850;
    const makingPct = 12;
    const breakdown = calculateSellingPrice({
      weightGrams: weight,
      metal: "Gold",
      makingChargesPct: makingPct,
      marketRatePerGram: rate,
    });
    expect(breakdown.metalValue).toBe(61425);
    expect(breakdown.makingCharges).toBe(7371);
    expect(breakdown.totalPrice).toBe(
      breakdown.metalValue + breakdown.makingCharges + breakdown.stoneCharges,
    );
  });

  it("18K rate derived from 22K spot", () => {
    const gold22k = 5850;
    const rate18k = resolveMarketRateForProduct(
      "Gold",
      "18K",
      gold22k,
      null,
    );
    expect(rate18k).toBe(Math.round(gold22k * (18 / 22) * 100) / 100);
    expect(rate18k).toBe(4786.36);
  });

  it("silver 925 uses silver spot; 24K silver scaled", () => {
    expect(resolveMarketRateForProduct("Silver", "925", null, 72.5)).toBe(72.5);
    expect(resolveMarketRateForProduct("Silver", "24K", null, 72.5)).toBe(77.33);
  });

  it("making charges pct by metal", () => {
    expect(resolveMakingChargesPct("Gold", 12, 8)).toBe(12);
    expect(resolveMakingChargesPct("Silver", 12, 8)).toBe(8);
  });
});

describe("design BOM pricing — jewelry-price.ts", () => {
  const bom = [
    {
      elementName: "Shank",
      elementType: "Casting",
      qtyPerSet: 1,
      metalWeightGrams: 4.2,
    },
    {
      elementName: "Top",
      elementType: "Motif",
      qtyPerSet: 1,
      weightGramsPerPc: 2.8,
      unitValue: 3500,
    },
    {
      elementName: "CZ",
      elementType: "Stone",
      qtyPerSet: 6,
      unitValue: 150,
      czWeight: 0.6,
    },
  ];

  it("physical metal per set = casting + motif weights", () => {
    expect(calculatePhysicalMetalWeightPerSet(bom)).toBe(7);
    expect(calculateTotalMetalWeight(bom)).toBe(4.2);
  });

  it("price breakdown sums to totalPrice exactly", () => {
    const lots = [{ id: "lot-1", metalType: "Gold", purity: "22K", currentRate: 5850 }];
    const price = calculateJewelryPrice({
      items: bom,
      metal: "Gold",
      purity: "22K",
      makingChargesPerSet: 2500,
      metalLots: lots,
    });
    expect(price.metalValue).toBe(roundWeightGrams(4.2 * 5850));
    expect(price.componentValue).toBe(3500 + 6 * 150);
    expect(price.totalPrice).toBe(
      price.metalValue + price.componentValue + price.makingCharges,
    );
  });

  it("uses linked casting lot rate when set", () => {
    const items = [
      {
        elementName: "Cast",
        elementType: "Casting",
        qtyPerSet: 1,
        metalWeightGrams: 5,
        metalLotId: "special-lot",
      },
    ];
    const lots = [
      { id: "special-lot", metalType: "Gold", purity: "22K", currentRate: 5900 },
      { id: "other", metalType: "Gold", purity: "22K", currentRate: 5800 },
    ];
    expect(resolveMetalRatePerGram("Gold", "22K", items, lots)).toBe(5900);
  });

  it("averages matching lot rates when no linked lot", () => {
    const lots = [
      { id: "a", metalType: "Gold", purity: "22K", currentRate: 5800 },
      { id: "b", metalType: "Gold", purity: "22K", currentRate: 5900 },
    ];
    expect(resolveMetalRatePerGram("Gold", "22K", [], lots)).toBe(5850);
  });
});

describe("production stock — grams conserved on deduction", () => {
  it("run metal = perSet × sets", () => {
    const items = [
      {
        elementName: "Cast",
        elementType: "Casting",
        qtyPerSet: 1,
        weightGramsPerPc: null,
        metalWeightGrams: 3.75,
        metalLotId: null,
      },
      {
        elementName: "Motif",
        elementType: "Motif",
        qtyPerSet: 2,
        weightGramsPerPc: 1.25,
        metalWeightGrams: null,
        metalLotId: null,
      },
    ];
    expect(computeRunMetalWeightGrams(items, 4)).toBe(25);
  });

  it("multi-lot plan deducts exact required grams", () => {
    const lots = [
      { id: "1", lotNumber: "G-001", weightGrams: 8.5 },
      { id: "2", lotNumber: "G-002", weightGrams: 3.33 },
      { id: "3", lotNumber: "G-003", weightGrams: 2.67 },
    ];
    const required = 12.5;
    const plan = planMetalLotDeductions(lots, required);
    expect(plan.totalDeducted).toBe(required);
    expect(plan.remaining).toBe(0);

    const after = applyLotDeductionPlan(lots, plan);
    const remainingStock = sumMetalLotGrams(after);
    expect(remainingStock).toBe(roundWeightGrams(sumMetalLotGrams(lots) - required));
  });

  it("fails plan when stock insufficient", () => {
    const plan = planMetalLotDeductions(
      [{ id: "1", lotNumber: "G-001", weightGrams: 5 }],
      7.5,
    );
    expect(plan.remaining).toBe(2.5);
    expect(plan.totalDeducted).toBe(5);
  });

  it("restore after deduct returns original weight", () => {
    const original = 50.25;
    const deduct = 12.75;
    const afterDeduct = roundWeightGrams(original - deduct);
    const restored = roundWeightGrams(afterDeduct + deduct);
    expect(restored).toBe(original);
  });
});

describe("karigar metal issue — loss in milligrams", () => {
  it("loss = issued − returned", () => {
    expect(computeMetalIssueLossGrams(10.5, 9.875)).toBe(0.625);
    expect(computeMetalIssueLossGrams(5, 5)).toBe(0);
  });
});

describe("exchange / old gold credit", () => {
  it("value = net weight × rate (2 dp)", () => {
    expect(computeExchangeValue(8.5, 5850)).toBe(49725);
    expect(computeExchangeValue(3.333, 5800)).toBe(19331.4);
  });
});

describe("market rate spot conversion", () => {
  it("API XAU rate → 22K per gram matches live-rate formula", () => {
    const xauPerInr = 1 / 280000;
    const rate = convertApiXauRateToGold22kPerGram(xauPerInr);
    const manual =
      Math.round((280000 / 31.1035) * (22 / 24) * 100) / 100;
    expect(rate).toBe(manual);
    expect(rate).toBe(8252.02);
  });
});

describe("sale line and cart arithmetic", () => {
  it("list − discount = deal for every line", () => {
    const lines = [
      { listPrice: 125000, discount: 6250, dealPrice: 118750 },
      { listPrice: 89000, discount: 0, dealPrice: 89000 },
      { listPrice: 45678.5, discount: 2283.93, dealPrice: 43394.57 },
    ];
    for (const line of lines) {
      expect(() => assertSaleLineArithmetic(line)).not.toThrow();
    }
  });

  it("rejects mismatched deal price", () => {
    expect(() =>
      assertSaleLineArithmetic({
        listPrice: 100000,
        discount: 5000,
        dealPrice: 95001,
      }),
    ).toThrow(/Sale line mismatch/);
  });

  it("cart taxable total = sum of deal prices", () => {
    const dealPrices = [118750, 89000, 43394.57];
    const total = moneyToNumber(sumMoney(dealPrices));
    expect(total).toBeCloseTo(251144.57, 2);
    expectInvoiceConsistent(total, "Maharashtra", "Maharashtra");
  });

  it("discount pct from list and discount amount", () => {
    expect(computeDiscountPct(100000, 5000)).toBe(5);
    expect(computeDiscountPct(89000, 1335)).toBeCloseTo(1.5, 5);
  });
});

describe("UPI / Razorpay — rupees to paise", () => {
  it("converts without float drift", () => {
    expect(toPaise(118750)).toBe(11875000);
    expect(toPaise(43394.57)).toBe(4339457);
    expect(toPaise(0.01)).toBe(1);
  });
});

describe("real-world invoice scenarios", () => {
  const scenarios = [
    {
      name: "Single 22K necklace intra-state",
      taxable: 245000,
      shop: "Maharashtra",
      pos: "Maharashtra",
    },
    {
      name: "Inter-state bridal set",
      taxable: 890000,
      shop: "Rajasthan",
      pos: "Maharashtra",
    },
    {
      name: "Small silver item",
      taxable: 3500,
      shop: "Gujarat",
      pos: "Gujarat",
    },
    {
      name: "Multi-item cart aggregate",
      taxable: 251144.57,
      shop: "Maharashtra",
      pos: "Maharashtra",
    },
  ];

  it.each(scenarios)("$name — invoice arithmetic holds", ({ taxable, shop, pos }) => {
    const invoice = expectInvoiceConsistent(taxable, shop, pos);
    expect(invoice.payable).toBeGreaterThan(0);
    expect(invoice.taxTotal).toBeGreaterThanOrEqual(0);
  });
});
