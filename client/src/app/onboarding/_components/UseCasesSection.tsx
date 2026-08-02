import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { USE_CASES } from "@/lib/onboarding/marketing-content";

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-16 lg:py-24 bg-white border-y border-[#e5e7eb]">
      <div className="erp-marketing-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            Implementations
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold">Pick your jewellery business type</h2>
          <p className="mt-3 text-[#525252]">
            Whether you run a single counter, a manufacturing unit, or a multi-branch house — start
            with the modules that matter most.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {USE_CASES.map((uc) => (
            <article key={uc.id} className="erp-marketing-card hover:border-[#d1d5db] transition-colors">
              <p className="text-xs font-medium uppercase text-[#e74c3c]">{uc.subtitle}</p>
              <h3 className="mt-2 text-xl font-semibold">{uc.title}</h3>
              <p className="mt-2 text-sm text-[#525252] leading-relaxed">{uc.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {uc.modules.map((m) => (
                  <span
                    key={m}
                    className="text-xs px-2 py-1 rounded bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280]"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <Link
                href={uc.href}
                className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[#e74c3c]"
              >
                Know more
                <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
