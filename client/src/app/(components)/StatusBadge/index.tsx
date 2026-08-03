const LABEL_OVERRIDES: Record<string, string> = {
  "In Stock": "Available",
  "Low Stock": "Low stock",
  "Out of Stock": "Unavailable",
  InTransit: "In transit",
  Available: "Available",
  Sold: "Sold",
  Reserved: "Reserved",
  "Set aside": "Set aside",
  Transferred: "Transferred",
  "Needs Hallmark": "Needs hallmark",
  PendingVerification: "Inactive",
  Disbursed: "Awaiting Receipt",
};

const styles: Record<string, { color: string }> = {
  "In Stock": { color: "#1d8102" },
  Available: { color: "#1d8102" },
  "Needs Hallmark": { color: "#b45309" },
  "Low Stock": { color: "#d45b07" },
  "Out of Stock": { color: "#545b64" },
  Pending: { color: "#d45b07" },
  Designing: { color: "var(--color-info)" },
  Production: { color: "var(--color-info)" },
  QC: { color: "var(--color-info)" },
  Processing: { color: "var(--color-info)" },
  Ready: { color: "var(--color-info)" },
  Delivered: { color: "#1d8102" },
  Cancelled: { color: "#d13212" },
  Paid: { color: "#1d8102" },
  Partial: { color: "#d45b07" },
  Unpaid: { color: "#d13212" },
  Due: { color: "#d45b07" },
  Overdue: { color: "#d13212" },
  Bronze: { color: "#545b64" },
  Silver: { color: "#545b64" },
  Gold: { color: "#545b64" },
  Platinum: { color: "#545b64" },
  Sold: { color: "#545b64" },
  Reserved: { color: "var(--color-info)" },
  "Set aside": { color: "#b45309" },
  Transferred: { color: "#545b64" },
  InTransit: { color: "var(--color-info)" },
  PendingVerification: { color: "#545b64" },
  Inactive: { color: "#545b64" },
  Completed: { color: "#1d8102" },
  Create: { color: "#1d8102" },
  Update: { color: "var(--color-info)" },
  Transfer: { color: "var(--color-info)" },
  Adjustment: { color: "#d45b07" },
  Issued: { color: "#545b64" },
  Received: { color: "#d45b07" },
  Estimated: { color: "var(--color-info)" },
  "Awaiting Approval": { color: "#d45b07" },
  Approved: { color: "#1d8102" },
  "In Progress": { color: "var(--color-info)" },
  "Quality Check": { color: "var(--color-info)" },
  "Ready for Pickup": { color: "#1d8102" },
  Rejected: { color: "#d13212" },
  "Partially Paid": { color: "#d45b07" },
  Disbursed: { color: "var(--color-info)" },
  "Receipt Pending": { color: "#d45b07" },
  Settled: { color: "#1d8102" },
  Requested: { color: "#d45b07" },
  Open: { color: "#d45b07" },
  Closed: { color: "#1d8102" },
};

export default function StatusBadge({ status }: { status: string }) {
  const label = LABEL_OVERRIDES[status] ?? status;
  const style = styles[status] ?? styles[label] ?? { color: "#545b64" };

  return (
    <span className="status-indicator" style={{ color: style.color }}>
      <span className="status-dot" style={{ backgroundColor: style.color }} />
      {label}
    </span>
  );
}
