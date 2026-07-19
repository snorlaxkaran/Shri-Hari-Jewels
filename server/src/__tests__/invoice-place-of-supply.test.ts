import { describe, expect, it } from "vitest";
import { resolveBranchState } from "../lib/branches/resolve-state.js";
import { resolveRetailPlaceFields } from "../lib/invoices/pdf.js";

describe("resolveBranchState", () => {
  it("reads Delhi from branch name and address", () => {
    expect(
      resolveBranchState({
        id: "delhi",
        name: "Delhi Store",
        address: "Connaught Place, New Delhi",
      }),
    ).toBe("Delhi");
  });

  it("reads Rajasthan from Jaipur branch", () => {
    expect(
      resolveBranchState({
        id: "jaipur",
        name: "Jaipur Store",
        address: "MI Road, Jaipur, Rajasthan",
      }),
    ).toBe("Rajasthan");
  });

  it("does not default to Jammu & Kashmir", () => {
    expect(
      resolveBranchState({
        id: "custom-1",
        name: "Showroom",
        address: "Main Road",
      }),
    ).toBeNull();
  });
});

describe("resolveRetailPlaceFields", () => {
  it("uses selling branch over stored invoice place of supply", () => {
    const result = resolveRetailPlaceFields(
      {
        id: "inv-1",
        branchId: "delhi",
        invoiceNo: "INV-2026-001",
        customerName: "Karan Barman",
        customerMobile: "9358410583",
        subtotal: 1000,
        discount: 0,
        taxableValue: 1000,
        cgst: 15,
        sgst: 15,
        igst: 0,
        roundOff: 0,
        total: 1030,
        paymentMode: "Cash",
        status: "Paid",
        placeOfSupply: "Jammu & Kashmir",
        createdAt: new Date().toISOString(),
        items: [],
        itemCount: 0,
      },
      { businessName: "Test", state: "Maharashtra" } as never,
      { id: "delhi", name: "Delhi Store", address: "Connaught Place, New Delhi" },
    );

    expect(result.placeOfSupply).toBe("Delhi");
    expect(result.placeOfDelivery).toBe("Delhi");
  });
});
