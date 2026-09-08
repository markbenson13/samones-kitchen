// Local calendar date (not UTC) so the date picker defaults to "today" as the
// shop owner sees it, regardless of server timezone.
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Sale/MarketCost `date` values are date-only inputs, stored as UTC midnight
// (`new Date("YYYY-MM-DD")` parses as UTC). Range math/grouping/formatting
// must stay in UTC too, or entries drift to the wrong day for any server
// timezone ahead of UTC.
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatGroupDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${monthDay} — ${weekday}`;
}

export function formatRangeDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Parses a <input type="date"> value (or blank, for a fresh form) into a
// Date, throwing instead of silently producing an Invalid Date if the string
// doesn't parse — a malformed value fails the action clearly (as a toast)
// rather than writing an unparseable date into a row.
export function parseDateInput(dateStr: string): Date {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}
