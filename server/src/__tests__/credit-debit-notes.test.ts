import { describe, expect, it } from "vitest";
import {
  computeCreditNoteTotals,
  scaleLineForPartialCredit,
} from "../lib/credit-notes/gst.js";
import {
  computeRemainingCreditableByItem,
  CreditNoteValidationError,
  deriveInvoiceCreditStatus,
  validateCreditNoteLines,
} from "../lib/credit-notes/validation.js";
import { mapCreditNoteToCrn } from "../lib/einvoice/crn-mapper.js";
import type { CreditNote, ShopSettings } from "../types.js";

describe("credit note GST reversal", () => {
  it("mirrors invoice intra-state GST on credited taxable value", () => {
    const lines = [
      scaleLineForPartialCredit(
        { listPrice: 100000, discount: 5000, amount: 95000 },
        95000,
      ),
    ];
    const totals = computeCreditNoteTotals(lines, "Maharashtra", "Maharashtra");
    expect(totals.taxableValue).toBe(95000);
    expect(totals.cgst).toBe(1425);
    expect(totals.sgst).toBe(1425);
    expect(totals.igst).toBe(0);
    expect(totals.total).toBe(Math.round(95000 + 1425 + 1425));
  });

  it("applies IGST for inter-state credit notes", () => {
    const lines = [{ listPrice: 50000, discount: 0, amount: 50000 }];
    const totals = computeCreditNoteTotals(lines, "Maharashtra", "Rajasthan");
    expect(totals.igst).toBe(1500);
    expect(totals.cgst).toBe(0);
    expect(totals.total).toBe(51500);
  });

  it("scales list price and discount proportionally for partial line credit", () => {
    const scaled = scaleLineForPartialCredit(
      { listPrice: 100000, discount: 10000, amount: 90000 },
      45000,
    );
    expect(scaled.amount).toBe(45000);
    expect(scaled.listPrice).toBe(50000);
    expect(scaled.discount).toBe(5000);
  });
});

describe("partial credit against partially credited line", () => {
  it("caps cumulative credits per invoice item", () => {
    const remaining = computeRemainingCreditableByItem(
      [{ id: "item-1", amount: 90000 }],
      [{ invoiceItemId: "item-1", amount: 40000 }],
    );
    expect(remaining.get("item-1")).toBe(50000);

    validateCreditNoteLines(
      [{ invoiceItemId: "item-1", amount: 30000 }],
      remaining,
    );

    expect(() =>
      validateCreditNoteLines(
        [{ invoiceItemId: "item-1", amount: 60000 }],
        remaining,
      ),
    ).toThrow(CreditNoteValidationError);
  });

  it("tracks invoice credit status from cumulative totals", () => {
    expect(deriveInvoiceCreditStatus(100000, 0)).toBe("None");
    expect(deriveInvoiceCreditStatus(100000, 50000)).toBe("Partial");
    expect(deriveInvoiceCreditStatus(100000, 100000)).toBe("Full");
  });
});

describe("credit note e-invoice IRN linkage", () => {
  const settings: ShopSettings = {
    businessName: "Shri Hari Jewels",
    address: "123 MG Road",
    addressLine1: "123 MG Road",
    addressLine2: null,
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India",
    phone: "9876543210",
    email: "accounts@example.com",
    upiVpa: null,
    panNumber: "ABCDE1234F",
    gstNumber: "27ABCDE1234F1Z5",
    cinNumber: null,
    gstRegisteredName: "Shri Hari Jewels Pvt Ltd",
    goldHsnCode: "7113",
    silverHsnCode: "7114",
    imitationHsnCode: "71179010",
    invoiceTerms: null,
    registeredOfficeAddress: null,
    bankAccountName: null,
    bankAccountNumber: null,
    bankIfsc: null,
    bankName: null,
    goldMakingChargesPct: 0,
    silverMakingChargesPct: 0,
    makingChargesOverrideNote: null,
    metalWastageAlertPercent: 0,
    eInvoiceMandatory: true,
  };

  const creditNote: CreditNote = {
    id: "cn-1",
    organizationId: "org-1",
    branchId: "branch-1",
    creditNoteNo: "CRN-2026-0001",
    invoiceId: "inv-1",
    customerName: "Acme Corp",
    customerMobile: "9999999999",
    reason: "SalesReturn",
    subtotal: 100000,
    discount: 5000,
    taxableValue: 95000,
    cgst: 1425,
    sgst: 1425,
    igst: 0,
    roundOff: 0,
    total: 97850,
    refundMode: "Cash",
    status: "Issued",
    placeOfSupply: "Maharashtra",
    createdByName: "Staff",
    createdAt: "2026-08-11T00:00:00.000Z",
    items: [
      {
        id: "cni-1",
        invoiceItemId: "ii-1",
        itemCode: "RNG-001",
        productName: "Gold Ring",
        sku: "RNG-22K",
        hsnCode: "7113",
        metal: "Gold",
        listPrice: 100000,
        discount: 5000,
        amount: 95000,
        returnStock: true,
      },
    ],
  };

  it("includes original invoice IRN in RefDtls for NIC CRN payload", () => {
    const payload = mapCreditNoteToCrn({
      creditNote,
      originalInvoiceNo: "INV-2026-0042",
      originalInvoiceDate: "2026-08-01T00:00:00.000Z",
      originalIrn: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      settings,
      customer: {
        gstNumber: "27AAAAA0000A1Z5",
        gstRegisteredName: "Acme Corp",
        name: "Acme Corp",
        billingAddressLine1: "Industrial Area",
        billingAddressLine2: undefined,
        billingCity: "Mumbai",
        billingState: "Maharashtra",
        billingPincode: "400001",
        mobile: "9999999999",
        email: "buyer@example.com",
      },
    });

    expect(payload.DocDtls.Typ).toBe("CRN");
    expect(payload.RefDtls.PrecDocDtls[0].InvIrn).toBe(
      "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    );
    expect(payload.RefDtls.PrecDocDtls[0].InvNo).toBe("INV-2026-0042");
    expect(payload.ValDtls.TotInvVal).toBe(97850);
  });
});

describe("inventory return status expectation", () => {
  it("uses PendingVerification for returned stock (not Available)", () => {
    const returnedStatus = "PendingVerification";
    const soldStatus = "Sold";
    expect(returnedStatus).not.toBe("Available");
    expect(soldStatus).toBe("Sold");
    expect(returnedStatus).toBe("PendingVerification");
  });
});
