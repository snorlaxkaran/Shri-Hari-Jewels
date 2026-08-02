"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { FAQ_ITEMS } from "@/lib/onboarding/marketing-content";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 lg:py-24 bg-white">
      <div className="erp-marketing-shell max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            Got a query?
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold">Frequently asked questions</h2>
        </div>

        <div className="divide-y divide-[#e5e7eb] border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-[#fafafa] transition-colors"
                >
                  <h3 className="font-medium text-[#171717] pr-4">{item.q}</h3>
                  <span className="shrink-0 text-[#6b7280] mt-0.5">
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-[#525252] leading-relaxed">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
