import { Check } from "lucide-react";
import { COMPARISONS } from "@/lib/onboarding/marketing-content";

export function ComparisonSection() {
  return (
    <section className="py-16 lg:py-20 bg-[#fafafa]">
      <div className="erp-marketing-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            Why switch
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold">
            Ditch spreadsheets — not your CA
          </h2>
          <p className="mt-3 text-[#525252]">
            Built for jewellery operations that Tally and generic ERP were never designed for.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {COMPARISONS.map((block) => (
            <div key={block.title} className="erp-marketing-card">
              <h3 className="text-lg font-semibold mb-4">{block.title}</h3>
              <ul className="space-y-3">
                {block.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-[#404040]">
                    <Check size={16} className="text-[#e74c3c] shrink-0 mt-0.5" />
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
