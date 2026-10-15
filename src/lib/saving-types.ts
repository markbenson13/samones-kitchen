export const SAVING_TYPES = ["Deposit", "Withdrawal"] as const;

export type SavingType = (typeof SAVING_TYPES)[number];
