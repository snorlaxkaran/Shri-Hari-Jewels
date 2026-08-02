"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { SHOWCASE_MODULES } from "@/lib/onboarding/modules-showcase";

const HERO_MODULES = SHOWCASE_MODULES.filter((m) =>
  ["inventory", "production", "sales", "crm", "storefront", "multibranch", "reports"].includes(
    m.id,
  ),
);

export function HeroScreenshotCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = HERO_MODULES[activeIndex];

  const prefetch = useCallback((index: number) => {
    const img = new window.Image();
    img.src = HERO_MODULES[index].heroScreenshot;
  }, []);

  return (
    <div className="mkt-shell-wide">
      <div className="mkt-browser">
        <div className="mkt-browser-chrome">
          <span className="mkt-browser-dot bg-[#ff5f57]" />
          <span className="mkt-browser-dot bg-[#febc2e]" />
          <span className="mkt-browser-dot bg-[#28c840]" />
          <span className="mkt-browser-label">{active.label}</span>
        </div>
        <div className="relative aspect-[16/10] bg-white">
          <Image
            key={active.id}
            src={active.heroScreenshot}
            alt={active.label}
            fill
            className="object-contain object-top"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority={activeIndex === 0}
            quality={82}
          />
        </div>
        <div className="mkt-browser-tabs">
          {HERO_MODULES.map((mod, i) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              onMouseEnter={() => prefetch(i)}
              onFocus={() => prefetch(i)}
              className={`mkt-browser-tab ${i === activeIndex ? "mkt-browser-tab-active" : ""}`}
            >
              {mod.shortLabel}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
