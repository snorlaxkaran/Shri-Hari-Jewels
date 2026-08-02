"use client";

import Link from "next/link";
import {
  Award,
  Factory,
  Gem,
  Globe,
  Package,
  ShoppingCart,
  Store,
  Zap,
} from "lucide-react";
import { JEWELLERY_MODULES, MODULE_META } from "@/lib/onboarding/config";

const MODULE_ICONS = {
  inventory: Package,
  production: Factory,
  sales: ShoppingCart,
  storefront: Globe,
  multibranch: Store,
} as const;

const HIGHLIGHTS = [
  "Piece-level stock with HUID tracking",
  "Wax → QC production with karigar settlements",
  "GST invoices & WhatsApp PDF share",
  "Online store synced to counter stock",
  "Multi-branch transfers",
  "Tally export for your CA",
];

const STEPS = [
  {
    n: "1",
    title: "Verify mobile (once)",
    desc: "One-time OTP on SMS — takes under a minute.",
  },
  {
    n: "2",
    title: "Choose login email & password",
    desc: "Set credentials in setup — no extra verification.",
  },
  {
    n: "3",
    title: "Run the counter",
    desc: "Guided checklists inside each workspace.",
  },
];

export default function OnboardingPortfolioPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7]">
      <header className="sticky top-0 z-20 bg-white border-b border-[#e5e7eb] h-12">
        <div className="erp-marketing-shell h-full flex items-center justify-between">
          <Link href="/onboarding" className="erp-auth-brand">
            <span className="erp-auth-brand-mark">
              <Gem size={16} />
            </span>
            Shri Hari Jewels
          </Link>
          <nav className="erp-auth-nav-actions">
            <a href="#features" className="erp-auth-nav-link hidden sm:inline">
              Features
            </a>
            <a href="#modules" className="erp-auth-nav-link hidden sm:inline">
              Modules
            </a>
            <Link href="/login" className="erp-auth-nav-link">
              Sign in
            </Link>
            <Link href="/onboarding/start" className="erp-btn-primary w-auto px-4 shrink-0">
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-[#e5e7eb] bg-white">
        <div className="erp-marketing-shell py-16 lg:py-24 grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-4">
              <Zap size={14} className="text-[#e74c3c]" />
              2-month free trial · No credit card
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight text-[#171717]">
              Jewellery ERP — clean, fast, and built for your counter
            </h1>
            <p className="mt-5 text-lg text-[#525252] leading-relaxed max-w-lg">
              Every piece tracked from wax to wrist — inventory, shop-floor production, GST
              billing, and an optional online store on one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboarding/start" className="erp-btn-primary w-auto px-6 py-2.5">
                Start 2-month free trial
              </Link>
              <Link
                href="/shop/shree-hari-jewels"
                className="erp-btn-secondary px-6 py-2.5 inline-flex items-center"
              >
                Browse demo store
              </Link>
            </div>
          </div>

          <div className="erp-marketing-card erp-marketing-hero shadow-md">
            <div className="px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2 rounded-t-[12px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-[#6b7280]">Inventory · SHJ-2024-0842</span>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
                <span className="text-[#6b7280]">Item</span>
                <span className="font-medium">Gold bangle · 22K</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
                <span className="text-[#6b7280]">Gross wt</span>
                <span className="font-medium tabular-nums">42.350 g</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-[#e5e7eb] pb-2">
                <span className="text-[#6b7280]">Net wt</span>
                <span className="font-medium tabular-nums">38.120 g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">HUID</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                  <Award size={12} />
                  Hallmarked
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="erp-marketing-shell py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-10">Get started in minutes</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="erp-marketing-card">
              <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#e74c3c] text-white text-sm font-semibold">
                {step.n}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-[#525252] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-y border-[#e5e7eb] bg-white py-12">
        <div className="erp-marketing-shell">
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-[#404040]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e74c3c]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="modules" className="erp-marketing-shell py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-semibold">Workspaces built for jewellers</h2>
          <p className="mt-3 text-[#525252]">
            Not a generic ERP — each module is tailored to Indian jewellery operations with
            guided onboarding inside the app.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {JEWELLERY_MODULES.map((id) => {
            const meta = MODULE_META[id];
            const Icon = MODULE_ICONS[id];
            return (
              <article key={id} className="erp-marketing-card hover:border-[#d1d5db] transition-colors">
                <Icon size={22} className="text-[#e74c3c] mb-3" strokeWidth={1.75} />
                <h3 className="font-semibold">{meta.label}</h3>
                <p className="mt-2 text-sm text-[#525252] leading-relaxed">{meta.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#171717] text-white">
        <div className="erp-marketing-shell py-20 text-center">
          <h2 className="text-2xl sm:text-4xl font-semibold">Ready to run a calmer counter?</h2>
          <p className="mt-3 text-[#a3a3a3] max-w-lg mx-auto">
            Verify your mobile once, set your login email in setup, and start managing inventory
            the same day.
          </p>
          <Link
            href="/onboarding/start"
            className="inline-flex mt-8 rounded-md bg-[#e74c3c] hover:bg-[#cf4436] text-white px-8 py-3 text-sm font-semibold transition-colors"
          >
            Start free trial →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#e5e7eb] py-8 bg-white">
        <div className="erp-marketing-shell flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6b7280]">
          <p>© {new Date().getFullYear()} Shri Hari Jewels</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-[#171717]">
              Sign in
            </Link>
            <Link href="/shop/shree-hari-jewels" className="hover:text-[#171717]">
              Demo store
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
