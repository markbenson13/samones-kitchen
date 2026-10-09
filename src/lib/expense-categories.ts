export const EXPENSE_CATEGORIES = [
  "Gas/Fuel",
  "Packaging",
  "Transportation",
  "Supplies/Equipment",
  "Utilities",
  "Marketing",
  "Withdrawal",
  "Personal Use",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Money leaving the business for the owner, not a cost of running it — kept
// out of "Total expenses"/"Available income" on the Expenses and Dashboard
// pages, since that money was already earned; a withdrawal just moves it
// out, it doesn't reduce what the business made.
export const OWNER_DRAW_CATEGORIES: readonly ExpenseCategory[] = [
  "Withdrawal",
  "Personal Use",
];

export function isOperatingCategory(category: string): boolean {
  return !(OWNER_DRAW_CATEGORIES as readonly string[]).includes(category);
}
