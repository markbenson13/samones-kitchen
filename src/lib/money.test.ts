import { describe, expect, it } from "vitest";
import { formatMoney, toNumber } from "./money";

describe("formatMoney", () => {
  it("formats a number as PHP currency", () => {
    expect(formatMoney(1234.5)).toBe("₱1,234.50");
  });

  it("formats a numeric string the same way", () => {
    expect(formatMoney("1234.5")).toBe("₱1,234.50");
  });

  it("formats zero and negative amounts", () => {
    expect(formatMoney(0)).toBe("₱0.00");
    expect(formatMoney(-50)).toBe("-₱50.00");
  });
});

describe("toNumber", () => {
  it("passes a number through unchanged", () => {
    expect(toNumber(42.5)).toBe(42.5);
  });

  it("parses a numeric string", () => {
    expect(toNumber("42.50")).toBe(42.5);
  });

  // $queryRaw via @prisma/adapter-pg returns NUMERIC/DECIMAL columns as
  // Decimal instances, not plain strings — a prior version of this function
  // only special-cased `typeof === "string"` and returned anything else
  // (including a Decimal object) unconverted, which then silently became
  // string concatenation instead of addition the moment it was accumulated
  // with `+=`. This stands in for that shape without importing Prisma.
  it("converts a Decimal-like object (via its own toString)", () => {
    const decimalLike = { toString: () => "42.50" };
    const result = toNumber(decimalLike);
    expect(result).toBe(42.5);
    expect(typeof result).toBe("number");
  });

  it("accumulates Decimal-like values correctly with +=, not as string concatenation", () => {
    const rows = [{ toString: () => "100" }, { toString: () => "25" }, { toString: () => "5" }];
    let total = 0;
    for (const row of rows) total += toNumber(row);
    expect(total).toBe(130);
  });
});
