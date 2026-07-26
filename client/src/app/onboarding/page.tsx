"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api/client";

const DEMO_STORE = "/shop/shree-hari-jewels";

const PIPELINE = [
  { key: "design", label: "Design", detail: "SKU, CAD, BOM" },
  { key: "production", label: "Production", detail: "Floor stages + QC" },
  { key: "inventory", label: "Inventory", detail: "Item-level stock" },
  { key: "billing", label: "Billing", detail: "GST invoices" },
  { key: "storefront", label: "Storefront", detail: "Online shop" },
] as const;

const CAPABILITIES = [
  {
    title: "Piece-level inventory",
    body: "Every ornament gets its own item code — available, sold, in transit, or at hallmark. Entry vouchers and verification gates keep stock honest before it hits the floor.",
    tag: "INVENTORY",
  },
  {
    title: "Production that matches the floor",
    body: "Design library, motifs, work orders, and production runs through wax, casting, stone setting, and QC — with metal and stone issue tracking tied back to stock.",
    tag: "PRODUCTION",
  },
  {
    title: "Sales & GST billing",
    body: "Counter sales with live market rates, discount approvals, UPI/Razorpay, wholesale transfers, delivery challans, and WhatsApp-shareable tax invoices.",
    tag: "BILLING",
  },
  {
    title: "Customers, leads & repairs",
    body: "CRM with GST billing profiles, custom orders, follow-ups, and repair tracking — across branches for showrooms and head office.",
    tag: "CRM",
  },
  {
    title: "Reports your CA will actually use",
    body: "GST reports, stock valuation, ageing stock, sales analytics, staff performance, and Tally export — all from live data.",
    tag: "REPORTS",
  },
  {
    title: "Your own online store",
    body: "Turn on a branded website fed by the same stock as the counter. Web orders land in the ERP — no double-selling, no duplicate catalogue.",
    tag: "STOREFRONT",
  },
];

const BUSINESS_TYPES = [
  "Retail showroom",
  "Manufacturer",
  "Wholesale / B2B",
  "Multi-branch house",
  "Other",
];

function monoClassName(extra = "") {
  return `font-[family-name:var(--font-portfolio-mono)] text-[11px] uppercase tracking-[0.14em] ${extra}`;
}

