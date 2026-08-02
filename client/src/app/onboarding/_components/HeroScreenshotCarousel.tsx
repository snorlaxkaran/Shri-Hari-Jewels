"use client";

import Image from "next/image";
import { useState } from "react";
import { SHOWCASE_MODULES } from "@/lib/onboarding/modules-showcase";

const HERO_MODULES = SHOWCASE_MODULES.filter((m) =>
  ["inventory", "production", "sales", "crm", "storefront", "multibranch", "reports"].includes(
    m.id,
  ),
);

export function HeroScreenshotCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = HERO_MODULES[activeIndex];

  return (
    <div className="erp-marketing-card erp-marketing-hero shadow-md overflow-hidden p-0">
      <div className="relative bg-[#f9fafb] border-b border-[#e5e7eb]">
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-xs text-[#6b7280]">{active.label}</span>
        </div>
        <div className="relative aspect-[16/10] bg-white">
          {HERO_MODULES.map((mod, i) => (
            <Image
              key={mod.id}
              src={mod.heroScreenshot}
              alt={mod.label}
              fill
              className={`object-cover object-top transition-opacity duration-300 ${
                i === activeIndex ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={i === 0}
            />
          ))}
        </div>
      </div>
      <div className="flex overflow-x-auto scrollbar-hide border-t border-[#e5e7eb]">
        {HERO_MODULES.map((mod, i) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`erp-hero-tab shrink-0 ${i === activeIndex ? "erp-hero-tab-active" : ""}`}
          >
            {mod.shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
