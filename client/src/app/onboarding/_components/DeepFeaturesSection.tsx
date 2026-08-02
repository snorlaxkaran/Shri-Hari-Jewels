import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEEP_FEATURES } from "@/lib/onboarding/marketing-content";

export function DeepFeaturesSection() {
  return (
    <section className="mkt-section mkt-section-alt">
      <div className="mkt-shell-wide space-y-24">
        {DEEP_FEATURES.map((feature, i) => (
          <div
            key={feature.id}
            className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
              i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div>
              <p className="mkt-eyebrow">{feature.eyebrow}</p>
              <h2 className="mkt-display text-3xl mt-3">{feature.title}</h2>
              <p className="mt-4 mkt-lead max-w-none">{feature.body}</p>
              <Link href={feature.href} className="mkt-link mt-6">
                {feature.linkLabel}
                <ArrowRight size={15} />
              </Link>
            </div>
            <div className="mkt-browser">
              <div className="relative aspect-[16/10] bg-white">
                <Image
                  src={feature.screenshot}
                  alt={feature.screenshotAlt}
                  fill
                  className="object-contain object-top"
                  sizes="(max-width: 1024px) 100vw, 560px"
                  loading="lazy"
                  quality={80}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
