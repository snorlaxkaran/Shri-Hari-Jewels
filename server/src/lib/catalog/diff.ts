export type FieldDiff = {
  field: string;
  from: unknown;
  to: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null && !Array.isArray(value);

export const diffValues = (
  previous: unknown,
  next: unknown,
): FieldDiff[] => {
  const prev =
    typeof previous === "string"
      ? (JSON.parse(previous) as unknown)
      : previous;
  const nxt =
    typeof next === "string" ? (JSON.parse(next) as unknown) : next;

  if (!isPlainObject(prev) || !isPlainObject(nxt)) {
    if (JSON.stringify(prev) === JSON.stringify(nxt)) return [];
    return [{ field: "value", from: prev, to: nxt }];
  }

  const keys = new Set([...Object.keys(prev), ...Object.keys(nxt)]);
  const diffs: FieldDiff[] = [];

  for (const field of keys) {
    const from = prev[field];
    const to = nxt[field];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diffs.push({ field, from, to });
    }
  }

  return diffs;
};
