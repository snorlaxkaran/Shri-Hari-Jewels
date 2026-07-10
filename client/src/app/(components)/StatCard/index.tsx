type StatCardProps = {
  label: string;
  value: string;
  change?: number;
  icon?: React.ReactNode;
  alert?: string;
};

export default function StatCard({
  label,
  value,
  change,
  alert,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {change !== undefined && (
          <span style={{ color: isPositive ? "#059669" : "#dc2626", fontSize: 11 }}>
            {isPositive ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
        {alert && (
          <span
            style={{
              fontSize: 10.5,
              color: "#d97706",
              background: "#fffbeb",
              padding: "1px 6px",
              borderRadius: 10,
            }}
          >
            {alert}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
