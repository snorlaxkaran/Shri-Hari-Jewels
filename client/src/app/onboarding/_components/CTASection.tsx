import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-[#171717] text-white">
      <div className="erp-marketing-shell py-20 text-center">
        <h2 className="text-2xl sm:text-4xl font-semibold">Ready to run a calmer counter?</h2>
        <p className="mt-3 text-[#a3a3a3] max-w-lg mx-auto">
          Verify your mobile once, set your login email in setup, and start managing inventory the
          same day — or request a demo for multi-branch setups.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/onboarding/start"
            className="inline-flex rounded-md bg-[#e74c3c] hover:bg-[#cf4436] text-white px-8 py-3 text-sm font-semibold transition-colors"
          >
            Start free trial →
          </Link>
          <Link
            href="#request-demo"
            className="inline-flex rounded-md border border-[#525252] hover:border-[#a3a3a3] text-white px-8 py-3 text-sm font-semibold transition-colors"
          >
            Request demo
          </Link>
        </div>
      </div>
    </section>
  );
}
