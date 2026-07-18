/** Tally Prime voucher XML builder — accounting voucher view (no inventory). */

export type TallyLedgerEntry = {
  ledgerName: string;
  amount: number;
  isDeemedPositive: boolean;
  isPartyLedger?: boolean;
};

export type TallyVoucherInput = {
  voucherType: "Sales" | "Purchase" | "Receipt" | "Payment";
  voucherNumber: string;
  date: Date;
  partyLedgerName: string;
  narration?: string;
  ledgerEntries: TallyLedgerEntry[];
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const formatTallyDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

const formatTallyAmount = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toFixed(2);
};

const ledgerEntryXml = (entry: TallyLedgerEntry): string => {
  const signedAmount = entry.isDeemedPositive ? -Math.abs(entry.amount) : Math.abs(entry.amount);
  const partyTags =
    entry.isPartyLedger === true
      ? `<ISPARTYLEDGER>Yes</ISPARTYLEDGER><ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>`
      : "";

  return `<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${escapeXml(entry.ledgerName)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>${entry.isDeemedPositive ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
${partyTags}
<AMOUNT>${formatTallyAmount(signedAmount)}</AMOUNT>
</ALLLEDGERENTRIES.LIST>`;
};

export const buildVoucherXml = (voucher: TallyVoucherInput): string => {
  const entriesXml = voucher.ledgerEntries.map(ledgerEntryXml).join("");
  const narration = voucher.narration
    ? `<NARRATION>${escapeXml(voucher.narration)}</NARRATION>`
    : "";

  return `<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="${escapeXml(voucher.voucherType)}" ACTION="Create" OBJVIEW="Accounting Voucher View">
<DATE>${formatTallyDate(voucher.date)}</DATE>
<VOUCHERTYPENAME>${escapeXml(voucher.voucherType)}</VOUCHERTYPENAME>
<VOUCHERNUMBER>${escapeXml(voucher.voucherNumber)}</VOUCHERNUMBER>
<PARTYLEDGERNAME>${escapeXml(voucher.partyLedgerName)}</PARTYLEDGERNAME>
${narration}
${entriesXml}
</VOUCHER>
</TALLYMESSAGE>`;
};

export type TallyInvoiceRow = {
  invoiceNo: string;
  createdAt: Date;
  customerName: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  total: number;
  paymentMode: string;
};

export type TallyPurchaseBillRow = {
  billNo: string;
  billDate: Date;
  vendorName: string;
  subtotal: number;
  gstAmount: number;
  total: number;
};

export type TallyPaymentRow = {
  referenceNo: string;
  date: Date;
  partyName: string;
  amount: number;
  paymentMode: string;
  narration?: string;
};

const paymentLedgerName = (mode: string): string => {
  const normalized = mode.trim().toLowerCase();
  if (normalized === "upi" || normalized === "card") return "Bank";
  return "Cash";
};

const salesLedgerName = "Sales Account";
const purchaseLedgerName = "Purchase Account";

export const buildSalesVoucherXml = (invoices: TallyInvoiceRow[]): string[] =>
  invoices.map((inv) => {
    const entries: TallyLedgerEntry[] = [
      {
        ledgerName: inv.customerName,
        amount: inv.total,
        isDeemedPositive: true,
        isPartyLedger: true,
      },
      {
        ledgerName: salesLedgerName,
        amount: inv.taxableValue,
        isDeemedPositive: false,
      },
    ];

    if (inv.cgst > 0) {
      entries.push({ ledgerName: "Output CGST", amount: inv.cgst, isDeemedPositive: false });
    }
    if (inv.sgst > 0) {
      entries.push({ ledgerName: "Output SGST", amount: inv.sgst, isDeemedPositive: false });
    }
    if (inv.igst > 0) {
      entries.push({ ledgerName: "Output IGST", amount: inv.igst, isDeemedPositive: false });
    }
    if (inv.roundOff !== 0) {
      entries.push({
        ledgerName: "Round Off",
        amount: Math.abs(inv.roundOff),
        isDeemedPositive: inv.roundOff < 0,
      });
    }

    return buildVoucherXml({
      voucherType: "Sales",
      voucherNumber: inv.invoiceNo,
      date: inv.createdAt,
      partyLedgerName: inv.customerName,
      narration: `ERP sale invoice ${inv.invoiceNo}`,
      ledgerEntries: entries,
    });
  });

export const buildPurchaseVoucherXml = (bills: TallyPurchaseBillRow[]): string[] =>
  bills.map((bill) => {
    const cgst = bill.gstAmount > 0 ? bill.gstAmount / 2 : 0;
    const sgst = bill.gstAmount > 0 ? bill.gstAmount / 2 : 0;

    const entries: TallyLedgerEntry[] = [
      {
        ledgerName: purchaseLedgerName,
        amount: bill.subtotal,
        isDeemedPositive: true,
      },
      {
        ledgerName: bill.vendorName,
        amount: bill.total,
        isDeemedPositive: false,
        isPartyLedger: true,
      },
    ];

    if (cgst > 0) {
      entries.push({ ledgerName: "Input CGST", amount: cgst, isDeemedPositive: true });
    }
    if (sgst > 0) {
      entries.push({ ledgerName: "Input SGST", amount: sgst, isDeemedPositive: true });
    }

    return buildVoucherXml({
      voucherType: "Purchase",
      voucherNumber: bill.billNo,
      date: bill.billDate,
      partyLedgerName: bill.vendorName,
      narration: `ERP purchase bill ${bill.billNo}`,
      ledgerEntries: entries,
    });
  });

export const buildReceiptVoucherXml = (receipts: TallyPaymentRow[]): string[] =>
  receipts.map((row) =>
    buildVoucherXml({
      voucherType: "Receipt",
      voucherNumber: row.referenceNo,
      date: row.date,
      partyLedgerName: row.partyName,
      narration: row.narration ?? `Customer receipt ${row.referenceNo}`,
      ledgerEntries: [
        {
          ledgerName: row.partyName,
          amount: row.amount,
          isDeemedPositive: true,
          isPartyLedger: true,
        },
        {
          ledgerName: paymentLedgerName(row.paymentMode),
          amount: row.amount,
          isDeemedPositive: false,
        },
      ],
    }),
  );

export const buildPaymentVoucherXml = (payments: TallyPaymentRow[]): string[] =>
  payments.map((row) =>
    buildVoucherXml({
      voucherType: "Payment",
      voucherNumber: row.referenceNo,
      date: row.date,
      partyLedgerName: row.partyName,
      narration: row.narration ?? `Vendor payment ${row.referenceNo}`,
      ledgerEntries: [
        {
          ledgerName: row.partyName,
          amount: row.amount,
          isDeemedPositive: false,
          isPartyLedger: true,
        },
        {
          ledgerName: paymentLedgerName(row.paymentMode),
          amount: row.amount,
          isDeemedPositive: true,
        },
      ],
    }),
  );

export const wrapTallyEnvelope = (voucherMessages: string[]): string => {
  const body = voucherMessages.join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
<STATICVARIABLES>
<SVCURRENTCOMPANY>Imported from Shri Hari Jewels ERP</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>
${body}
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`;
};
