import { TrendingDown, TrendingUp } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  alert?: string;
};

export default function StatCard({
  label,
  value,
  change,
  icon,
  alert,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-zinc-100 text-zinc-600">{icon}</div>
        {change !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              isPositive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(change)}%
          </span>
        )}
        {alert && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            {alert}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-zinc-900 tracking-tight">
        {value}
      </p>
      <p className="text-xs mt-1 text-zinc-400">{label}</p>
    </div>
  );
}
