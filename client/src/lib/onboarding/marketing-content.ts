export const ANNOUNCEMENTS = [
  {
    id: "trial",
    label: "2-month free trial",
    detail: "No credit card · Start today",
    href: "/onboarding/start",
  },
  {
    id: "demo-store",
    label: "Live demo store",
    detail: "Browse shree-hari-jewels online shop",
    href: "/shop/shree-hari-jewels",
  },
  {
    id: "huid",
    label: "HUID-ready",
    detail: "Hallmark batches & entry verification built in",
    href: "#modules",
  },
] as const;

export const STATS = [
  { value: "9", label: "Integrated modules", suffix: "" },
  { value: "Piece", label: "Level tracking", suffix: "" },
  { value: "GST", label: "Invoice ready", suffix: "" },
  { value: "2 mo", label: "Free trial", suffix: "" },
] as const;

export const TRUSTED_BY = [
  "Retail showrooms",
  "Manufacturing units",
  "Wholesale houses",
  "Multi-branch groups",
  "Karigar workshops",
  "Online-first brands",
] as const;

export const USE_CASES = [
  {
    id: "retail",
    title: "Retail showroom",
    subtitle: "Counter-first operations",
    description:
      "Live gold rates, fast billing, HUID on every piece, and an optional online store that shares the same stock.",
    modules: ["Inventory", "Sales", "Storefront"],
    href: "/onboarding/modules/sales",
  },
  {
    id: "manufacturer",
    title: "Manufacturer",
    subtitle: "Shop floor to dispatch",
    description:
      "Designs, motifs, wax-to-QC production runs, karigar settlements, and dispatch to your own showrooms or B2B clients.",
    modules: ["Production", "Inventory", "Procurement"],
    href: "/onboarding/modules/production",
  },
  {
    id: "wholesale",
    title: "Wholesale / B2B",
    subtitle: "Bulk & proforma flows",
    description:
      "Proforma challans, branch transfers, customer ledgers, and GST reports your CA can export to Tally.",
    modules: ["Sales", "Multi-branch", "Reports"],
    href: "/onboarding/modules/multibranch",
  },
  {
    id: "multibranch",
    title: "Multi-branch house",
    subtitle: "One view across showrooms",
    description:
      "Scan-and-send transfers, incoming verification, consolidated stock valuation, and branch-wise performance.",
    modules: ["Multi-branch", "Inventory", "Reports"],
    href: "/onboarding/modules/multibranch",
  },
] as const;

export const DEEP_FEATURES = [
  {
    id: "gst-huid",
    eyebrow: "Compliance built in",
    title: "GST invoices & hallmark tracking on every piece",
    body: "Generate GST-compliant invoices with live gold rates, share PDFs on WhatsApp, and link BIS hallmark batches to individual pieces. Entry verification reconciles physical stock against your catalogue — no more mismatch between counter and books.",
    screenshot: "/onboarding/invoices.png",
    screenshotAlt: "GST invoice preview",
    href: "/onboarding/modules/inventory",
    linkLabel: "Explore inventory & HUID",
  },
  {
    id: "production",
    eyebrow: "Shop floor",
    title: "Production runs your karigars actually use",
    body: "Track wax, casting, setting, polish, and QC on a live board. Work orders link customer demand to the floor; settlements record artisan payments per stage with weight and labour breakdown.",
    screenshot: "/onboarding/designs.png",
    screenshotAlt: "Design builder with live SKUs",
    href: "/onboarding/modules/production",
    linkLabel: "Explore production floor",
  },
  {
    id: "storefront",
    eyebrow: "Web + counter",
    title: "Online store synced to counter stock",
    body: "Publish selected pieces to a branded storefront. Web orders land in the ERP — stock deducts from the same branch inventory your counter uses. No double entry, no overselling.",
    screenshot: "/onboarding/shop-home.png",
    screenshotAlt: "Online storefront",
    href: "/onboarding/modules/storefront",
    linkLabel: "Explore online store",
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "We moved off Excel for stock and Tally-only billing. Piece-level HUID tracking alone saved us hours every week at hallmark audit time.",
    name: "Rajesh Malhotra",
    role: "Owner · Malhotra Jewellers, Delhi",
  },
  {
    quote:
      "Production runs and karigar settlements in one place — our floor supervisor stopped maintaining three different registers.",
    name: "Priya Shah",
    role: "Production head · Shah Creations, Mumbai",
  },
  {
    quote:
      "Multi-branch transfers with scan-and-verify meant Gurgaon showroom finally trusts Delhi stock numbers.",
    name: "Amit Verma",
    role: "Operations · Verma Jewels Group",
  },
] as const;

