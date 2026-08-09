import { describe, expect, it } from "vitest";
import { computeRunMetalWeightGrams } from "../lib/production-runs/metal-inventory.js";
import { computeMetalPerSetGrams } from "../lib/production-runs/metal-stock.js";
import {
  itemNeedsRawMaterialDeduction,
  validateLotSelectionForItem,
} from "../lib/production-runs/raw-material.js";
import {
  assertMetalLotHasGrams,
  assertStoneLotHasCarats,
} from "../lib/production-runs/stock-validation.js";
import { ProductionRunError } from "../lib/production-runs/errors.js";

describe("production metal weight invariants", () => {
  it("computes per-set grams from motif and casting BOM elements", () => {
    const perSet = computeMetalPerSetGrams([
      { elementType: "Motif", qtyPerSet: 2, weightGramsPerPc: 1.5 },
      { elementType: "Casting", qtyPerSet: 1, weightGramsPerPc: null, metalWeightGrams: 3.2 },
      { elementType: "Stone", qtyPerSet: 4, weightGramsPerPc: 0.5 },
    ]);
    expect(perSet).toBe(6.2);
  });

  it("deducts perSetGrams × setsOrdered for a production run", () => {
    const items = [
      {
        elementName: "Ring shank",
        elementType: "Casting",
        qtyPerSet: 1,
        weightGramsPerPc: null,
        metalWeightGrams: 4.5,
        metalLotId: null,
      },
      {
        elementName: "Top motif",
        elementType: "Motif",
        qtyPerSet: 1,
        weightGramsPerPc: 2.5,
        metalWeightGrams: null,
        metalLotId: null,
      },
    ];

    expect(computeRunMetalWeightGrams(items, 3)).toBe(21);
    expect(computeRunMetalWeightGrams(items, 1)).toBe(7);
  });

  it("returns zero when BOM has no metal-bearing elements", () => {
    expect(
      computeRunMetalWeightGrams(
        [
          {
            elementName: "CZ",
            elementType: "Stone",
            qtyPerSet: 6,
            weightGramsPerPc: 0.2,
            metalWeightGrams: null,
            metalLotId: null,
          },
        ],
        5,
      ),
    ).toBe(0);
  });
});

describe("raw material deduction guards", () => {
  it("requires stone weight for motif/stone elements with CZ", () => {
    expect(
      itemNeedsRawMaterialDeduction({
        elementType: "Motif",
        metalWeightGrams: null,
        czWeight: 0.8,
      }),
    ).toBe(true);
    expect(
      itemNeedsRawMaterialDeduction({
        elementType: "Casting",
        metalWeightGrams: 5,
        czWeight: null,
      }),
    ).toBe(false);
  });

  it("throws when stone lot is missing before deduction", () => {
    expect(() =>
      validateLotSelectionForItem({
        id: "item-1",
        elementName: "Side stones",
        elementType: "Stone",
        czWeight: 1.2,
        castingReceived: true,
        metalLotId: null,
        stoneLotId: null,
        metalWeightGrams: null,
        rawMaterialDeducted: false,
      }),
    ).toThrow(/Select a stone lot/);
  });
});

describe("stock validation helpers", () => {
  it("blocks metal deduction when lot weight is insufficient", () => {
    expect(() =>
      assertMetalLotHasGrams(
        { lotNumber: "G-22K-001", weightGrams: 4.9 },
        5,
        "for this run",
      ),
    ).toThrow(ProductionRunError);
    expect(() =>
      assertMetalLotHasGrams({ lotNumber: "G-22K-001", weightGrams: 5 }, 5),
    ).not.toThrow();
  });

  it("blocks stone deduction when lot carats are insufficient", () => {
    expect(() =>
      assertStoneLotHasCarats(
        { certificateNumber: "ST-001", carat: 0.5 },
        0.8,
      ),
    ).toThrow(/Insufficient carats/);
  });
});
