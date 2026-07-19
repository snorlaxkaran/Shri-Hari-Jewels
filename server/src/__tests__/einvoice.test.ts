import { describe, expect, it } from "vitest";
import { mapInvoiceToInv1 } from "../lib/einvoice/inv1-mapper.js";
import {
  formatNicErrorDetails,
  parseNicErrorDetails,
} from "../lib/einvoice/errors.js";
import { isEinvoiceEligible } from "../lib/einvoice/eligibility.js";
import { isWithinCancellationWindow } from "../lib/einvoice/service.js";
import type { Invoice, ShopSettings } from "../types.js";

const baseSettings: ShopSettings = {
  businessName: "Shri Hari Jewels",
  address: "MI Road",
  addressLine1: "MI Road",
  addressLine2: null,
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  country: "India",
  phone: "9876543210",
  email: "billing@example.com",
  upiVpa: null,
  panNumber: "ABCDE1234F",
  gstNumber: "08ABCDE1234F1Z5",
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
  goldMakingChargesPct: 17,
  silverMakingChargesPct: 17,
  makingChargesOverrideNote: null,
  metalWastageAlertPercent: 3,
  eInvoiceMandatory: true,
};

const baseInvoice: Invoice = {
  id: "inv-1",
  branchId: "branch-1",
  invoiceNo: "INV-2025-0001",
  customerId: "cust-1",
  customerName: "ABC Traders",
  customerMobile: "9123456780",
  subtotal: 100000,
  discount: 0,
  taxableValue: 100000,
  cgst: 1500,
  sgst: 1500,
  igst: 0,
  roundOff: 0,
  total: 103000,
  paymentMode: "Cash",
  status: "Paid",
  placeOfSupply: "Rajasthan",
  createdAt: "2025-07-19T10:00:00.000Z",
  items: [
    {
      id: "line-1",
      saleId: "sale-1",
      itemCode: "GOLD-001",
      productName: "22K Gold Necklace",
      sku: "NK-22K",
      hsnCode: "7113",
      metal: "Gold",
      listPrice: 100000,
      discount: 0,
      amount: 100000,
    },
  ],
  itemCount: 1,
};

describe("mapInvoiceToInv1", () => {
  it("maps a B2B intra-state invoice to NIC INV-1 schema", () => {
    const payload = mapInvoiceToInv1({
      invoice: baseInvoice,
      settings: baseSettings,
      customer: {
        gstNumber: "08FGHIJ5678K1L2",
        gstRegisteredName: "ABC Traders Pvt Ltd",
        name: "ABC Traders",
        billingAddressLine1: "Tonk Road",
        billingAddressLine2: undefined,
        billingCity: "Jaipur",
        billingState: "Rajasthan",
        billingPincode: "302015",
        mobile: "9123456780",
        email: "buyer@example.com",
      },
    });

    expect(payload.Version).toBe("1.1");
    expect(payload.TranDtls.SupTyp).toBe("B2B");
    expect(payload.DocDtls.No).toBe("INV-2025-0001");
    expect(payload.DocDtls.Dt).toBe("19/07/2025");
    expect(payload.SellerDtls.Gstin).toBe("08ABCDE1234F1Z5");
    expect(payload.BuyerDtls.Gstin).toBe("08FGHIJ5678K1L2");
    expect(payload.BuyerDtls.Pos).toBe("08");
    expect(payload.ItemList).toHaveLength(1);
    expect(payload.ItemList[0]?.GstRt).toBe(3);
    expect(payload.ItemList[0]?.CgstAmt).toBe(1500);
    expect(payload.ItemList[0]?.SgstAmt).toBe(1500);
    expect(payload.ValDtls.TotInvVal).toBe(103000);
  });

  it("uses IGST line taxes for inter-state invoices", () => {
    const payload = mapInvoiceToInv1({
      invoice: {
        ...baseInvoice,
        cgst: 0,
        sgst: 0,
        igst: 3000,
        total: 103000,
      },
      settings: baseSettings,
      customer: {
        gstNumber: "27FGHIJ5678K1L2",
        gstRegisteredName: "Mumbai Buyer",
        name: "Mumbai Buyer",
        billingAddressLine1: "Andheri",
        billingAddressLine2: undefined,
        billingCity: "Mumbai",
        billingState: "Maharashtra",
        billingPincode: "400001",
        mobile: "9000000000",
        email: undefined,
      },
    });

    expect(payload.ItemList[0]?.IgstAmt).toBe(3000);
    expect(payload.ItemList[0]?.CgstAmt).toBe(0);
    expect(payload.ValDtls.IgstVal).toBe(3000);
  });

  it("rejects invoices without buyer GSTIN", () => {
    expect(() =>
      mapInvoiceToInv1({
        invoice: baseInvoice,
        settings: baseSettings,
        customer: {
          gstNumber: undefined,
          gstRegisteredName: undefined,
          name: "Walk-in",
          billingAddressLine1: "Local",
          billingAddressLine2: undefined,
          billingCity: "Jaipur",
          billingState: "Rajasthan",
          billingPincode: "302001",
          mobile: "9000000000",
          email: undefined,
        },
      }),
    ).toThrow(/Buyer GSTIN is required/);
  });
});

describe("parseNicErrorDetails", () => {
  it("formats IRP validation errors clearly", () => {
    const details = parseNicErrorDetails([
      { ErrorCode: "2150", ErrorMessage: "Duplicate IRN" },
      { ErrorCode: "2176", ErrorMessage: "Invalid GSTIN of buyer" },
    ]);
    expect(formatNicErrorDetails(details)).toBe(
      "2150: Duplicate IRN; 2176: Invalid GSTIN of buyer",
    );
  });

  it("decodes base64-encoded IRP error payloads", () => {
    const encoded = Buffer.from(
      JSON.stringify([{ ErrorCode: "9999", ErrorMessage: "Schema validation failed" }]),
    ).toString("base64");
    const details = parseNicErrorDetails(encoded);
    expect(details[0]?.ErrorMessage).toBe("Schema validation failed");
  });
});

describe("isWithinCancellationWindow", () => {
  it("allows cancellation within 24 hours of ackDate", () => {
    const ackDate = new Date("2025-07-19T10:00:00.000Z");
    const now = new Date("2025-07-20T09:59:00.000Z");
    expect(isWithinCancellationWindow(ackDate, now)).toBe(true);
  });

  it("blocks cancellation after 24 hours", () => {
    const ackDate = new Date("2025-07-19T10:00:00.000Z");
    const now = new Date("2025-07-20T10:00:01.000Z");
    expect(isWithinCancellationWindow(ackDate, now)).toBe(false);
  });
});

describe("isEinvoiceEligible", () => {
  it("requires mandatory flag, seller GSTIN, NIC config, and buyer GSTIN", () => {
    expect(
      isEinvoiceEligible({
        settings: { gstNumber: "08ABCDE1234F1Z5", eInvoiceMandatory: true },
        buyerGstNumber: "08FGHIJ5678K1L2",
      }),
    ).toBe(false);
  });
});
