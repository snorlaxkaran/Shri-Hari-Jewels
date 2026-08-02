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

  return (
    <section id="modules" className="hidden lg:block border-y border-[#e5e7eb] bg-white py-16 lg:py-24">
      <div className="erp-marketing-shell">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            From inventory to online store
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold text-[#171717]">
            Our jewellery ERP is all you need
          </h2>
          <p className="mt-4 text-[#525252] leading-relaxed">
            Inventory, invoicing, sales, procurement, production, CRM, online store, multi-branch
            transfers, reports, HR, and payroll — tailored to Indian jewellery with guided
            onboarding inside each workspace.
          </p>
        </div>

        <div className="relative border-b border-[#e5e7eb] mb-8 overflow-x-auto scrollbar-hide">
          <div ref={tabBarRef} className="flex min-w-max gap-1 pb-0 relative">
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
                  className={`erp-showcase-tab ${isActive ? "erp-showcase-tab-active" : ""}`}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{mod.shortLabel}</span>
                </button>
              );
            })}
            <div
              className="erp-showcase-tab-slider"
              style={{ left: slider.left, width: slider.width }}
            />
          </div>
        </div>

        <div role="tabpanel" className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="erp-showcase-screenshot">
            <button
              type="button"
              className="w-full text-left group"
              onClick={() => {
                const el = document.getElementById("showcase-lightbox");
                if (el) (el as HTMLDialogElement).showModal();
              }}
              aria-label={`Enlarge ${activeModule.label} screenshot`}
            >
              <Image
                src={activeModule.screenshot}
                alt={`${activeModule.label} screenshot`}
                width={960}
                height={600}
                className="w-full h-auto rounded-lg border border-[#e5e7eb] shadow-sm group-hover:shadow-md transition-shadow"
                priority={activeId === "inventory"}
              />
              <span className="text-xs text-[#9ca3af] mt-2 block">Click to enlarge</span>
            </button>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#e74c3c] mb-2">
              {activeModule.processLabel}
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold text-[#171717]">
              {activeModule.label}
            </h3>
            <p className="mt-2 text-[#525252]">{activeModule.tagline}</p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {activeModule.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm text-[#404040]">
                  <Check size={16} className="text-[#e74c3c] shrink-0 mt-0.5" strokeWidth={2.5} />
                  {feat}
                </li>
              ))}
            </ul>

            <Link
              href={activeModule.knowMoreHref}
              className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-[#e74c3c] hover:text-[#cf4436] transition-colors group"
            >
              Know more
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      <dialog id="showcase-lightbox" className="erp-showcase-lightbox">
        <form method="dialog">
          <button type="submit" className="erp-showcase-lightbox-close" aria-label="Close">
            ×
          </button>
        </form>
        <Image
          src={activeModule.screenshot}
          alt={`${activeModule.label} enlarged`}
          width={1200}
          height={750}
          className="max-w-full max-h-[85vh] w-auto h-auto rounded-lg"
        />
      </dialog>
    </section>
  );
}
