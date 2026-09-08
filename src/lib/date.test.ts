import { describe, expect, it } from "vitest";
import {
  toDateInputValue,
  utcDateKey,
  formatGroupDate,
  formatRangeDate,
  parseDateInput,
} from "./date";

describe("toDateInputValue", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    // Constructed from explicit parts (not a UTC ISO string) so this reads
    // the same local Y/M/D on any machine running the test, regardless of
    // that machine's own timezone offset.
    const date = new Date(2026, 0, 5); // Jan 5, 2026, local time
    expect(toDateInputValue(date)).toBe("2026-01-05");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 8, 8);
    expect(toDateInputValue(date)).toBe("2026-09-08");
  });
});

describe("utcDateKey", () => {
  it("formats a date-only value (parsed as UTC midnight) as YYYY-MM-DD", () => {
    expect(utcDateKey(new Date("2026-03-15"))).toBe("2026-03-15");
  });
});

describe("formatGroupDate", () => {
  it("renders month, day, and weekday in UTC", () => {
    // 2026-03-15 is a Sunday.
    expect(formatGroupDate(new Date("2026-03-15"))).toBe(
      "March 15 — Sunday"
    );
  });
});

describe("formatRangeDate", () => {
  it("renders a short month/day/year in UTC", () => {
    expect(formatRangeDate(new Date("2026-03-15"))).toBe("Mar 15, 2026");
  });
});

describe("parseDateInput", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    const parsed = parseDateInput("2026-03-15");
    expect(utcDateKey(parsed)).toBe("2026-03-15");
  });

  it("defaults to now when given an empty string", () => {
    const before = Date.now();
    const parsed = parseDateInput("");
    const after = Date.now();
    expect(parsed.getTime()).toBeGreaterThanOrEqual(before);
    expect(parsed.getTime()).toBeLessThanOrEqual(after);
  });

  it("throws on an unparseable date string", () => {
    expect(() => parseDateInput("not-a-date")).toThrow("Invalid date");
  });
});
