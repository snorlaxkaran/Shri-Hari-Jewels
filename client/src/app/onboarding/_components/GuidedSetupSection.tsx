import { GUIDED_SETUP } from "@/lib/onboarding/marketing-content";

export function GuidedSetupSection() {
  return (
    <section className="py-16 lg:py-20 bg-[#f4f5f7] border-y border-[#e5e7eb]">
      <div className="erp-marketing-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            Guided onboarding
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold">Checklists inside every workspace</h2>
          <p className="mt-3 text-[#525252]">
            Not sure where to start? Each module opens with a step-by-step checklist — add your first
            SKU, bill a sale, or start a production run without reading a manual.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {GUIDED_SETUP.map((ws) => (
            <div key={ws.title} className="erp-marketing-card">
              <h3 className="font-semibold">{ws.title}</h3>
              <ol className="mt-4 space-y-2">
                {ws.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-[#404040]">
                    <span className="inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-xs font-semibold text-[#6b7280]">
                      {i + 1}
                    </span>
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
