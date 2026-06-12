import numeral from "numeral";

export const formatCurrency = (amount: number) =>
  `₹${numeral(amount).format("0,0")}`;

export const formatCompact = (amount: number) =>
  `₹${numeral(amount).format("0.0a").toUpperCase()}`;

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
