import dynamic from "next/dynamic";
import { AnnouncementBanner } from "./_components/AnnouncementBanner";
import { HeroSection } from "./_components/HeroSection";
import { MarketingHeader } from "./_components/MarketingHeader";
import { LazySection } from "./_components/LazySection";

const SocialProofSection = dynamic(
  () => import("./_components/SocialProofSection").then((m) => m.SocialProofSection),
  { loading: () => <div className="mkt-section mkt-shell"><div className="mkt-skeleton" /></div> },
);

const ComparisonSection = dynamic(
  () => import("./_components/ComparisonSection").then((m) => m.ComparisonSection),
);

const UseCasesSection = dynamic(
  () => import("./_components/UseCasesSection").then((m) => m.UseCasesSection),
);

const ModuleShowcase = dynamic(
  () => import("./_components/ModuleShowcase").then((m) => m.ModuleShowcase),
  { loading: () => <div className="mkt-section mkt-shell"><div className="mkt-skeleton" /></div> },
);

const ModuleShowcaseMobile = dynamic(
  () => import("./_components/ModuleShowcaseMobile").then((m) => m.ModuleShowcaseMobile),
);

const DeepFeaturesSection = dynamic(
  () => import("./_components/DeepFeaturesSection").then((m) => m.DeepFeaturesSection),
);

const FeatureCardsGrid = dynamic(
  () => import("./_components/FeatureCardsGrid").then((m) => m.FeatureCardsGrid),
);

const GuidedSetupSection = dynamic(
  () => import("./_components/GuidedSetupSection").then((m) => m.GuidedSetupSection),
);

const SetupStepsSection = dynamic(
  () => import("./_components/SetupStepsSection").then((m) => m.SetupStepsSection),
);

const TestimonialsSection = dynamic(
  () => import("./_components/TestimonialsSection").then((m) => m.TestimonialsSection),
);

const FAQSection = dynamic(
  () => import("./_components/FAQSection").then((m) => m.FAQSection),
);

const ImplementationSection = dynamic(
  () => import("./_components/ImplementationSection").then((m) => m.ImplementationSection),
);

const CTASection = dynamic(
  () => import("./_components/CTASection").then((m) => m.CTASection),
);

const MarketingFooter = dynamic(
  () => import("./_components/MarketingFooter").then((m) => m.MarketingFooter),
);

export default function OnboardingPortfolioPage() {
  return (
    <div className="mkt-page min-h-screen flex flex-col">
      <AnnouncementBanner />
      <MarketingHeader />
      <HeroSection />

      <SocialProofSection />

      <LazySection minHeight="24rem">
        <div id="compare">
          <ComparisonSection />
        </div>
      </LazySection>

      <LazySection minHeight="28rem">
        <UseCasesSection />
      </LazySection>

      <LazySection minHeight="36rem">
        <div id="modules">
          <div className="hidden lg:block">
            <ModuleShowcase />
          </div>
          <ModuleShowcaseMobile />
        </div>
      </LazySection>

      <LazySection minHeight="28rem">
        <div id="features">
          <DeepFeaturesSection />
        </div>
      </LazySection>

      <LazySection minHeight="24rem">
        <FeatureCardsGrid />
      </LazySection>

      <LazySection minHeight="20rem">
        <GuidedSetupSection />
      </LazySection>

      <SetupStepsSection />

      <LazySection minHeight="20rem">
        <TestimonialsSection />
      </LazySection>

      <LazySection minHeight="20rem">
        <div id="faq">
          <FAQSection />
        </div>
      </LazySection>

      <LazySection minHeight="24rem">
        <div id="request-demo">
          <ImplementationSection />
        </div>
      </LazySection>

      <CTASection />
      <MarketingFooter />
    </div>
  );
}
