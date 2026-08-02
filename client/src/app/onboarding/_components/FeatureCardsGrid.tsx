import {
  Award,
  BarChart2,
  Factory,
  Globe,
  Package,
  Scan,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import { FEATURE_CARDS } from "@/lib/onboarding/marketing-content";

const ICONS: Record<string, LucideIcon> = {
  Package,
  Factory,
  ShoppingCart,
  Globe,
  Scan,
  Users,
  BarChart2,
  Award,
};

export function FeatureCardsGrid() {
  return (
    <section className="mkt-section mkt-section-alt">
      <div className="mkt-shell">
        <p className="mkt-eyebrow text-center">Platform capabilities</p>
        <h2 className="mkt-display mkt-section-title mt-3">
          Everything a jewellery house needs
        </h2>
        <p className="mkt-section-desc mt-3">
          Not a generic ERP with jewellery plugins — built from the counter up for Indian
          showrooms, manufacturers, and multi-branch groups.
        </p>

        <div className="mkt-feature-grid mt-12">
          {FEATURE_CARDS.map((card) => {
            const Icon = ICONS[card.icon] ?? Package;
            return (
              <article key={card.title} className="mkt-feature-card">
                <span className="mkt-feature-icon">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className="mkt-feature-title">{card.title}</h3>
                <p className="mkt-feature-desc">{card.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
