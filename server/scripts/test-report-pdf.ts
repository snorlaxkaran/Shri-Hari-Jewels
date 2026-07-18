import { generateReportPdf } from "../src/lib/reports/report-pdf.js";
import type { ShopSettings } from "../src/types.js";

const settings = {
  businessName: "Test Shop",
  address: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: "Jammu & Kashmir",
  pincode: null,
  country: "India",
  phone: null,
  upiVpa: null,
  panNumber: null,
  gstNumber: null,
  gstRegisteredName: null,
  bankAccountName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankName: null,
  goldMakingChargesPct: 17,
  silverMakingChargesPct: 17,
  makingChargesOverrideNote: null,
} satisfies ShopSettings;

const columns = [
  { header: "Item Code" },
  { header: "SKU" },
  { header: "Name" },
  { header: "Category" },
  { header: "Metal" },
  { header: "Branch" },
  { header: "Price", align: "right" as const },
];

const rows = Array.from({ length: 50 }, (_, i) => [
  `ITEM-${i}`,
  `SKU-${i}`,
  `Product ${i}`,
  "Ring",
  "Gold",
  "Main",
  "10000",
]);

const pdf = await generateReportPdf(
  "Stock Snapshot",
  columns,
  rows,
  { from: "1/1/2026", to: "1/31/2026" },
  settings,
);

console.log(`PDF OK — ${pdf.length} bytes`);
