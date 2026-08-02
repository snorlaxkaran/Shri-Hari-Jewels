"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SHOWCASE_MODULES, type ShowcaseModuleId } from "@/lib/onboarding/modules-showcase";

export function ModuleShowcase() {
  const [activeId, setActiveId] = useState<ShowcaseModuleId>("inventory");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  const activeModule = SHOWCASE_MODULES.find((m) => m.id === activeId)!;

  const updateSlider = useCallback((index: number) => {
    const tab = tabRefs.current[index];
    const bar = tabBarRef.current;
    if (!tab || !bar) return;
    const tabRect = tab.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    setSlider({ left: tabRect.left - barRect.left, width: tabRect.width });
  }, []);

  useEffect(() => {
    const index = SHOWCASE_MODULES.findIndex((m) => m.id === activeId);
    updateSlider(index);
  }, [activeId, updateSlider]);

  useEffect(() => {
    const onResize = () => {
      const index = SHOWCASE_MODULES.findIndex((m) => m.id === activeId);
      updateSlider(index);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeId, updateSlider]);

  const prefetch = (src: string) => {
    const img = new window.Image();
    img.src = src;
  };

  return (
    <section className="mkt-section">
      <div className="mkt-shell-wide">
        <p className="mkt-eyebrow text-center">From counter to karigar floor</p>
        <h2 className="mkt-display mkt-section-title mt-3">
          One platform for your entire jewellery business
        </h2>
        <p className="mkt-section-desc mt-3">
          Inventory, production, GST billing, CRM, online store, multi-branch transfers, and
          reports — with guided onboarding in every workspace.
        </p>

        <div className="relative border-b border-[#e5e5e5] mt-12 mb-10 overflow-x-auto scrollbar-hide">
          <div ref={tabBarRef} className="flex min-w-max gap-0 relative">
            {SHOWCASE_MODULES.map((mod, i) => {
              const Icon = mod.icon;
              const isActive = mod.id === activeId;
              return (
                <button
                  key={mod.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => setActiveId(mod.id)}
                  onMouseEnter={() => prefetch(mod.screenshot)}
                  className={`mkt-showcase-tab ${isActive ? "mkt-showcase-tab-active" : ""}`}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span className="hidden sm:inline">{mod.shortLabel}</span>
                </button>
              );
            })}
            <div
              className="mkt-showcase-slider"
              style={{ left: slider.left, width: slider.width }}
            />
          </div>
        </div>

        <div role="tabpanel" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="mkt-browser order-2 lg:order-1">
            <div className="relative aspect-[16/10] bg-white">
              <Image
                key={activeModule.id}
                src={activeModule.screenshot}
                alt={`${activeModule.label} screenshot`}
                fill
                className="object-contain object-top p-1"
                sizes="(max-width: 1024px) 100vw, 560px"
                quality={82}
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="mkt-eyebrow text-[#b8860b]">{activeModule.processLabel}</p>
            <h3 className="mkt-display text-3xl mt-2">{activeModule.label}</h3>
            <p className="mt-3 mkt-lead">{activeModule.tagline}</p>

            <ul className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {activeModule.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm text-[#525252]">
                  <Check size={15} className="text-[#b8860b] shrink-0 mt-0.5" strokeWidth={2.5} />
                  {feat}
                </li>
              ))}
            </ul>

            <Link href={activeModule.knowMoreHref} className="mkt-link mt-8">
              Know more
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
