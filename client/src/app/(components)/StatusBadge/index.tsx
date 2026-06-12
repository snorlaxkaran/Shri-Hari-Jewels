const styles: Record<string, { bg: string; color: string }> = {
  "In Stock": { bg: "#ecfdf5", color: "#059669" },
  "Low Stock": { bg: "#fffbeb", color: "#d97706" },
  "Out of Stock": { bg: "#fef2f2", color: "#dc2626" },
  Pending: { bg: "#fffbeb", color: "#d97706" },
  Processing: { bg: "#eff6ff", color: "#2563eb" },
  Ready: { bg: "#f0f9ff", color: "#0284c7" },
  Delivered: { bg: "#ecfdf5", color: "#059669" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626" },
  Paid: { bg: "#ecfdf5", color: "#059669" },
  Partial: { bg: "#fffbeb", color: "#d97706" },
  Unpaid: { bg: "#fef2f2", color: "#dc2626" },
  Due: { bg: "#fffbeb", color: "#d97706" },
  Overdue: { bg: "#fef2f2", color: "#dc2626" },
  Bronze: { bg: "#fafafa", color: "#71717a" },
  Silver: { bg: "#f4f4f5", color: "#52525b" },
  Gold: { bg: "#fafafa", color: "#52525b" },
  Platinum: { bg: "#f4f4f5", color: "#3f3f46" },
  Available: { bg: "#ecfdf5", color: "#059669" },
  Sold: { bg: "#f4f4f5", color: "#71717a" },
  Reserved: { bg: "#eff6ff", color: "#2563eb" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? { bg: "#f4f4f5", color: "#52525b" };

  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {status}
    </span>
  );
}
