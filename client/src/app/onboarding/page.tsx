"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Gem } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/client";
import type { PlatformContactInfo } from "@/lib/api/billing";

const DEMO_STORE = "/shop/shree-hari-jewels";

const C = {
  cream: "#faf6ec",
  creamDeep: "#efe4cd",
  ivoryCard: "#fffdf8",
  espresso: "#1f1712",
  espresso2: "#2b2015",
  mustard: "#f0c33f",
  mustardDeep: "#d9ad24",
  ink: "#211a12",
  clay: "#6b5d4a",
  line: "#e2d6bc",
} as const;

const PIPELINE = [
  { key: "design", label: "Design", detail: "SKU, CAD, BOM" },
  { key: "production", label: "Production", detail: "Floor stages + QC" },
  { key: "inventory", label: "Inventory", detail: "Item-level stock" },
  { key: "billing", label: "Billing", detail: "GST invoices" },
  { key: "storefront", label: "Storefront", detail: "Online shop" },
] as const;

const CAPABILITY_TAGS = [
  "GST-ready",
  "Multi-branch",
  "Tally export",
  "HUID tracking",
  "Piece-level stock",
  "WhatsApp invoices",
] as const;

const STANDARD_FEATURES = [
  "Piece-level inventory & entry vouchers",
  "Production runs through wax to QC",
  "Counter sales with live market rates",
  "GST billing & tax invoices",
  "CRM, repairs & custom orders",
  "Single branch",
] as const;

const MULTI_BRANCH_FEATURES = [
  "Everything in Standard",
  "Multi-branch stock transfer",
  "Inter-branch reporting",
  "Tally export for your CA",
  "Loyalty & customer tiers",
  "Hallmark batch management",
] as const;

const SCREENSHOT_COLLAGE = [
  { src: "/onboarding/inventory.png", alt: "Inventory list view", height: "h-44", offset: "mt-8" },
  { src: "/onboarding/production.png", alt: "Production run stages", height: "h-52", offset: "mt-0" },
  { src: "/onboarding/invoices.png", alt: "GST invoice PDF", height: "h-48", offset: "mt-12" },
  { src: "/onboarding/sales.png", alt: "Counter sales screen", height: "h-40", offset: "mt-4" },
] as const;

const BUSINESS_TYPES = [
  "Retail showroom",
  "Manufacturer",
  "Wholesale / B2B",
  "Multi-branch house",
  "Other",
];

function displayClass(extra = "") {
  return `font-[family-name:var(--font-portfolio-display)] ${extra}`;
}

function monoClassName(extra = "") {
  return `font-[family-name:var(--font-portfolio-mono)] text-[11px] uppercase tracking-[0.14em] ${extra}`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className={monoClassName("text-[#6b5d4a] flex items-center gap-2.5 mb-5")}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#f0c33f] shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function MustardButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#f0c33f] text-[#211a12] text-sm font-medium hover:bg-[#d9ad24] transition-colors font-sans ${className}`}
    >
      {children}
    </a>
  );
}

function HexLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        backgroundColor: C.mustard,
      }}
    >
      <Gem size={size * 0.45} strokeWidth={1.5} className="text-[#211a12]" />
    </div>
  );
}

