import { Check } from "lucide-react";
import { COMPARISONS } from "@/lib/onboarding/marketing-content";

export function ComparisonSection() {
  return (
    <section className="mkt-section">
      <div className="mkt-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="mkt-eyebrow mb-3">Why switch</p>
          <h2 className="mkt-display text-2xl sm:text-4xl">Ditch spreadsheets — not your CA</h2>
          <p className="mkt-section-desc mt-3">
            Built for jewellery operations that Tally and generic ERP were never designed for.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {COMPARISONS.map((block) => (
            <div key={block.title} className="mkt-card">
              <h3 className="text-lg font-semibold mb-4">{block.title}</h3>
              <ul className="space-y-3">
                {block.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm mkt-text-secondary">
                    <Check size={16} className="mkt-check shrink-0 mt-0.5" strokeWidth={2.5} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