export const COMPARISONS = [
  {
    title: "vs. Tally + Excel",
    points: [
      "Piece-level stock with photos, not just weight ledgers",
      "Counter billing with live rates — not manual calculation",
      "Production floor tracking Tally was never built for",
      "Export to Tally when your CA still needs it",
    ],
  },
  {
    title: "vs. Generic ERP",
    points: [
      "Jewellery-specific: HUID, karigar, making charges",
      "Indian GST invoice formats out of the box",
      "Old gold exchange and repair job flows",
      "No per-user pricing — flat trial, then simple plans",
    ],
  },
] as const;

export const IMPLEMENTATION_PATHS = [
  {
    id: "self-serve",
    title: "Start free trial",
    subtitle: "For owners who want to explore",
    description:
      "Verify your mobile once, set login credentials, and run guided checklists inside each workspace. Most showrooms add their first SKU and bill a sale the same day.",
    cta: "Start 2-month trial",
    href: "/onboarding/start",
    primary: true,
  },
  {
    id: "demo",
    title: "Request a demo",
    subtitle: "For multi-branch & manufacturing",
    description:
      "Tell us about your setup — branches, production floor, existing Tally workflow — and we'll walk you through a tailored demo on WhatsApp or call.",
    cta: "Request demo",
    href: "#request-demo",
    primary: false,
  },
] as const;

export const GUIDED_SETUP = [
  {
    title: "Inventory workspace",
    steps: ["Business & GST setup", "First branch", "Opening stock", "Hallmark batch"],
  },
  {
    title: "Sales workspace",
    steps: ["Live rates", "First customer", "Counter sale", "GST invoice"],
  },
  {
    title: "Production workspace",
    steps: ["Create design", "Open work order", "Start run", "Karigar settlement"],
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: "How is Shri Hari Jewels different from Tally for jewellery shops?",
    a: "Tally excels at accounting ledgers but wasn't built for piece-level jewellery stock, HUID batches, production runs, or counter billing with live gold rates. Shri Hari Jewels covers operations end to end and can export data for your CA when needed.",
  },
  {
    q: "Do I need separate software for my online store?",
    a: "No. The online storefront is built in and shares stock with your counter. Publish pieces from inventory; web orders appear in the same ERP as counter sales.",
  },
  {
    q: "Is hallmark / HUID tracking supported?",
    a: "Yes. Link BIS hallmark batches to pieces, run entry verification vouchers, and filter stock by hallmark status for audits.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Yes. Create branches, send scan-based stock transfers with proforma challans, and verify incoming stock before it updates branch inventory.",
  },
  {
    q: "What does the free trial include?",
    a: "Full access for 2 months — inventory, sales, production, reports, storefront, and multi-branch. No credit card required to start.",
  },
  {
    q: "Can my CA still use Tally?",
    a: "Yes. Export purchase, sales, and GST summaries for Tally import. Many jewellers run daily operations here and hand monthly exports to their CA.",
  },
] as const;

export const FOOTER_LINKS = {
  modules: [
    { label: "Inventory & HUID", href: "/onboarding/modules/inventory" },
    { label: "Production floor", href: "/onboarding/modules/production" },
    { label: "Counter & billing", href: "/onboarding/modules/sales" },
    { label: "Customers & CRM", href: "/onboarding/modules/crm" },
    { label: "Online store", href: "/onboarding/modules/storefront" },
    { label: "Multi-branch", href: "/onboarding/modules/multibranch" },
    { label: "Reports", href: "/onboarding/modules/reports" },
    { label: "Procurement", href: "/onboarding/modules/procurement" },
    { label: "Back office", href: "/onboarding/modules/backoffice" },
  ],
  product: [
    { label: "Features", href: "#features" },
    { label: "Modules", href: "#modules" },
    { label: "Use cases", href: "#use-cases" },
    { label: "FAQ", href: "#faq" },
    { label: "Demo store", href: "/shop/shree-hari-jewels" },
  ],
  account: [
    { label: "Sign in", href: "/login" },
    { label: "Start free trial", href: "/onboarding/start" },
    { label: "Request demo", href: "#request-demo" },
  ],
} as const;
