"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SHOWCASE_MODULES } from "@/lib/onboarding/modules-showcase";

export function ModuleShowcaseMobile() {
  const [index, setIndex] = useState(0);
  const mod = SHOWCASE_MODULES[index];

  const prev = () => setIndex((i) => (i === 0 ? SHOWCASE_MODULES.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === SHOWCASE_MODULES.length - 1 ? 0 : i + 1));

  return (
    <section id="modules-mobile" className="lg:hidden mkt-section">
      <div className="mkt-shell">
        <div className="mb-8">
          <p className="mkt-eyebrow mb-2">One app for all your needs</p>
          <h2 className="mkt-display text-2xl">Every module, one platform</h2>
          <p className="mt-2 text-sm mkt-text-secondary">
            Swipe through inventory, production, sales, CRM, store, branches, reports, and more.
          </p>
        </div>

        <div className="mkt-browser">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
            <button type="button" onClick={prev} className="mkt-icon-btn" aria-label="Previous module">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium">{mod.label}</span>
            <button type="button" onClick={next} className="mkt-icon-btn" aria-label="Next module">
              <ChevronRight size={20} />
            </button>
          </div>
          <Image
            src={mod.mobileScreenshot}
            alt={mod.label}
            width={960}
            height={600}
            className="w-full h-auto"
          />
          <div className="p-5">
            <p className="mkt-eyebrow mkt-accent-text">{mod.processLabel}</p>
            <ul className="mt-3 space-y-2">
              {mod.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm mkt-text-secondary">
                  <Check size={14} className="mkt-check shrink-0 mt-0.5" />
                  {feat}
                </li>
              ))}
            </ul>
            <Link href={mod.knowMoreHref} className="mkt-link mt-5">
              Know more
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mt-4">
          {SHOWCASE_MODULES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-label={m.label}
              onClick={() => setIndex(i)}
              className={`mkt-dot ${i === index ? "mkt-dot-active" : ""}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
