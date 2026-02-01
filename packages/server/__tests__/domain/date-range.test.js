import { describe, it, expect } from "vitest";
import {
  getMonthRange,
  getToday,
  isValidDateFormat,
  isValidMonthFormat,
} from "../../domain/stats/date-range.js";

describe("Date Range Helpers", () => {
  describe("getMonthRange", () => {
    it("should parse YYYY-MM format correctly", () => {
      const { monthStart, monthEnd } = getMonthRange("2024-02");
      expect(monthStart).toBe("2024-02-01");
      expect(monthEnd).toBe("2024-02-29"); // 2024 is a leap year
    });

    it("should handle non-leap year February", () => {
      const { monthStart, monthEnd } = getMonthRange("2023-02");
      expect(monthStart).toBe("2023-02-01");
      expect(monthEnd).toBe("2023-02-28");
    });

    it("should handle months with 31 days", () => {
      const { monthStart, monthEnd } = getMonthRange("2024-01");
      expect(monthStart).toBe("2024-01-01");
      expect(monthEnd).toBe("2024-01-31");
    });

    it("should handle months with 30 days", () => {
      const { monthStart, monthEnd } = getMonthRange("2024-04");
      expect(monthStart).toBe("2024-04-01");
      expect(monthEnd).toBe("2024-04-30");
    });

    it("should use current month when no param provided", () => {
      const referenceDate = new Date(2024, 5, 15); // June 15, 2024
      const { monthStart, monthEnd } = getMonthRange(null, referenceDate);
      expect(monthStart).toBe("2024-06-01");
      expect(monthEnd).toBe("2024-06-30");
    });

    it("should use current month for invalid format", () => {
      const referenceDate = new Date(2024, 0, 15); // Jan 15, 2024
      const { monthStart, monthEnd } = getMonthRange("invalid", referenceDate);
      expect(monthStart).toBe("2024-01-01");
      expect(monthEnd).toBe("2024-01-31");
    });

    it("should use current month for partial format", () => {
      const referenceDate = new Date(2024, 0, 15);
      const { monthStart, monthEnd } = getMonthRange("2024", referenceDate);
      expect(monthStart).toBe("2024-01-01");
    });

    it("should handle December correctly (year boundary)", () => {
      const { monthStart, monthEnd } = getMonthRange("2024-12");
      expect(monthStart).toBe("2024-12-01");
      expect(monthEnd).toBe("2024-12-31");
    });

    it("should pad single-digit months", () => {
      const { monthStart } = getMonthRange("2024-01");
      expect(monthStart).toBe("2024-01-01");
    });
  });

  describe("getToday", () => {
    it("should return YYYY-MM-DD format", () => {
      const today = getToday(new Date(2024, 5, 15)); // June 15, 2024
      expect(today).toBe("2024-06-15");
    });

    it("should pad single-digit days and months", () => {
      const today = getToday(new Date(2024, 0, 5)); // Jan 5, 2024
      expect(today).toBe("2024-01-05");
    });

    it("should use current date when no param", () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isValidDateFormat", () => {
    it("should accept valid YYYY-MM-DD format", () => {
      expect(isValidDateFormat("2024-01-15")).toBe(true);
      expect(isValidDateFormat("2024-12-31")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidDateFormat("2024-1-15")).toBe(false);
      expect(isValidDateFormat("24-01-15")).toBe(false);
      expect(isValidDateFormat("2024/01/15")).toBe(false);
      expect(isValidDateFormat("15-01-2024")).toBe(false);
    });

    it("should reject null/undefined/empty", () => {
      expect(isValidDateFormat(null)).toBe(false);
      expect(isValidDateFormat(undefined)).toBe(false);
      expect(isValidDateFormat("")).toBe(false);
    });

    it("should reject non-strings", () => {
      expect(isValidDateFormat(20240115)).toBe(false);
      expect(isValidDateFormat({})).toBe(false);
    });
  });

  describe("isValidMonthFormat", () => {
    it("should accept valid YYYY-MM format", () => {
      expect(isValidMonthFormat("2024-01")).toBe(true);
      expect(isValidMonthFormat("2024-12")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidMonthFormat("2024-1")).toBe(false);
      expect(isValidMonthFormat("24-01")).toBe(false);
      expect(isValidMonthFormat("2024/01")).toBe(false);
      expect(isValidMonthFormat("2024-01-01")).toBe(false);
    });

    it("should reject null/undefined/empty", () => {
      expect(isValidMonthFormat(null)).toBe(false);
      expect(isValidMonthFormat(undefined)).toBe(false);
      expect(isValidMonthFormat("")).toBe(false);
    });
  });
});
