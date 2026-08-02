import Link from "next/link";

export function CTASection() {
  return (
    <section className="mkt-cta-band">
      <div className="mkt-shell">
        <h2 className="mkt-display text-3xl sm:text-4xl">Ready to run a calmer counter?</h2>
        <p className="max-w-lg mx-auto">
          Verify your mobile once, set your login email in setup, and start managing inventory the
          same day — or request a demo for multi-branch setups.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/onboarding/start" className="mkt-btn mkt-btn-on-dark">
            Start free trial →
          </Link>
          <Link href="#request-demo" className="mkt-btn mkt-btn-outline-on-dark">
            Request demo
          </Link>
        </div>
      </div>
    </section>
  );
}
