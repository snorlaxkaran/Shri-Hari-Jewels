"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { FAQ_ITEMS } from "@/lib/onboarding/marketing-content";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mkt-section">
      <div className="mkt-shell max-w-2xl">
        <p className="mkt-eyebrow text-center">Got a query?</p>
        <h2 className="mkt-display mkt-section-title mt-3">Frequently asked questions</h2>

        <div className="mt-10 divide-y divide-[#e5e5e5] border border-[#e5e5e5] rounded-xl overflow-hidden bg-white">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-[#fafafa] transition-colors"
                >
                  <span className="font-medium text-[0.9375rem] pr-4">{item.q}</span>
                  <span className="shrink-0 text-[#737373] mt-0.5">
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-[#737373] leading-relaxed">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
