import Image from "next/image";
import { STATS, TRUSTED_BY } from "@/lib/onboarding/marketing-content";

export function SocialProofSection() {
  return (
    <section className="border-b border-[#e5e7eb] bg-[#fafafa] py-16 lg:py-20">
      <div className="erp-marketing-shell">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            Built for Indian jewellery operations
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold text-[#171717]">
            One platform from counter to karigar floor
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="erp-marketing-card text-center py-6">
              <p className="text-3xl sm:text-4xl font-semibold text-[#e74c3c] tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-[#525252]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm text-[#525252] mb-4">Trusted by jewellers running</p>
            <div className="flex flex-wrap gap-2">
              {TRUSTED_BY.map((label) => (
                <span
                  key={label}
                  className="inline-flex px-3 py-1.5 rounded-full bg-white border border-[#e5e7eb] text-sm text-[#404040]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="erp-marketing-card p-0 overflow-hidden">
            <Image
              src="/onboarding/analytics.png"
              alt="Sales analytics dashboard"
              width={960}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
