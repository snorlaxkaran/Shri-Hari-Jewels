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

        <div className="mkt-faq mt-10">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="mkt-faq-trigger"
                >
                  <span className="font-medium text-[0.9375rem] pr-4">{item.q}</span>
                  <span className="shrink-0 mkt-text-muted mt-0.5">
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                {isOpen && <div className="mkt-faq-answer">{item.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
