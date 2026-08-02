"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TESTIMONIALS } from "@/lib/onboarding/marketing-content";

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const t = TESTIMONIALS[index];

  return (
    <section className="mkt-dark-section">
      <div className="mkt-shell">
        <div className="text-center mb-10">
          <p className="mkt-eyebrow mkt-on-dark-muted mb-3">Stories from the counter</p>
          <h2 className="mkt-display text-2xl sm:text-3xl mkt-on-dark">Jewellers who switched</h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <blockquote className="mkt-quote">&ldquo;{t.quote}&rdquo;</blockquote>
          <p className="mt-6 text-center text-sm mkt-on-dark-muted">
            {t.name} · {t.role}
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1))
              }
              className="mkt-icon-btn mkt-icon-btn-dark"
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
                  className={`mkt-dot ${i === index ? "mkt-dot-active-on-dark" : "mkt-dot-inactive-on-dark"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i === TESTIMONIALS.length - 1 ? 0 : i + 1))
              }
              className="mkt-icon-btn mkt-icon-btn-dark"
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
