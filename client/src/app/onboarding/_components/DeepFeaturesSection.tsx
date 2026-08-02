import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEEP_FEATURES } from "@/lib/onboarding/marketing-content";

export function DeepFeaturesSection() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-[#f4f5f7]">
      <div className="erp-marketing-shell space-y-20">
        {DEEP_FEATURES.map((feature, i) => (
          <div
            key={feature.id}
            className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
              i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#e74c3c] mb-2">
                {feature.eyebrow}
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#171717]">{feature.title}</h2>
              <p className="mt-4 text-[#525252] leading-relaxed">{feature.body}</p>
              <Link
                href={feature.href}
                className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#e74c3c] hover:text-[#cf4436] group"
              >
                {feature.linkLabel}
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="erp-marketing-card p-0 overflow-hidden">
              <Image
                src={feature.screenshot}
                alt={feature.screenshotAlt}
                width={960}
                height={600}
                className="w-full h-auto"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
