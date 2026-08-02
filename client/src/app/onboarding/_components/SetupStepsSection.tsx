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
    <section className="erp-marketing-shell py-16">
      <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-10">Get started in minutes</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {STEPS.map((step) => (
          <div key={step.n} className="erp-marketing-card">
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#e74c3c] text-white text-sm font-semibold">
              {step.n}
            </span>
            <h3 className="mt-4 font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-[#525252] leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
      <p className="text-center mt-8">
        <Link href="/onboarding/start" className="text-sm font-semibold text-[#e74c3c] hover:underline">
          Start free trial →
        </Link>
      </p>
    </section>
  );
}
