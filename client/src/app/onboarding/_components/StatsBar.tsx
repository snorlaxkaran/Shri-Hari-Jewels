import { STATS } from "@/lib/onboarding/marketing-content";

export function StatsBar() {
  return (
    <section className="mkt-stats" aria-label="Platform highlights">
      <div className="mkt-shell">
        <p className="mkt-eyebrow text-center mb-6">Built for Indian jewellers</p>
        <div className="mkt-stats-grid">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="mkt-stat-value">{stat.value}</p>
              <p className="mkt-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
