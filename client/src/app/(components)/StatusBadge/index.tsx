const LABEL_OVERRIDES: Record<string, string> = {
  "In Stock": "Available",
  "Low Stock": "Low stock",
  "Out of Stock": "Unavailable",
  InTransit: "In transit",
  Available: "Available",
  Sold: "Sold",
  Reserved: "Reserved",
  Transferred: "Transferred",
  PendingVerification: "Inactive",
};

const styles: Record<string, { color: string }> = {
  "In Stock": { color: "#1d8102" },
  Available: { color: "#1d8102" },
  "Low Stock": { color: "#d45b07" },
  "Out of Stock": { color: "#545b64" },
  Pending: { color: "#d45b07" },
  Designing: { color: "#0073bb" },
  Production: { color: "#0073bb" },
  QC: { color: "#0073bb" },
  Processing: { color: "#0073bb" },
  Ready: { color: "#0073bb" },
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
  Reserved: { color: "#0073bb" },
  Transferred: { color: "#545b64" },
  InTransit: { color: "#0073bb" },
  PendingVerification: { color: "#545b64" },
  Inactive: { color: "#545b64" },
  Completed: { color: "#1d8102" },
  Create: { color: "#1d8102" },
  Update: { color: "#0073bb" },
  Transfer: { color: "#0073bb" },
  Adjustment: { color: "#d45b07" },
  Issued: { color: "#545b64" },
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
