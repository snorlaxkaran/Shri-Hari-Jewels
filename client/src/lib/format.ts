const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const trimDecimals = (value: string) => value.replace(/\.?0+$/, "");

/** Indian Rupee — e.g. ₹2,85,000 */
export const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) return inrFormatter.format(0);
  return inrFormatter.format(amount);
};

/** Compact INR — e.g. ₹4.2 L, ₹1.25 Cr */
export const formatCompact = (amount: number) => {
  if (!Number.isFinite(amount)) return inrFormatter.format(0);

  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_00_00_000) {
    return `${sign}₹${trimDecimals((abs / 1_00_00_000).toFixed(2))} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${trimDecimals((abs / 1_00_000).toFixed(2))} L`;
  }
  return formatCurrency(amount);
};

/** Chart Y-axis labels in Indian units */
export const formatChartAxis = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(abs / 1_00_00_000).toFixed(1)} Cr`;
  if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(0)} L`;
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(0)} K`;
  return formatCurrency(abs);
};

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const formatNumber = (value: number, decimals = 2) => {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/** Round to 2 decimal places for currency fields (avoids float drift in POS). */
export const roundMoney = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export const parseMoneyInput = (raw: string): number => {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return 0;
  return roundMoney(parsed);
};
