import Link from "next/link";
import { Gem } from "lucide-react";

const DEMO_STORE = "/shop/shree-hari-jewels";

const erpSections = [
  {
    title: "Inventory",
    body: "Every piece gets a unique item code. Track status (available, sold, in transit), hallmark/HUID, branch location, and list price. New stock enters through entry vouchers and must be verified before it goes live.",
  },
  {
    title: "Sales & billing",
    body: "Counter sales with live gold/silver rates, GST tax invoices, discount approvals, UPI/Razorpay, and PDF bills you can share on WhatsApp. Wholesale transfers and delivery challans for B2B buyers.",
  },
  {
    title: "Production",
    body: "Design library with BOM, motifs, work orders, and production runs through every floor stage — wax, casting, stone setting, QC, and finished goods linked back to inventory.",
  },
  {
    title: "Customers & orders",
    body: "Customer CRM with GST billing profiles, custom orders, repairs, leads, and follow-ups. Multi-branch support for showrooms and head office.",
  },
  {
    title: "Reports",
    body: "GST reports, stock valuation, ageing stock, sales analytics, staff performance, and CAD pipeline — all from live data in the system.",
  },
  {
    title: "HR & accounts",
    body: "Attendance, payroll, petty cash, expenses, vendor bills, and Tally export for your accountant.",
  },
];

const storeSections = [
  {
    title: "Your own online shop",
    body: "Each jewellery business can turn on a branded website — collections, product pages, cart, and checkout — powered by the same stock as the counter.",
  },
  {
    title: "No double-selling",
    body: "When a piece is sold in-store or reserved for a web order, inventory updates everywhere immediately.",
  },
  {
    title: "Web orders in the ERP",
    body: "Online orders appear in the admin panel alongside counter sales. Confirm, fulfil, and invoice from one place.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#16191f]">
      <header className="border-b border-[#e8e0d4] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#b8860b] to-[#8b6914] flex items-center justify-center text-white">
              <Gem size={18} strokeWidth={1.5} />
            </div>
            <span className="font-display text-lg font-semibold">Jewellery ERP</span>
          </div>
          <Link
            href={DEMO_STORE}
            className="text-sm text-[#2563eb] hover:underline"
          >
            See demo store →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-14">
        <section className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-[#b8860b]">
            About this platform
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a2e] leading-snug">
            ERP and online store for Indian jewellery businesses
          </h1>
          <p className="text-lg text-[#545b64] leading-relaxed">
            This is a complete back-office and website system built for jewellers — inventory
            tracked piece by piece, GST billing, production on the shop floor, and an optional
            customer-facing online store. Each business gets its own isolated account with
            branches, staff roles, and data.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a2e]">
            What the ERP covers
          </h2>
          <div className="space-y-5">
            {erpSections.map((section) => (
              <article
                key={section.title}
                className="rounded-xl border border-[#e8e0d4] bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-[#1a1a2e] mb-2">{section.title}</h3>
                <p className="text-sm text-[#545b64] leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-[#1a1a2e]">
            Online store (website)
          </h2>
          <div className="space-y-5">
            {storeSections.map((section) => (
              <article
                key={section.title}
                className="rounded-xl border border-[#e8e0d4] bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-[#1a1a2e] mb-2">{section.title}</h3>
                <p className="text-sm text-[#545b64] leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>
          <p className="text-sm text-[#545b64]">
            Example live demo:{" "}
            <Link href={DEMO_STORE} className="text-[#2563eb] hover:underline">
              {DEMO_STORE}
            </Link>
          </p>
        </section>

        <section className="rounded-xl border border-[#e8e0d4] bg-white p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Who uses it</h2>
          <ul className="text-sm text-[#545b64] space-y-2 list-disc pl-5">
            <li>Retail showrooms and multi-branch jewellery houses</li>
            <li>Manufacturers with in-house production and karigar teams</li>
            <li>Wholesale sellers invoicing other jewellers and corporate buyers</li>
            <li>Businesses that want a website without maintaining a separate product catalogue</li>
          </ul>
        </section>

        <section className="rounded-xl bg-[#1a1a2e] text-white p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Getting access</h2>
          <p className="text-sm text-[#d5dbdb] leading-relaxed">
            Accounts are set up by our team when you join the platform. You do not need to
            register yourself on this page. If you already have login details from us, use
            the sign-in page — otherwise contact us to get started.
          </p>
        </section>
      </main>

      <footer className="border-t border-[#e8e0d4] py-8 px-6 text-center text-xs text-[#879596] space-y-2">
        <p>Shri Hari Jewels · Jewellery ERP + Online Store</p>
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-[#2563eb] hover:underline">
            Sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