function VerticalTravelerStrip() {
  return (
    <div
      className="relative w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto rotate-[2deg] lg:rotate-[3deg]"
      aria-label="How a piece moves through the platform"
    >
      <div
        className="rounded-2xl border border-[#e2d6bc] bg-[#fffdf8] p-6 shadow-[0_24px_60px_-20px_rgba(31,23,18,0.18)] font-sans"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <p className={monoClassName("text-[#6b5d4a] mb-5 text-center")}>
          Wax to wrist
        </p>
        <div className="relative">
          <div
            className="absolute left-[1.125rem] top-4 bottom-4 w-px bg-[#e2d6bc]"
            aria-hidden
          />
          <div
            className="absolute left-[1.125rem] top-4 w-px bg-[#f0c33f] traveler-progress-vertical"
            aria-hidden
          />
          <ol className="space-y-5">
            {PIPELINE.map((stage, index) => (
              <li key={stage.key} className="relative flex items-start gap-4 pl-0">
                <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full border-2 border-[#f0c33f] bg-[#fffdf8] flex items-center justify-center">
                  <span className={monoClassName("text-[#6b5d4a] normal-case tracking-normal text-xs")}>
                    {index + 1}
                  </span>
                </div>
                <div className="pt-1">
                  <p className="font-semibold text-[#211a12]">{stage.label}</p>
                  <p className={monoClassName("text-[#6b5d4a] mt-0.5 normal-case tracking-normal")}>
                    {stage.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function ItemRecordCard() {
  return (
    <div className="rounded-xl border border-[#e2d6bc] bg-[#fffdf8] p-5 font-sans shadow-[0_16px_40px_-16px_rgba(31,23,18,0.12)]">
      <p className={monoClassName("text-[#6b5d4a] mb-4")}>Item record</p>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-dashed border-[#e2d6bc] pb-2">
          <span className={monoClassName("text-[#6b5d4a] normal-case tracking-normal")}>Code</span>
          <span className="font-medium text-[#211a12]">SHJ-2024-0842</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-dashed border-[#e2d6bc] pb-2">
          <span className={monoClassName("text-[#6b5d4a] normal-case tracking-normal")}>Description</span>
          <span className="font-medium text-[#211a12] text-right">Gold bangle · 22K</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-dashed border-[#e2d6bc] pb-2">
          <span className={monoClassName("text-[#6b5d4a] normal-case tracking-normal")}>Gross wt</span>
          <span className="font-medium text-[#211a12]">42.350 g</span>
        </div>
        <div className="flex justify-between gap-4 border-b border-dashed border-[#e2d6bc] pb-2">
          <span className={monoClassName("text-[#6b5d4a] normal-case tracking-normal")}>Net wt</span>
          <span className="font-medium text-[#211a12]">38.120 g</span>
        </div>
        <div className="flex justify-between gap-4 items-center pt-1">
          <span className={monoClassName("text-[#6b5d4a] normal-case tracking-normal")}>Status</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#efe4cd] px-2.5 py-1 text-xs font-medium text-[#211a12]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0c33f]" aria-hidden />
            In stock
          </span>
        </div>
      </div>
    </div>
  );
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
  const [platformContact, setPlatformContact] = useState<PlatformContactInfo | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/billing/contact`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PlatformContactInfo | null) => {
        if (data) setPlatformContact(data);
      })
      .catch(() => {});
  }, []);

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
      {/* Nav */}
      <header className="border-b border-[#e2d6bc] bg-[#faf6ec]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HexLogo size={32} />
            <p className={monoClassName("text-[#211a12]")}>Shri Hari Jewels</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm font-sans">
            <Link href={DEMO_STORE} className="text-[#6b5d4a] hover:text-[#211a12] transition-colors">
              Demo store
            </Link>
            <Link href="/login" className="hidden sm:inline text-[#6b5d4a] hover:text-[#211a12] transition-colors">
              Sign in
            </Link>
            <MustardButton href="#request-demo" className="!px-5 !py-2.5 text-xs sm:text-sm">
              Request a demo
            </MustardButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 lg:pb-14">
          <div className="grid lg:grid-cols-[1fr_0.85fr] gap-10 lg:gap-8 items-center">
            <div className="max-w-xl lg:max-w-none">
              <Eyebrow>Jewellery ERP + Online Store</Eyebrow>
              <h1
                className={displayClass("text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold leading-[1.06] text-[#211a12]")}
              >
                Every piece, tracked from wax to wrist
              </h1>
              <p className="mt-6 text-lg text-[#6b5d4a] leading-relaxed font-sans">
                Built for Indian jewellery businesses — inventory tracked piece by piece,
                production on the shop floor, GST billing, and an optional customer-facing
                website on one platform.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4 font-sans">
                <MustardButton href="#request-demo">Request a demo</MustardButton>
                <Link
                  href={DEMO_STORE}
                  className="text-sm font-medium text-[#6b5d4a] hover:text-[#211a12] underline-offset-4 hover:underline transition-colors"
                >
                  Browse live demo store →
                </Link>
              </div>
            </div>
            <div className="relative lg:-mr-6 xl:-mr-12">
              <VerticalTravelerStrip />
            </div>
          </div>
        </section>

        {/* Capability tags */}
        <section className="border-y border-[#e2d6bc] py-5">
          <div className="max-w-6xl mx-auto px-6">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-sans">
              {CAPABILITY_TAGS.map((tag, index) => (
                <li key={tag} className="flex items-center gap-6">
                  <span className={monoClassName("text-[#6b5d4a] normal-case tracking-[0.08em] text-[10px] sm:text-[11px]")}>
                    {tag}
                  </span>
                  {index < CAPABILITY_TAGS.length - 1 && (
                    <span className="hidden sm:inline text-[#e2d6bc]" aria-hidden>·</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Overview */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="font-sans">
              <Eyebrow>Overview</Eyebrow>
              <h2 className={displayClass("text-3xl sm:text-4xl font-semibold text-[#211a12] leading-tight")}>
                A calmer way to run the counter
              </h2>
              <p className="mt-5 text-[#6b5d4a] leading-relaxed">
                Piece-level inventory with entry vouchers and verification gates keeps stock honest
                before it hits the floor. Production runs through wax, casting, stone setting, and QC
                — with metal and stone issue tracking tied back to stock. Counter sales use live market
                rates, discount approvals, and WhatsApp-shareable GST invoices.
              </p>
              <p className="mt-4 text-[#6b5d4a] leading-relaxed">
                Turn on a branded online store fed by the same stock as the counter. Web orders land
                in the ERP — no double-selling, no duplicate catalogue.
              </p>
              <a
                href="#pricing"
                className="inline-block mt-6 text-sm font-medium text-[#211a12] underline-offset-4 hover:underline font-sans"
              >
                See plans →
              </a>
            </div>
            <div className="space-y-5">
              <ItemRecordCard />
              <blockquote className="rounded-xl border border-[#e2d6bc] bg-[#fffdf8] p-5 font-sans">
                <p className="text-sm text-[#6b5d4a] leading-relaxed italic">
                  &ldquo;We built this because jewellery businesses shouldn&apos;t need five
                  spreadsheets and a prayer to know what&apos;s on the floor.&rdquo;
                </p>
                <footer className="mt-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#efe4cd] flex items-center justify-center">
                    <Gem size={14} className="text-[#6b5d4a]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#211a12]">Shri Hari Jewels</p>
                    <p className={monoClassName("text-[#6b5d4a] normal-case tracking-normal mt-0.5")}>
                      Platform team
                    </p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-[#efe4cd] border-y border-[#e2d6bc]">
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-24 font-sans">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Eyebrow>Access</Eyebrow>
              <h2 className={displayClass("text-3xl sm:text-4xl font-semibold text-[#211a12]")}>
                Start simply. Go deeper when you need to.
              </h2>
              <p className="mt-4 text-[#6b5d4a] text-sm leading-relaxed">
                Plan names and feature lists are placeholders — confirm with our team before onboarding.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Standard */}
              <article className="rounded-2xl border border-[#e2d6bc] bg-[#fffdf8] p-7 flex flex-col">
                <p className={monoClassName("text-[#6b5d4a] mb-4")}>Core</p>
                <h3 className={displayClass("text-2xl font-semibold text-[#211a12] mb-6")}>
                  Standard
                </h3>
                <ul className="space-y-3 flex-1 mb-8">
                  {STANDARD_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[#6b5d4a]">
                      <span className="mt-2 w-1 h-1 rounded-full bg-[#f0c33f] shrink-0" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <MustardButton href="#request-demo" className="w-full">
                  Request a demo
                </MustardButton>
              </article>

              {/* Multi-Branch */}
              <article className="rounded-2xl border border-[#2b2015] bg-[#1f1712] p-7 flex flex-col text-[#fffdf8]">
                <p className={monoClassName("text-[#f0c33f] mb-4")}>Growth</p>
                <h3 className={displayClass("text-2xl font-semibold mb-6")}>
                  Multi-Branch
                </h3>
                <ul className="space-y-3 flex-1 mb-8">
                  {MULTI_BRANCH_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[#e2d6bc]">
                      <span className="mt-2 w-1 h-1 rounded-full bg-[#f0c33f] shrink-0" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <MustardButton href="#request-demo" className="w-full">
                  Request a demo
                </MustardButton>
              </article>
            </div>
          </div>
        </section>

        {/* Closing CTA with screenshot collage */}
        <section className="py-20 lg:py-28 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-6 items-center">
              {/* Left screenshots */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                {SCREENSHOT_COLLAGE.slice(0, 2).map((shot) => (
                  <div
                    key={shot.src}
                    className={`relative ${shot.height} ${shot.offset} rounded-lg overflow-hidden border border-[#e2d6bc] shadow-sm`}
                  >
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      fill
                      className="object-cover object-top"
                      sizes="160px"
                    />
                  </div>
                ))}
              </div>

              {/* Center CTA */}
              <div className="text-center font-sans">
                <Eyebrow>See it for yourself</Eyebrow>
                <h2 className={displayClass("text-3xl sm:text-4xl font-semibold text-[#211a12] leading-tight")}>
                  Walk through a live demo
                </h2>
                <p className="mt-4 text-[#6b5d4a] text-sm leading-relaxed max-w-md mx-auto">
                  Browse the demo storefront or request a guided walkthrough of inventory,
                  production, and billing — with real screens, not mockups.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <MustardButton href={DEMO_STORE}>Browse demo store</MustardButton>
                  <a
                    href="#request-demo"
                    className="text-sm font-medium text-[#6b5d4a] hover:text-[#211a12] underline-offset-4 hover:underline transition-colors"
                  >
                    Request a demo →
                  </a>
                </div>
              </div>

              {/* Right screenshots */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                {SCREENSHOT_COLLAGE.slice(2).map((shot) => (
                  <div
                    key={shot.src}
                    className={`relative ${shot.height} ${shot.offset} rounded-lg overflow-hidden border border-[#e2d6bc] shadow-sm`}
                  >
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      fill
                      className="object-cover object-top"
                      sizes="160px"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile screenshot strip */}
            <div className="lg:hidden mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SCREENSHOT_COLLAGE.map((shot) => (
                <div
                  key={shot.src}
                  className={`relative h-32 ${shot.offset} rounded-lg overflow-hidden border border-[#e2d6bc] shadow-sm`}
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    className="object-cover object-top"
                    sizes="200px"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo form — logic unchanged */}
        <section id="request-demo" className="bg-[#1f1712] text-[#fffdf8]">
          <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 font-sans">
            <div>
              <Eyebrow>Get started</Eyebrow>
              <h2 className={displayClass("text-3xl font-semibold leading-snug")}>
                Request a demo
              </h2>
              <p className="mt-4 text-[#e2d6bc] leading-relaxed text-sm">
                Tell us about your business. Our team will reach out to walk you through
                the ERP and online store — no self-signup, no credit card on this page.
              </p>
              <p className="mt-6 text-xs text-[#6b5d4a]">
                Already a customer?{" "}
                <Link href="/login" className="text-[#f0c33f] hover:underline">
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
                <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>Business name *</span>
                <input
                  required
                  className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f]"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>Contact name *</span>
                  <input
                    required
                    className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f]"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>Phone *</span>
                  <input
                    required
                    type="tel"
                    className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f]"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>Email</span>
                  <input
                    type="email"
                    className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f]"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>City</span>
                  <input
                    className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f]"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>Business type</span>
                <select
                  className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f]"
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
                <span className={monoClassName("text-[#e2d6bc] mb-1 block")}>Message</span>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-[#2b2015] bg-[#2b2015] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0c33f] resize-y"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your branches, team size, or what you want to solve first."
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#f0c33f] hover:bg-[#d9ad24] disabled:opacity-60 px-4 py-3 text-sm font-medium text-[#211a12] transition-colors"
              >
                {submitting ? "Sending…" : "Request demo"}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative bg-[#1f1712] text-[#fffdf8] overflow-hidden">
        <p
          className={`${displayClass("absolute -bottom-6 left-1/2 -translate-x-1/2 text-[clamp(5rem,18vw,14rem)] font-semibold whitespace-nowrap pointer-events-none select-none opacity-[0.04]")}`}
          aria-hidden
        >
          Shri Hari Jewels
        </p>
        <div className="relative max-w-6xl mx-auto px-6 py-14 font-sans">
          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <HexLogo size={40} />
                <p className={displayClass("text-lg font-semibold")}>Shri Hari Jewels</p>
              </div>
              <p className="text-sm text-[#e2d6bc] leading-relaxed max-w-xs">
                Jewellery ERP + online store for Indian jewellers.
              </p>
              {(platformContact?.phone || platformContact?.email) && (
                <div className="mt-5 space-y-1.5 text-sm text-[#e2d6bc]">
                  {platformContact.phone && (
                    <p>
                      <a href={`tel:${platformContact.phone.replace(/\s/g, "")}`} className="hover:text-[#f0c33f] transition-colors">
                        {platformContact.phone}
                      </a>
                    </p>
                  )}
                  {platformContact.email && (
                    <p>
                      <a href={`mailto:${platformContact.email}`} className="hover:text-[#f0c33f] transition-colors">
                        {platformContact.email}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
            <nav className="sm:text-right">
              <p className={monoClassName("text-[#6b5d4a] mb-4")}>On this page</p>
              <ul className="space-y-2 text-sm text-[#e2d6bc]">
                <li>
                  <a href="#how-it-works" className="hover:text-[#f0c33f] transition-colors">
                    Product
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-[#f0c33f] transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#request-demo" className="hover:text-[#f0c33f] transition-colors">
                    Request a demo
                  </a>
                </li>
                <li>
                  <Link href={DEMO_STORE} className="hover:text-[#f0c33f] transition-colors">
                    Demo store
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-[#f0c33f] transition-colors">
                    Sign in
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 pt-6 border-t border-[#2b2015] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className={monoClassName("text-[#6b5d4a] normal-case tracking-normal text-[10px]")}>
              © {new Date().getFullYear()} Shri Hari Jewels. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes traveler-progress-vertical {
          0% { height: 0; opacity: 0.4; }
          100% { height: 55%; opacity: 1; }
        }
        .traveler-progress-vertical {
          animation: traveler-progress-vertical 1.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
