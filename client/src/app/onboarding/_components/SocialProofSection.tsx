import Image from "next/image";
import { STATS, TRUSTED_BY } from "@/lib/onboarding/marketing-content";

export function SocialProofSection() {
  return (
    <section className="mkt-section mkt-section-alt">
      <div className="mkt-shell-wide">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="mkt-eyebrow mb-3">Built for Indian jewellery operations</p>
          <h2 className="mkt-display text-2xl sm:text-4xl">
            One platform from counter to karigar floor
          </h2>
        </div>

        <div className="mkt-stats-grid mb-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="mkt-card text-center py-6">
              <p className="mkt-stat-value tabular-nums">{stat.value}</p>
              <p className="mkt-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm mkt-text-secondary mb-4">Trusted by jewellers running</p>
            <div className="mkt-pill-row">
              {TRUSTED_BY.map((label) => (
                <span key={label} className="mkt-pill">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="mkt-browser">
            <div className="relative aspect-[16/10] bg-white">
              <Image
                src="/onboarding/analytics.png"
                alt="Sales analytics dashboard"
                fill
                className="object-contain object-top p-1"
                sizes="(max-width: 1024px) 100vw, 560px"
                quality={82}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
