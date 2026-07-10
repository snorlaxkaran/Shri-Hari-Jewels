import type { StockTransferStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  StockTransferStatus,
  { label: string; className: string }
> = {
  Pending: {
    label: "Awaiting Receipt",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  Accepted: {
    label: "Received",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  PartiallyAccepted: {
    label: "Partially Received",
    className: "bg-yellow-50 text-yellow-800 border-yellow-200",
  },
};

export default function TransferStatusBadge({
  status,
}: {
  status: StockTransferStatus;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
