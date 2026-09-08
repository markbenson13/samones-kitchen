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
});
