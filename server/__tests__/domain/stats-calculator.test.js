import { describe, it, expect } from "vitest";
import {
  calculateAverage,
  getTopN,
  calculateRecapStats,
  normalizeDbAverage,
} from "../../domain/stats/stats-calculator.js";

describe("Stats Calculator", () => {
  describe("calculateAverage", () => {
    it("should calculate average correctly", () => {
      const entries = [
        { rating: 10 },
        { rating: 15 },
        { rating: 20 },
      ];
      expect(calculateAverage(entries)).toBe(15);
    });

    it("should round to 1 decimal place", () => {
      const entries = [
        { rating: 10 },
        { rating: 11 },
        { rating: 12 },
      ];
      // (10 + 11 + 12) / 3 = 11
      expect(calculateAverage(entries)).toBe(11);
    });

    it("should handle decimal averages", () => {
      const entries = [
        { rating: 10 },
        { rating: 11 },
      ];
      // (10 + 11) / 2 = 10.5
      expect(calculateAverage(entries)).toBe(10.5);
    });

    it("should return 0 for empty array", () => {
      expect(calculateAverage([])).toBe(0);
    });

    it("should return 0 for null/undefined", () => {
      expect(calculateAverage(null)).toBe(0);
      expect(calculateAverage(undefined)).toBe(0);
    });

    it("should handle single entry", () => {
      const entries = [{ rating: 15 }];
      expect(calculateAverage(entries)).toBe(15);
    });

    it("should handle entries with 0 rating", () => {
      const entries = [
        { rating: 0 },
        { rating: 10 },
      ];
      expect(calculateAverage(entries)).toBe(5);
    });

    it("should handle entries with null/undefined rating as 0", () => {
      const entries = [
        { rating: null },
        { rating: 10 },
      ];
      expect(calculateAverage(entries)).toBe(5);
    });
  });

  describe("getTopN", () => {
    const entries = [
      { username: "alice", rating: 20, description: "Great day!" },
      { username: "bob", rating: 18, description: "Good day" },
      { username: "charlie", rating: 15, description: null },
      { username: "david", rating: 10, description: "Meh" },
    ];

    it("should return top 3 by default", () => {
      const top = getTopN(entries);
      expect(top).toHaveLength(3);
      expect(top[0].username).toBe("alice");
      expect(top[1].username).toBe("bob");
      expect(top[2].username).toBe("charlie");
    });

    it("should return correct structure", () => {
      const top = getTopN(entries, 1);
      expect(top[0]).toEqual({
        username: "alice",
        rating: 20,
        description: "Great day!",
      });
    });

    it("should handle null description", () => {
      const top = getTopN(entries, 3);
      expect(top[2].description).toBeNull();
    });

    it("should return all entries if n > length", () => {
      const top = getTopN(entries, 10);
      expect(top).toHaveLength(4);
    });

    it("should return empty array for empty input", () => {
      expect(getTopN([])).toEqual([]);
      expect(getTopN(null)).toEqual([]);
      expect(getTopN(undefined)).toEqual([]);
    });

    it("should handle custom n value", () => {
      const top = getTopN(entries, 2);
      expect(top).toHaveLength(2);
    });
  });

  describe("calculateRecapStats", () => {
    it("should calculate complete recap stats", () => {
      const entries = [
        { username: "alice", rating: 20, description: "Great!" },
        { username: "bob", rating: 15, description: "OK" },
        { username: "charlie", rating: 10, description: "Meh" },
      ];

      const stats = calculateRecapStats(entries, 5);

      expect(stats.participantCount).toBe(3);
      expect(stats.avgRating).toBe(15);
      expect(stats.top3).toHaveLength(3);
      expect(stats.ratingsGiven).toBe(5);
    });

    it("should handle empty entries", () => {
      const stats = calculateRecapStats([], 0);

      expect(stats.participantCount).toBe(0);
      expect(stats.avgRating).toBe(0);
      expect(stats.top3).toEqual([]);
      expect(stats.ratingsGiven).toBe(0);
    });

    it("should handle null/undefined entries", () => {
      const stats = calculateRecapStats(null, 0);

      expect(stats.participantCount).toBe(0);
      expect(stats.avgRating).toBe(0);
      expect(stats.top3).toEqual([]);
    });

    it("should default ratingsGiven to 0", () => {
      const stats = calculateRecapStats([]);
      expect(stats.ratingsGiven).toBe(0);
    });
  });

  describe("normalizeDbAverage", () => {
    it("should round to 1 decimal", () => {
      expect(normalizeDbAverage(15.666)).toBe(15.7);
      expect(normalizeDbAverage(15.333)).toBe(15.3);
    });

    it("should return null for null input", () => {
      expect(normalizeDbAverage(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(normalizeDbAverage(undefined)).toBeNull();
    });

    it("should handle integers", () => {
      expect(normalizeDbAverage(15)).toBe(15);
    });

    it("should handle 0", () => {
      expect(normalizeDbAverage(0)).toBe(0);
    });
  });
});
