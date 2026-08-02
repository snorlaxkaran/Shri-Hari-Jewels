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
  { n: "1", title: "Start free trial", desc: "Verify your mobile with OTP — takes under a minute." },
  { n: "2", title: "Set up your showroom", desc: "Business details, GST, and modules you’ll use." },
  { n: "3", title: "Run the counter", desc: "Guided checklists inside each workspace." },
];

export default function OnboardingPortfolioPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav — ERPNext-style minimal bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/onboarding" className="flex items-center gap-2.5 font-semibold text-[#171717]">
            <span className="w-8 h-8 rounded-md bg-[#ff5858] flex items-center justify-center">
              <Gem size={16} className="text-white" />
            </span>
            Shri Hari Jewels
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-[#525252] hover:text-[#171717] hidden sm:inline">
              Features
            </a>
            <a href="#modules" className="text-[#525252] hover:text-[#171717] hidden sm:inline">
              Modules
            </a>
            <Link href="/login" className="text-[#525252] hover:text-[#171717]">
              Sign in
            </Link>
            <Link
              href="/onboarding/start"
              className="rounded-md bg-[#171717] hover:bg-[#262626] text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[#e5e5e5] bg-[#fafafa]">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#737373] mb-4">
              <Zap size={14} className="text-[#ff5858]" />
              2-month free trial · No credit card
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight text-[#171717]">
              Jewellery ERP that speaks your language
            </h1>
            <p className="mt-5 text-lg text-[#525252] leading-relaxed max-w-lg">
              Every piece tracked from wax to wrist — inventory, shop-floor production, GST
              billing, and an optional online store on one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onboarding/start"
                className="inline-flex items-center justify-center rounded-md bg-[#171717] hover:bg-[#262626] text-white px-6 py-3 text-sm font-medium transition-colors"
              >
                Start 2-month free trial
              </Link>
              <Link
                href="/shop/shree-hari-jewels"
                className="inline-flex items-center justify-center rounded-md border border-[#d4d4d4] bg-white hover:bg-[#fafafa] px-6 py-3 text-sm font-medium text-[#404040] transition-colors"
              >
                Browse demo store
              </Link>
            </div>
          </div>

          {/* Product preview card */}
          <div className="rounded-lg border border-[#e5e5e5] bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e5e5e5] bg-[#f4f5f6] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-[#737373]">Inventory · SHJ-2024-0842</span>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between border-b border-dashed border-[#e5e5e5] pb-2">
                <span className="text-[#737373]">Item</span>
                <span className="font-medium">Gold bangle · 22K</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-[#e5e5e5] pb-2">
                <span className="text-[#737373]">Gross wt</span>
                <span className="font-medium tabular-nums">42.350 g</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-[#e5e5e5] pb-2">
                <span className="text-[#737373]">Net wt</span>
                <span className="font-medium tabular-nums">38.120 g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737373]">HUID</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                  <Award size={12} />
                  Hallmarked
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-center mb-10">Get started in minutes</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-lg border border-[#e5e5e5] p-6 bg-white">
              <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#171717] text-white text-sm font-semibold">
                {step.n}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-[#525252] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section id="features" className="border-y border-[#e5e5e5] bg-[#fafafa] py-10">
        <div className="max-w-6xl mx-auto px-6">
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-[#404040]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5858]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Modules grid */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">Workspaces built for jewellers</h2>
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
              <article
                key={id}
                className="rounded-lg border border-[#e5e5e5] p-6 hover:border-[#a3a3a3] transition-colors bg-white"
              >
                <Icon size={22} className="text-[#ff5858] mb-3" strokeWidth={1.75} />
                <h3 className="font-semibold">{meta.label}</h3>
                <p className="mt-2 text-sm text-[#525252] leading-relaxed">{meta.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#171717] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">Ready to run a calmer counter?</h2>
          <p className="mt-3 text-[#a3a3a3] max-w-lg mx-auto">
            Start your 2-month trial with just your mobile number. Set up your showroom right
            after — no sales call required.
          </p>
          <Link
            href="/onboarding/start"
            className="inline-flex mt-8 rounded-md bg-white text-[#171717] hover:bg-[#f5f5f5] px-8 py-3 text-sm font-semibold transition-colors"
          >
            Start free trial →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#e5e5e5] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#737373]">
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
