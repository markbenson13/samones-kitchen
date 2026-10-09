export function formatMoney(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

// Accepts a Decimal-like object too (not just number | string) — $queryRaw
// via @prisma/adapter-pg returns NUMERIC/DECIMAL columns as Decimal
// instances, not plain strings the way a non-adapter Prisma Client would.
// Passing one through unconverted (the old `typeof === "string"` check
// treated anything else as already-a-number) let `+=` accumulation silently
// fall back to string concatenation instead of addition — Number() coerces
// all three cases (string, number, Decimal-like) to a real primitive.
export function toNumber(amount: number | string | { toString(): string }): number {
  return Number(amount);
}
