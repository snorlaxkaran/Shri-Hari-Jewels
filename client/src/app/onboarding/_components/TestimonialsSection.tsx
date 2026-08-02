"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TESTIMONIALS } from "@/lib/onboarding/marketing-content";

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const t = TESTIMONIALS[index];

  return (
    <section className="py-16 lg:py-20 bg-[#171717] text-white">
      <div className="erp-marketing-shell">
        <div className="text-center mb-10">
          <p className="text-xs font-medium uppercase tracking-wide text-[#a3a3a3] mb-3">
            Stories from the counter
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold">Jewellers who switched</h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <blockquote className="text-lg sm:text-xl leading-relaxed text-[#e5e7eb] italic text-center">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-sm text-[#a3a3a3]">
            {t.name} · {t.role}
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1))
              }
              className="erp-icon-btn erp-icon-btn-dark"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Testimonial ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`w-2 h-2 rounded-full ${
                    i === index ? "bg-[#e74c3c]" : "bg-[#525252]"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i === TESTIMONIALS.length - 1 ? 0 : i + 1))
              }
              className="erp-icon-btn erp-icon-btn-dark"
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
