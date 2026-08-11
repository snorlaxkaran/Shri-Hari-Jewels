import type { Customer, CreditNote, ShopSettings } from "../../types.js";
import { gstStateCodeFromNumber } from "../invoices/gst-invoice-layout.js";
import { moneyToNumber } from "../money.js";
import { EinvoiceError } from "./errors.js";
import type { Inv1Payload } from "./inv1-mapper.js";

export type CrnPayload = Inv1Payload & {
  DocDtls: {
    Typ: "CRN";
    No: string;
    Dt: string;
  };
  RefDtls: {
    InvRm: "Y";
    PrecDocDtls: Array<{
      InvNo: string;
      InvDt: string;
      InvIrn: string;
    }>;
  };
};

export type CreditNoteMappingInput = {
  creditNote: CreditNote;
  originalInvoiceNo: string;
  originalInvoiceDate: string;
  originalIrn: string;
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

const normalizeDocNo = (docNo: string): string => {
  const trimmed = docNo.trim().slice(0, 16);
  if (!/^[a-zA-Z1-9]/.test(trimmed)) {
    throw new EinvoiceError(
      `Credit note number "${docNo}" is invalid for e-Invoice.`,
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
  creditNote: CreditNote,
  customer: CreditNoteMappingInput["customer"],
) => {
  const gstin = customer?.gstNumber?.trim().toUpperCase();
  if (!gstin) {
    throw new EinvoiceError(
      "Buyer GSTIN is required for B2B e-Invoice credit note.",
      "BUYER_GSTIN",
    );
  }

  const legalName = sanitizeText(
    customer?.gstRegisteredName?.trim() || customer?.name?.trim() || creditNote.customerName,
    100,
  );
  const line1 = sanitizeText(
    customer?.billingAddressLine1?.trim() || `${creditNote.customerName} billing address`,
    100,
  );
  const line2 = customer?.billingAddressLine2?.trim()
    ? sanitizeText(customer.billingAddressLine2, 100)
    : undefined;
  const loc = sanitizeText(
    customer?.billingCity?.trim() || creditNote.placeOfSupply?.trim() || "NA",
    100,
  );
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

export const mapCreditNoteToCrn = (input: CreditNoteMappingInput): CrnPayload => {
  const { creditNote, settings, customer, originalInvoiceNo, originalInvoiceDate, originalIrn } =
    input;

  if (!settings.gstNumber?.trim()) {
    throw new EinvoiceError("Seller GSTIN is not configured.", "SELLER_GSTIN");
  }
  if (!originalIrn.trim()) {
    throw new EinvoiceError("Original invoice IRN is required for credit note e-Invoice.", "NO_IRN");
  }

  const sellerGstin = settings.gstNumber.trim().toUpperCase();
  const sellerAddress = resolveSellerAddress(settings);
  const buyer = resolveBuyerAddress(creditNote, customer);
  const isIntraState = creditNote.igst <= 0;

  const itemList = creditNote.items.map((item, index) => {
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
      SlNo: String(index + 1),
      PrdDesc: sanitizeText(item.productName, 300),
      IsServc: item.metal === "Service" ? ("Y" as const) : ("N" as const),
      HsnCd: (item.hsnCode ?? "7113").replace(/\D/g, "").slice(0, 8),
      Qty: 1,
      Unit: "PCS",
      UnitPrice: assAmt,
      TotAmt: assAmt,
      Discount: discount,
      AssAmt: assAmt,
      GstRt: gstRt,
      IgstAmt: igstAmt,
      CgstAmt: cgstAmt,
      SgstAmt: sgstAmt,
      TotItemVal: round2(assAmt + cgstAmt + sgstAmt + igstAmt),
    };
  });

  if (itemList.length === 0) {
    throw new EinvoiceError("Credit note has no line items.", "EMPTY_CREDIT_NOTE");
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
      Typ: "CRN",
      No: normalizeDocNo(creditNote.creditNoteNo),
      Dt: formatNicDate(creditNote.createdAt),
    },
    RefDtls: {
      InvRm: "Y",
      PrecDocDtls: [
        {
          InvNo: normalizeDocNo(originalInvoiceNo),
          InvDt: formatNicDate(originalInvoiceDate),
          InvIrn: originalIrn.trim(),
        },
      ],
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
      AssVal: round2(moneyToNumber(creditNote.taxableValue)),
      CgstVal: round2(moneyToNumber(creditNote.cgst)),
      SgstVal: round2(moneyToNumber(creditNote.sgst)),
      IgstVal: round2(moneyToNumber(creditNote.igst)),
      RndOffAmt: round2(moneyToNumber(creditNote.roundOff)),
      TotInvVal: round2(moneyToNumber(creditNote.total)),
    },
  };
};
