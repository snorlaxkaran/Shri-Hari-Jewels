import { GUIDED_SETUP } from "@/lib/onboarding/marketing-content";

export function GuidedSetupSection() {
  return (
    <section className="mkt-section">
      <div className="mkt-shell-wide">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="mkt-eyebrow mb-3">Guided onboarding</p>
          <h2 className="mkt-display text-2xl sm:text-4xl">Checklists inside every workspace</h2>
          <p className="mkt-section-desc mt-3">
            Not sure where to start? Each module opens with a step-by-step checklist — add your first
            SKU, bill a sale, or start a production run without reading a manual.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {GUIDED_SETUP.map((ws) => (
            <div key={ws.title} className="mkt-card">
              <h3 className="font-semibold">{ws.title}</h3>
              <ol className="mt-4 space-y-2">
                {ws.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm mkt-text-secondary">
                    <span className="mkt-step-num">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
