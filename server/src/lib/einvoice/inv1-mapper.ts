import type { Customer, Invoice, InvoiceItem, ShopSettings } from "../../types.js";
import { gstStateCodeFromNumber } from "../invoices/gst-invoice-layout.js";
import { moneyToNumber } from "../money.js";
import { EinvoiceError } from "./errors.js";

export type Inv1Payload = {
  Version: string;
  TranDtls: {
    TaxSch: "GST";
    SupTyp: "B2B";
    RegRev: "Y" | "N";
    IgstOnIntra: "Y" | "N";
  };
  DocDtls: {
    Typ: "INV";
    No: string;
    Dt: string;
  };
  SellerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm?: string;
    Addr1: string;
    Addr2?: string;
    Loc: string;
    Pin: number;
    Stcd: string;
    Ph?: string;
    Em?: string;
  };
  BuyerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm?: string;
    Pos: string;
    Addr1: string;
    Addr2?: string;
    Loc: string;
    Pin?: number;
    Stcd: string;
    Ph?: string;
    Em?: string;
  };
  ItemList: Array<{
    SlNo: string;
    PrdDesc: string;
    IsServc: "Y" | "N";
    HsnCd: string;
    Qty: number;
    Unit: string;
    UnitPrice: number;
    TotAmt: number;
    Discount: number;
    AssAmt: number;
    GstRt: number;
    IgstAmt: number;
    CgstAmt: number;
    SgstAmt: number;
    TotItemVal: number;
  }>;
  ValDtls: {
    AssVal: number;
    CgstVal: number;
    SgstVal: number;
    IgstVal: number;
    RndOffAmt: number;
    TotInvVal: number;
  };
};

