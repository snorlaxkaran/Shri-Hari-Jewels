import Link from "next/link";

const STEPS = [
  {
    n: "1",
    title: "Verify mobile (once)",
    desc: "One-time OTP on SMS — takes under a minute.",
  },
  {
    n: "2",
    title: "Choose login email & password",
    desc: "Set credentials in setup — no extra verification.",
  },
  {
    n: "3",
    title: "Run the counter",
    desc: "Guided checklists inside each workspace.",
  },
];

export function SetupStepsSection() {
  return (
    <section className="mkt-section mkt-section-alt">
      <div className="mkt-shell-wide">
        <h2 className="mkt-display text-2xl sm:text-3xl text-center mb-10">Get started in minutes</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="mkt-card">
              <span className="mkt-step-badge">{step.n}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm mkt-text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link href="/onboarding/start" className="mkt-link">
            Start free trial →
          </Link>
        </p>
      </div>
    </section>
  );
}
