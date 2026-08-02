import { AnnouncementBanner } from "./_components/AnnouncementBanner";
import { ComparisonSection } from "./_components/ComparisonSection";
import { CTASection } from "./_components/CTASection";
import { DeepFeaturesSection } from "./_components/DeepFeaturesSection";
import { FAQSection } from "./_components/FAQSection";
import { GuidedSetupSection } from "./_components/GuidedSetupSection";
import { HeroSection } from "./_components/HeroSection";
import { ImplementationSection } from "./_components/ImplementationSection";
import { MarketingFooter } from "./_components/MarketingFooter";
import { MarketingHeader } from "./_components/MarketingHeader";
import { ModuleShowcase } from "./_components/ModuleShowcase";
import { ModuleShowcaseMobile } from "./_components/ModuleShowcaseMobile";
import { SetupStepsSection } from "./_components/SetupStepsSection";
import { SocialProofSection } from "./_components/SocialProofSection";
import { TestimonialsSection } from "./_components/TestimonialsSection";
import { UseCasesSection } from "./_components/UseCasesSection";

export default function OnboardingPortfolioPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7]">
      <AnnouncementBanner />
      <MarketingHeader />
      <HeroSection />
      <SetupStepsSection />
      <SocialProofSection />
      <ModuleShowcase />
      <ModuleShowcaseMobile />
      <DeepFeaturesSection />
      <UseCasesSection />
      <TestimonialsSection />
      <ComparisonSection />
      <GuidedSetupSection />
      <ImplementationSection />
      <FAQSection />
      <CTASection />
      <MarketingFooter />
    </div>
  );
}