export default function OnboardingPortfolioPage() {
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    city: "",
    businessType: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/demo-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit request.");
      }
      setSuccess(true);
      setForm({
        businessName: "",
        contactName: "",
        phone: "",
        email: "",
        city: "",
        businessType: "",
        message: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#ddd4c4] bg-[#f6f1e8]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <p className={monoClassName("text-[#8b6914]")}>Shri Hari Jewels · Platform</p>
          <div className="flex items-center gap-4 text-sm">
            <Link href={DEMO_STORE} className="text-[#545048] hover:text-[#1c1917]">
              Demo store
            </Link>
            <Link
              href="/login"
              className="text-[#545048] hover:text-[#1c1917]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-14">
          <p className={monoClassName("text-[#8b6914] mb-4")}>Jewellery ERP + Online Store</p>
          <h1
            className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] text-[#1c1917] max-w-3xl"
            style={{ fontFamily: "var(--font-portfolio-display), Georgia, serif" }}
          >
            One system from design bench to storefront counter
          </h1>
          <p className="mt-6 text-lg text-[#545048] max-w-2xl leading-relaxed font-sans">
            Built for Indian jewellery businesses — inventory tracked piece by piece,
            production on the shop floor, GST billing, and an optional customer-facing
            website. Each company gets its own isolated account with branches and staff roles.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 font-sans">
            <a
              href="#request-demo"
              className="inline-flex items-center px-5 py-3 rounded-md bg-[#1c1917] text-white text-sm font-medium hover:bg-[#292524]"
            >
              Request a demo
            </a>
            <Link
              href={DEMO_STORE}
              className="inline-flex items-center px-5 py-3 rounded-md border border-[#c9bba8] text-sm font-medium text-[#1c1917] hover:bg-white/60"
            >
              Browse live demo store
            </Link>
          </div>
        </section>

        {/* Traveler strip */}
        <section className="border-y border-[#ddd4c4] bg-[#fffdf8]">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <p className={monoClassName("text-[#8b6914] mb-6 text-center")}>
              How a piece moves through the platform
            </p>
            <div className="relative font-sans">
              <div
                className="hidden sm:block absolute top-[1.125rem] left-[10%] right-[10%] h-px bg-[#ddd4c4]"
                aria-hidden
              />
              <div
                className="hidden sm:block absolute top-[1.125rem] left-[10%] h-px bg-[#b8860b] w-[55%] traveler-progress"
                aria-hidden
              />
              <ol className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-3">
                {PIPELINE.map((stage, index) => (
                  <li key={stage.key} className="relative flex sm:flex-col sm:items-center gap-3 sm:gap-2 text-left sm:text-center">
                    <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full border-2 border-[#b8860b] bg-[#fffdf8] flex items-center justify-center">
                      <span className={monoClassName("text-[#8b6914] normal-case tracking-normal text-xs")}>
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1c1917]">{stage.label}</p>
                      <p className={monoClassName("text-[#879596] mt-1 normal-case tracking-normal")}>
                        {stage.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="max-w-5xl mx-auto px-6 py-16 font-sans">
          <div className="mb-10">
            <p className={monoClassName("text-[#8b6914] mb-3")}>Capabilities</p>
            <h2
              className="text-3xl font-semibold text-[#1c1917]"
              style={{ fontFamily: "var(--font-portfolio-display), Georgia, serif" }}
            >
              Everything a jewellery business runs on
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {CAPABILITIES.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-[#ddd4c4] bg-white/70 p-5 hover:border-[#c9bba8] transition-colors"
              >
                <p className={monoClassName("text-[#8b6914] mb-3")}>{item.tag}</p>
                <h3
                  className="text-xl font-semibold text-[#1c1917] mb-2"
                  style={{ fontFamily: "var(--font-portfolio-display), Georgia, serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm text-[#545048] leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Demo form */}
        <section id="request-demo" className="border-t border-[#ddd4c4] bg-[#1c1917] text-[#f5f5f4]">
          <div className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 font-sans">
            <div>
              <p className={monoClassName("text-[#d4a853] mb-3")}>Get started</p>
              <h2
                className="text-3xl font-semibold leading-snug"
                style={{ fontFamily: "var(--font-portfolio-display), Georgia, serif" }}
              >
                Request a demo
              </h2>
              <p className="mt-4 text-[#a8a29e] leading-relaxed text-sm">
                Tell us about your business. Our team will reach out to walk you through
                the ERP and online store — no self-signup, no credit card on this page.
              </p>
              <p className="mt-6 text-xs text-[#78716c]">
                Already a customer?{" "}
                <Link href="/login" className="text-[#d4a853] hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <p className="rounded-md bg-[#14532d]/40 border border-[#166534] px-4 py-3 text-sm text-[#bbf7d0]">
                  Thank you — we&apos;ll be in touch shortly.
                </p>
              )}
              {error && (
                <p className="rounded-md bg-[#7f1d1d]/40 border border-[#991b1b] px-4 py-3 text-sm text-[#fecaca]">
                  {error}
                </p>
              )}

              <label className="block text-sm">
                <span className={monoClassName("text-[#a8a29e] mb-1 block")}>Business name *</span>
                <input
                  required
                  className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853]"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className={monoClassName("text-[#a8a29e] mb-1 block")}>Contact name *</span>
                  <input
                    required
                    className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853]"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className={monoClassName("text-[#a8a29e] mb-1 block")}>Phone *</span>
                  <input
                    required
                    type="tel"
                    className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853]"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className={monoClassName("text-[#a8a29e] mb-1 block")}>Email</span>
                  <input
                    type="email"
                    className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853]"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className={monoClassName("text-[#a8a29e] mb-1 block")}>City</span>
                  <input
                    className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853]"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className={monoClassName("text-[#a8a29e] mb-1 block")}>Business type</span>
                <select
                  className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853]"
                  value={form.businessType}
                  onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className={monoClassName("text-[#a8a29e] mb-1 block")}>Message</span>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-[#44403c] bg-[#292524] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a853] resize-y"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your branches, team size, or what you want to solve first."
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-[#b8860b] hover:bg-[#9a7209] disabled:opacity-60 px-4 py-3 text-sm font-medium text-white transition-colors"
              >
                {submitting ? "Sending…" : "Request demo"}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#ddd4c4] py-8 text-center">
        <p className={monoClassName("text-[#879596]")}>
          Shri Hari Jewels · Jewellery ERP + Online Store
        </p>
      </footer>

      <style jsx global>{`
        @keyframes traveler-progress {
          0% { width: 0; opacity: 0.4; }
          100% { width: 55%; opacity: 1; }
        }
        .traveler-progress {
          animation: traveler-progress 1.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
