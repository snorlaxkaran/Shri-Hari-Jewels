import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { USE_CASES } from "@/lib/onboarding/marketing-content";

export function UseCasesSection() {
  return (
    <section id="use-cases" className="mkt-section mkt-section-alt">
      <div className="mkt-shell-wide">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="mkt-eyebrow mb-3">Implementations</p>
          <h2 className="mkt-display text-2xl sm:text-4xl">Pick your jewellery business type</h2>
          <p className="mkt-section-desc mt-3">
            Whether you run a single counter, a manufacturing unit, or a multi-branch house — start
            with the modules that matter most.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {USE_CASES.map((uc) => (
            <article key={uc.id} className="mkt-card mkt-card-hover">
              <p className="mkt-eyebrow mkt-accent-text">{uc.subtitle}</p>
              <h3 className="mt-2 text-xl font-semibold">{uc.title}</h3>
              <p className="mt-2 text-sm mkt-text-secondary leading-relaxed">{uc.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {uc.modules.map((m) => (
                  <span key={m} className="mkt-tag">
                    {m}
                  </span>
                ))}
              </div>
              <Link href={uc.href} className="mkt-link mt-5">
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
