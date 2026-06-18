import { Decimal } from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export const toMoney = (value: Decimal | number | string | null | undefined): Decimal => {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value);
};

export const moneyToNumber = (
  value: Decimal | number | string | null | undefined,
): number => toMoney(value).toNumber();

export const formatMoney = (value: Decimal | number | string): string =>
  toMoney(value).toFixed(2);

export const sumMoney = (
  values: Array<Decimal | number | string>,
): Decimal =>
  values.reduce<Decimal>(
    (sum, v) => sum.plus(toMoney(v)),
    new Decimal(0),
  );

export const subtractMoney = (a: Decimal | number, b: Decimal | number): Decimal =>
  toMoney(a).minus(toMoney(b));

export const multiplyMoney = (a: Decimal | number, b: Decimal | number): Decimal =>
  toMoney(a).times(toMoney(b));
