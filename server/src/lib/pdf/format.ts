export const formatRupee = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDateIn = (value?: string | null): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN");
};

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (num: number): string => {
  if (num < 20) return ones[num];
  const t = Math.floor(num / 10);
  const o = num % 10;
  return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
};

const threeDigits = (num: number): string => {
  if (num < 100) return twoDigits(num);
  const h = Math.floor(num / 100);
  const rest = num % 100;
  return `${ones[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ""}`;
};

export const amountInIndianWords = (amount: number): string => {
  const rounded = Math.round(Math.abs(amount));
  if (rounded === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  let remaining = rounded;

  const crore = Math.floor(remaining / 10_000_000);
  remaining %= 10_000_000;
  const lakh = Math.floor(remaining / 100_000);
  remaining %= 100_000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remaining) parts.push(threeDigits(remaining));

  return `${parts.join(" ")} Rupees Only`;
};
