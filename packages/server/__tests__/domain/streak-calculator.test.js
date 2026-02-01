import { describe, it, expect } from "vitest";
import { calculateStreak } from "../../domain/stats/streak-calculator.js";

describe("Streak Calculator", () => {
  describe("calculateStreak", () => {
    it("should return 0 for empty entries", () => {
      const result = calculateStreak([]);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastEntryDate).toBeNull();
    });

    it("should return 0 for null/undefined", () => {
      expect(calculateStreak(null).currentStreak).toBe(0);
      expect(calculateStreak(undefined).currentStreak).toBe(0);
    });

    it("should calculate single day streak", () => {
      const entries = [{ date: "2024-01-15" }];
      const result = calculateStreak(entries, "2024-01-15");

      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.lastEntryDate).toBe("2024-01-15");
    });

    it("should calculate consecutive days streak", () => {
      const entries = [
        { date: "2024-01-13" },
        { date: "2024-01-14" },
        { date: "2024-01-15" },
      ];
      const result = calculateStreak(entries, "2024-01-15");

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it("should break streak on gap", () => {
      const entries = [
        { date: "2024-01-10" },
        { date: "2024-01-11" },
        // gap on 12
        { date: "2024-01-13" },
        { date: "2024-01-14" },
        { date: "2024-01-15" },
      ];
      const result = calculateStreak(entries, "2024-01-15");

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it("should keep longest streak when current is shorter", () => {
      const entries = [
        { date: "2024-01-01" },
        { date: "2024-01-02" },
        { date: "2024-01-03" },
        { date: "2024-01-04" },
        { date: "2024-01-05" }, // 5 day streak
        // gap
        { date: "2024-01-14" },
        { date: "2024-01-15" }, // 2 day streak
      ];
      const result = calculateStreak(entries, "2024-01-15");

      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(5);
    });

    it("should count streak from yesterday if no entry today", () => {
      const entries = [
        { date: "2024-01-13" },
        { date: "2024-01-14" },
        // no entry on 2024-01-15
      ];
      const result = calculateStreak(entries, "2024-01-15");

      expect(result.currentStreak).toBe(2);
    });

    it("should return 0 current streak if gap before yesterday", () => {
      const entries = [
        { date: "2024-01-10" },
        { date: "2024-01-11" },
        // no entry on 12, 13, 14, 15
      ];
      const result = calculateStreak(entries, "2024-01-15");

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(2);
    });

    it("should handle month boundaries", () => {
      const entries = [
        { date: "2024-01-30" },
        { date: "2024-01-31" },
        { date: "2024-02-01" },
        { date: "2024-02-02" },
      ];
      const result = calculateStreak(entries, "2024-02-02");

      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(4);
    });

    it("should handle year boundaries", () => {
      const entries = [
        { date: "2023-12-30" },
        { date: "2023-12-31" },
        { date: "2024-01-01" },
        { date: "2024-01-02" },
      ];
      const result = calculateStreak(entries, "2024-01-02");

      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(4);
    });

    it("should handle leap year February", () => {
      const entries = [
        { date: "2024-02-28" },
        { date: "2024-02-29" }, // 2024 is a leap year
        { date: "2024-03-01" },
      ];
      const result = calculateStreak(entries, "2024-03-01");

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it("should return last entry date", () => {
      const entries = [
        { date: "2024-01-10" },
        { date: "2024-01-15" },
      ];
      const result = calculateStreak(entries, "2024-01-20");

      expect(result.lastEntryDate).toBe("2024-01-15");
    });
  });
});
