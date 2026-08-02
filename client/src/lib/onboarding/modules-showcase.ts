import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Factory,
  Globe,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export type ShowcaseModuleId =
  | "inventory"
  | "production"
  | "sales"
  | "crm"
  | "storefront"
  | "multibranch"
  | "reports"
  | "procurement"
  | "backoffice";

export type ShowcaseModule = {
  id: ShowcaseModuleId;
  label: string;
  shortLabel: string;
  tagline: string;
  processLabel: string;
  icon: LucideIcon;
  screenshot: string;
  mobileScreenshot: string;
  heroScreenshot: string;
  features: [string, string, string, string, string, string];
  knowMoreHref: string;
  detail: {
    headline: string;
    intro: string;
    bullets: string[];
    screenshots: { src: string; caption: string }[];
    example: { title: string; rows: { label: string; value: string }[] };
  };
};

export const SHOWCASE_MODULES: ShowcaseModule[] = [
  {
    id: "inventory",
    label: "Inventory & HUID",
    shortLabel: "Inventory",
    tagline: "Piece-level stock with hallmark compliance",
    processLabel: "Stock-to-Shelf",
    icon: Package,
    screenshot: "/onboarding/dashboard.png",
    mobileScreenshot: "/onboarding/dashboard.png",
    heroScreenshot: "/onboarding/dashboard.png",
    features: [
      "Piece-level stock tracking",
      "HUID & hallmark batches",
      "Entry verification vouchers",
      "Raw material ledger",
      "Multi-branch stock view",
      "Ageing & valuation reports",
    ],
    knowMoreHref: "/onboarding/modules/inventory",
    detail: {
      headline: "Every gram and every piece — tracked end to end",
      intro:
        "Unlike generic ERP stock modules, Shri Hari Jewels tracks jewellery at the piece level — gross weight, net weight, stone details, and BIS hallmark status on each SKU.",
      bullets: [
        "Product catalogue with metal purity, making charges, and stone rows",
        "Entry vouchers reconcile physical stock against catalogue",
        "Hallmark batches linked to HUID numbers",
        "Raw gold, silver, and stones in a separate ledger",
        "Filter by branch, category, department, or ageing",
        "Stock snapshots for insurance or audit",
      ],
      screenshots: [
        { src: "/onboarding/dashboard.png", caption: "Stock KPIs — gold, silver, diamond at a glance" },
        { src: "/onboarding/sales.png", caption: "Counter sales linked to live inventory" },
      ],
      example: {
        title: "Sample piece — SHJ-2024-0842",
        rows: [
          { label: "Item", value: "Gold bangle · 22K" },
          { label: "Gross wt", value: "42.350 g" },
          { label: "Net wt", value: "38.120 g" },
          { label: "Making", value: "₹ 850 / g" },
          { label: "HUID", value: "Hallmarked · BIS verified" },
          { label: "Branch", value: "Main showroom · In stock" },
        ],
      },
    },
  },
  {
    id: "production",
    label: "Production Floor",
    shortLabel: "Production",
    tagline: "Wax to QC with karigar settlements",
    processLabel: "Design-to-Delivery",
    icon: Factory,
    screenshot: "/onboarding/designs.png",
    mobileScreenshot: "/onboarding/designs.png",
    heroScreenshot: "/onboarding/designs.png",
    features: [
      "CAD-ready design library",
      "Motifs with stone rows",
      "Work orders from demand",
      "Production run board",
      "Stage-wise job cards",
      "Karigar settlement ledger",
    ],
    knowMoreHref: "/onboarding/modules/production",
    detail: {
      headline: "Shop-floor production built for Indian karigars",
      intro:
        "Track every order from CAD design through wax, casting, setting, polishing, and QC. Karigar settlements record artisan payments per stage.",
      bullets: [
        "Designs with BOM stages and reference images",
        "Motifs — metal breakdown, stone rows, wastage norms",
        "Work orders linked to customer orders",
        "Production runs across wax → cast → set → polish → QC",
        "Kanban production board for active runs",
        "Karigar settlements with weight and labour charges",
      ],
      screenshots: [
        { src: "/onboarding/designs.png", caption: "Design library with BOM stages" },
        { src: "/onboarding/analytics.png", caption: "Production & sales analytics" },
      ],
      example: {
        title: "Sample run — WR-1047 · Kundan necklace",
        rows: [
          { label: "Work order", value: "WO-2024-0312" },
          { label: "Current stage", value: "Stone setting" },
          { label: "Karigar", value: "Ramesh · Setting dept" },
          { label: "Target net wt", value: "28.400 g" },
          { label: "Pieces", value: "1 of 1" },
          { label: "Due date", value: "12 Aug 2026" },
        ],
      },
    },
  },
  {
    id: "sales",
    label: "Counter & Billing",
    shortLabel: "Sales",
    tagline: "Live rates, GST invoices, counter POS",
    processLabel: "Order-to-Cash",
    icon: ShoppingCart,
    screenshot: "/onboarding/sales.png",
    mobileScreenshot: "/onboarding/sales.png",
    heroScreenshot: "/onboarding/sales.png",
    features: [
      "Live gold & silver rates",
      "Counter billing POS",
      "Making & stone charges",
      "GST tax invoices",
      "WhatsApp PDF share",
      "Old gold exchange",
    ],
    knowMoreHref: "/onboarding/modules/sales",
    detail: {
      headline: "Bill at the counter in seconds — GST-ready",
      intro:
        "Pick pieces from stock, apply live market rates, and generate tax invoices with one click. Old gold exchange and making charges calculated automatically.",
      bullets: [
        "Daily gold/silver rates per branch",
        "Scan or search inventory to add to a sale",
        "Discounts, making charges, old gold buy-back",
        "GST-compliant invoices with HSN codes",
        "WhatsApp PDF share from the counter",
        "Cash, UPI, card, or part exchange",
      ],
      screenshots: [
        { src: "/onboarding/sales.png", caption: "Counter billing with live rates" },
        { src: "/onboarding/invoices.png", caption: "GST invoice PDF preview" },
      ],
      example: {
        title: "Sample sale — INV-2024-0891",
        rows: [
          { label: "Customer", value: "Priya Mehta" },
          { label: "Items", value: "22K ring + chain" },
          { label: "Gold rate", value: "₹ 6,245 / g (live)" },
          { label: "Taxable", value: "₹ 1,42,800" },
          { label: "GST (3%)", value: "₹ 4,284" },
          { label: "Total", value: "₹ 1,47,084 · Paid UPI" },
        ],
      },
    },
  },
  {
    id: "crm",
    label: "Customers & CRM",
    shortLabel: "CRM",
    tagline: "Leads, repairs, and customer history",
    processLabel: "Lead-to-Loyalty",
    icon: Users,
    screenshot: "/onboarding/sales.png",
    mobileScreenshot: "/onboarding/sales.png",
    heroScreenshot: "/onboarding/invoices.png",
    features: [
      "Customer ledger",
      "Purchase history",
      "Lead pipeline",
      "Follow-up calendar",
      "Repair job tracking",
      "Department & branch tags",
    ],
    knowMoreHref: "/onboarding/modules/crm",
    detail: {
      headline: "Know every customer — from first visit to repeat buyer",
      intro:
        "Purchase history, repair records, and lead follow-ups in one database. Sales teams see who visited, what they bought, and what's pending.",
      bullets: [
        "Customers with mobile, GSTIN, branch preference",
        "Full purchase history and invoice links",
        "Leads with follow-up dates",
        "Lead calendar for callbacks",
        "Repair jobs — estimate, status, delivery",
        "Department tags for campaigns",
      ],
      screenshots: [
        { src: "/onboarding/sales.png", caption: "Counter billing with customer history" },
        { src: "/onboarding/invoices.png", caption: "GST invoices per customer" },
      ],
      example: {
        title: "Sample customer — Mehta Jewellers",
        rows: [
          { label: "Contact", value: "+91 98765 43210" },
          { label: "Total purchases", value: "₹ 18.4 L · 23 invoices" },
          { label: "Last visit", value: "28 Jul 2026" },
          { label: "Open repair", value: "Polish bangle · Due 5 Aug" },
          { label: "Lead status", value: "Hot · Bridal set enquiry" },
          { label: "Branch", value: "Main showroom" },
        ],
      },
    },
  },
  {
    id: "storefront",
    label: "Online Store",
    shortLabel: "Store",
    tagline: "Branded shop synced to counter stock",
    processLabel: "Web-to-Counter",
    icon: Globe,
    screenshot: "/onboarding/shop-home.png",
    mobileScreenshot: "/onboarding/shop-home.png",
    heroScreenshot: "/onboarding/shop-home.png",
    features: [
      "Branded storefront URL",
      "Publish from counter stock",
      "Collections & lookbooks",
      "Web cart & checkout",
      "Orders land in ERP",
      "Admin publish controls",
    ],
    knowMoreHref: "/onboarding/modules/storefront",
    detail: {
      headline: "Your own jewellery website — stock stays in sync",
      intro:
        "Publish selected counter pieces to a branded online store. Web orders appear alongside counter sales — no double entry.",
      bullets: [
        "Logo, colours, and custom slug",
        "Pick pieces from inventory to publish",
        "Collections for campaigns",
        "Browse, cart, and checkout online",
        "Web orders in storefront admin",
        "Unpublish or update from ERP",
      ],
      screenshots: [
        { src: "/onboarding/shop-home.png", caption: "Public storefront home" },
        { src: "/onboarding/storefront-admin.png", caption: "Admin publish controls" },
        { src: "/onboarding/web-orders.png", caption: "Web orders in ERP" },
      ],
      example: {
        title: "Sample web order — WEB-0042",
        rows: [
          { label: "Customer", value: "Ananya Sharma · Mumbai" },
          { label: "Items", value: "Silver jhumka set" },
          { label: "Amount", value: "₹ 12,450" },
          { label: "Payment", value: "Online · Confirmed" },
          { label: "Fulfilment", value: "Ready for dispatch" },
          { label: "Stock", value: "Deducted from Main showroom" },
        ],
      },
    },
  },
  {
    id: "multibranch",
    label: "Multi-Branch",
    shortLabel: "Branches",
    tagline: "Scan, send, and receive across showrooms",
    processLabel: "Branch-to-Branch",
    icon: Store,
    screenshot: "/onboarding/web-orders.png",
    mobileScreenshot: "/onboarding/web-orders.png",
    heroScreenshot: "/onboarding/web-orders.png",
    features: [
      "Branch-wise stock",
      "Scan & send transfers",
      "Proforma challans",
      "Incoming verification",
      "Consolidated reporting",
      "Transfer PDF share",
    ],
    knowMoreHref: "/onboarding/modules/multibranch",
    detail: {
      headline: "Move stock between branches without spreadsheets",
      intro:
        "Scan-and-send transfers with proforma challans. Receiving branch verifies pieces before stock updates.",
      bullets: [
        "Branches with address, GSTIN, manager",
        "Scan barcodes to build transfer batches",
        "Proforma challan PDF for transporter",
        "Incoming transfers with piece verification",
        "Stock moves only after verification",
        "Consolidated reports for owners",
      ],
      screenshots: [
        { src: "/onboarding/web-orders.png", caption: "Web orders fulfilled from branch stock" },
        { src: "/onboarding/dashboard.png", caption: "Consolidated view across branches" },
      ],
      example: {
        title: "Sample transfer — TRF-2024-0156",
        rows: [
          { label: "From", value: "Main showroom · Delhi" },
          { label: "To", value: "Branch 2 · Gurgaon" },
          { label: "Pieces", value: "8 items · 142.3 g net" },
          { label: "Status", value: "In transit" },
          { label: "Challan", value: "Proforma #156 · PDF sent" },
          { label: "ETA", value: "Same day · Courier" },
        ],
      },
    },
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    shortLabel: "Reports",
    tagline: "GST, valuation, and staff performance",
    processLabel: "Insight-to-Action",
    icon: BarChart2,
    screenshot: "/onboarding/analytics.png",
    mobileScreenshot: "/onboarding/analytics.png",
    heroScreenshot: "/onboarding/analytics.png",
    features: [
      "Sales analytics dashboard",
      "GST summary report",
      "Stock valuation",
      "Ageing stock analysis",
      "Category & department",
      "Staff performance",
    ],
    knowMoreHref: "/onboarding/modules/reports",
    detail: {
      headline: "Reports your CA and owner actually use",
      intro:
        "GST filing summaries, ageing stock, and staff-wise sales — built-in reports replace Excel exports.",
      bullets: [
        "Sales analytics with trends and payment mix",
        "GST report grouped by rate",
        "Stock valuation at current rates",
        "Ageing stock for slow movers",
        "Category and department breakdowns",
        "Staff performance per period",
      ],
      screenshots: [
        { src: "/onboarding/analytics.png", caption: "Sales analytics dashboard" },
        { src: "/onboarding/invoices.png", caption: "Invoice data feeds GST reports" },
      ],
      example: {
        title: "Sample report — July 2026 summary",
        rows: [
          { label: "Total sales", value: "₹ 42.8 L · 186 invoices" },
          { label: "Top category", value: "Bridal · 38% of revenue" },
          { label: "GST collected", value: "₹ 1.28 L" },
          { label: "Stock value", value: "₹ 2.1 Cr at live rates" },
          { label: "Ageing > 90d", value: "47 pieces · ₹ 8.2 L" },
          { label: "Top staff", value: "Amit K · ₹ 9.4 L" },
        ],
      },
    },
  },
  {
    id: "procurement",
    label: "Procurement",
    shortLabel: "Procure",
    tagline: "Vendors, purchase bills, raw materials",
    processLabel: "Procure-to-Pay",
    icon: Truck,
    screenshot: "/onboarding/invoices.png",
    mobileScreenshot: "/onboarding/invoices.png",
    heroScreenshot: "/onboarding/invoices.png",
    features: [
      "Vendor master",
      "Purchase bills",
      "Raw material receipts",
      "Metal & stone inward",
      "Vendor payment tracking",
      "Tally export ready",
    ],
    knowMoreHref: "/onboarding/modules/procurement",
    detail: {
      headline: "Track what comes in — metal, stones, and supplies",
      intro:
        "Vendor purchases, raw material inward, and job-work bills flow into stock and Tally exports.",
      bullets: [
        "Vendor ledger with GSTIN and terms",
        "Purchase bills for raw gold, silver, stones",
        "Raw inventory with weight reconciliation",
        "Job-work bills linked to production",
        "Outstanding vendor payments",
        "Export to Tally for your CA",
      ],
      screenshots: [
        { src: "/onboarding/invoices.png", caption: "Purchase & vendor bills with GST" },
        { src: "/onboarding/dashboard.png", caption: "Stock updated after material inward" },
      ],
      example: {
        title: "Sample purchase — PB-2024-0088",
        rows: [
          { label: "Vendor", value: "Shree Bullion · Mumbai" },
          { label: "Item", value: "24K gold bar · 100 g" },
          { label: "Rate", value: "₹ 6,180 / g" },
          { label: "Amount", value: "₹ 6,18,000" },
          { label: "GST", value: "₹ 1,854 (0.3%)" },
          { label: "Status", value: "Received · Raw inventory updated" },
        ],
      },
    },
  },
  {
    id: "backoffice",
    label: "Back Office",
    shortLabel: "Back office",
    tagline: "HR, payroll, expenses, and settings",
    processLabel: "People-to-Payroll",
    icon: Wallet,
    screenshot: "/onboarding/dashboard.png",
    mobileScreenshot: "/onboarding/dashboard.png",
    heroScreenshot: "/onboarding/dashboard.png",
    features: [
      "Employee master",
      "Attendance tracking",
      "Payroll runs",
      "Expense vouchers",
      "Branch & GST settings",
      "Role-based access",
    ],
    knowMoreHref: "/onboarding/modules/backoffice",
    detail: {
      headline: "Run the business side — not just the counter",
      intro:
        "Employees, attendance, payroll, and expenses in one system with role-based access.",
      bullets: [
        "Employees with designation and branch",
        "Daily attendance tracking",
        "Monthly payroll with deductions",
        "Shop expenses — rent, utilities, marketing",
        "GSTIN, invoice series, branch config",
        "Roles — Admin, Sales, Production, Accountant",
      ],
      screenshots: [
        { src: "/onboarding/dashboard.png", caption: "Owner dashboard with KPIs" },
        { src: "/onboarding/invoices.png", caption: "Invoice & GST settings" },
      ],
      example: {
        title: "Sample payroll — August 2026",
        rows: [
          { label: "Employees", value: "14 active · 3 branches" },
          { label: "Present days", value: "312 of 322 expected" },
          { label: "Gross payroll", value: "₹ 4,85,000" },
          { label: "Deductions", value: "₹ 12,400" },
          { label: "Net payout", value: "₹ 4,72,600" },
          { label: "Expenses MTD", value: "₹ 68,200 logged" },
        ],
      },
    },
  },
];

export const SHOWCASE_BY_ID = Object.fromEntries(
  SHOWCASE_MODULES.map((m) => [m.id, m]),
) as Record<ShowcaseModuleId, ShowcaseModule>;

export const getShowcaseModule = (slug: string): ShowcaseModule | undefined =>
  SHOWCASE_BY_ID[slug as ShowcaseModuleId];