export type InvoiceMappingInput = {
  invoice: Invoice;
  settings: ShopSettings;
  customer: Pick<
    Customer,
    | "gstNumber"
    | "gstRegisteredName"
    | "name"
    | "billingAddressLine1"
    | "billingAddressLine2"
    | "billingCity"
    | "billingState"
    | "billingPincode"
    | "mobile"
    | "email"
  > | null;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const sanitizeText = (value: string, maxLength: number): string =>
  value.replace(/["\\]/g, " ").trim().slice(0, maxLength);

const formatNicDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const normalizeDocNo = (invoiceNo: string): string => {
  const trimmed = invoiceNo.trim().slice(0, 16);
  if (!/^[a-zA-Z1-9]/.test(trimmed)) {
    throw new EinvoiceError(
      `Invoice number "${invoiceNo}" is invalid for e-Invoice (must not start with 0, /, or -).`,
      "INVALID_DOC_NO",
    );
  }
  return trimmed;
};

const parsePincode = (value?: string | null): number | undefined => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length !== 6) return undefined;
  return Number(digits);
};

const resolveSellerAddress = (settings: ShopSettings) => {
  const line1 = sanitizeText(
    settings.addressLine1?.trim() || settings.address?.trim() || settings.businessName,
    100,
  );
  const line2 = settings.addressLine2?.trim()
    ? sanitizeText(settings.addressLine2, 100)
    : undefined;
  const loc = sanitizeText(settings.city?.trim() || "NA", 50);
  const pin = parsePincode(settings.pincode);
  const stcd = gstStateCodeFromNumber(settings.gstNumber);
  if (!pin || !stcd) {
    throw new EinvoiceError(
      "Seller pincode and state (via GSTIN) are required for e-Invoice.",
      "SELLER_ADDRESS",
    );
  }
  return { line1, line2, loc, pin, stcd };
};

const resolveBuyerAddress = (
  invoice: Invoice,
  customer: InvoiceMappingInput["customer"],
) => {
  const gstin = customer?.gstNumber?.trim().toUpperCase();
  if (!gstin) {
    throw new EinvoiceError(
      "Buyer GSTIN is required for B2B e-Invoice generation.",
      "BUYER_GSTIN",
    );
  }

  const legalName = sanitizeText(
    customer?.gstRegisteredName?.trim() || customer?.name?.trim() || invoice.customerName,
    100,
  );
  const line1 = sanitizeText(
    customer?.billingAddressLine1?.trim() || `${invoice.customerName} billing address`,
    100,
  );
  const line2 = customer?.billingAddressLine2?.trim()
    ? sanitizeText(customer.billingAddressLine2, 100)
    : undefined;
  const loc = sanitizeText(customer?.billingCity?.trim() || invoice.placeOfSupply?.trim() || "NA", 100);
  const stcd = gstStateCodeFromNumber(gstin) ?? "96";
  const pos =
    gstStateCodeFromNumber(gstin) ??
    gstStateCodeFromNumber(customer?.billingState) ??
    stcd;

  return {
    gstin,
    legalName,
    line1,
    line2,
    loc,
    pin: parsePincode(customer?.billingPincode),
    stcd,
    pos,
    phone: customer?.mobile?.replace(/\D/g, "").slice(0, 12),
    email: customer?.email?.trim(),
  };
};

const computeItemTax = (
  item: InvoiceItem,
  invoice: Invoice,
  isIntraState: boolean,
) => {
  const assAmt = round2(moneyToNumber(item.amount));
  const discount = round2(moneyToNumber(item.discount));
  const gstRt = 3;
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;

  if (isIntraState) {
    cgstAmt = round2(assAmt * 0.015);
    sgstAmt = round2(assAmt * 0.015);
  } else {
    igstAmt = round2(assAmt * 0.03);
  }

  return {
    assAmt,
    discount,
    gstRt,
    cgstAmt,
    sgstAmt,
    igstAmt,
    totItemVal: round2(assAmt + cgstAmt + sgstAmt + igstAmt),
  };
};

export const mapInvoiceToInv1 = (input: InvoiceMappingInput): Inv1Payload => {
  const { invoice, settings, customer } = input;

  if (!settings.gstNumber?.trim()) {
    throw new EinvoiceError("Seller GSTIN is not configured.", "SELLER_GSTIN");
  }

  const sellerGstin = settings.gstNumber.trim().toUpperCase();
  const sellerAddress = resolveSellerAddress(settings);
  const buyer = resolveBuyerAddress(invoice, customer);
  const isIntraState = invoice.igst <= 0;

  const itemList = invoice.items.map((item, index) => {
    const tax = computeItemTax(item, invoice, isIntraState);
    return {
      SlNo: String(index + 1),
      PrdDesc: sanitizeText(item.productName, 300),
      IsServc: item.metal === "Service" ? ("Y" as const) : ("N" as const),
      HsnCd: (item.hsnCode ?? "7113").replace(/\D/g, "").slice(0, 8),
      Qty: 1,
      Unit: "PCS",
      UnitPrice: tax.assAmt,
      TotAmt: tax.assAmt,
      Discount: tax.discount,
      AssAmt: tax.assAmt,
      GstRt: tax.gstRt,
      IgstAmt: tax.igstAmt,
      CgstAmt: tax.cgstAmt,
      SgstAmt: tax.sgstAmt,
      TotItemVal: tax.totItemVal,
    };
  });

  if (itemList.length === 0) {
    throw new EinvoiceError("Invoice has no line items.", "EMPTY_INVOICE");
  }

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N",
      IgstOnIntra: "N",
    },
    DocDtls: {
      Typ: "INV",
      No: normalizeDocNo(invoice.invoiceNo),
      Dt: formatNicDate(invoice.createdAt),
    },
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: sanitizeText(settings.gstRegisteredName?.trim() || settings.businessName, 100),
      TrdNm: sanitizeText(settings.businessName, 100),
      Addr1: sellerAddress.line1,
      Addr2: sellerAddress.line2,
      Loc: sellerAddress.loc,
      Pin: sellerAddress.pin,
      Stcd: sellerAddress.stcd,
      Ph: settings.phone?.replace(/\D/g, "").slice(0, 12),
      Em: settings.email?.trim(),
    },
    BuyerDtls: {
      Gstin: buyer.gstin,
      LglNm: buyer.legalName,
      Pos: buyer.pos,
      Addr1: buyer.line1,
      Addr2: buyer.line2,
      Loc: buyer.loc,
      Pin: buyer.pin,
      Stcd: buyer.stcd,
      Ph: buyer.phone,
      Em: buyer.email,
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: round2(moneyToNumber(invoice.taxableValue)),
      CgstVal: round2(moneyToNumber(invoice.cgst)),
      SgstVal: round2(moneyToNumber(invoice.sgst)),
      IgstVal: round2(moneyToNumber(invoice.igst)),
      RndOffAmt: round2(moneyToNumber(invoice.roundOff)),
      TotInvVal: round2(moneyToNumber(invoice.total)),
    },
  };
};
