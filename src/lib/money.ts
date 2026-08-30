export function formatMoney(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export function toNumber(amount: number | string): number {
  return typeof amount === "string" ? parseFloat(amount) : amount;
}
