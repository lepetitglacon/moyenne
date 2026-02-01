import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStatsService } from "../../application/stats.service.js";
import { NotFoundError } from "../../shared/errors.js";

describe("Stats Service", () => {
  let statsService;
  let mockUserRepo;
  let mockEntryRepo;
  let mockRatingRepo;
  let mockLogger;

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      findByUsername: vi.fn(),
      listAll: vi.fn(),
    };

    mockEntryRepo = {
      getLastByUser: vi.fn(),
      findByUserAndDate: vi.fn(),
      countByUser: vi.fn(),
      getAvgByUserAndRange: vi.fn(),
      listByUserAndRange: vi.fn(),
      listByDateWithUsers: vi.fn(),
    };

    mockRatingRepo = {
      countByDate: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };

    statsService = createStatsService({
      userRepo: mockUserRepo,
      entryRepo: mockEntryRepo,
      ratingRepo: mockRatingRepo,
      logger: mockLogger,
    });
  });

  describe("getMyStats", () => {
    it("should return stats for user", () => {
      mockEntryRepo.getLastByUser.mockReturnValue({
        date: "2024-01-15",
        rating: 15,
        description: "Good day",
      });
      mockEntryRepo.findByUserAndDate.mockReturnValue({
        date: "2024-01-15",
        rating: 15,
        description: "Good day",
      });
      mockEntryRepo.countByUser.mockReturnValue(10);
      mockEntryRepo.getAvgByUserAndRange.mockReturnValue(14.5);
      mockEntryRepo.listByUserAndRange.mockReturnValue([
        { date: "2024-01-10", rating: 14 },
        { date: "2024-01-15", rating: 15 },
      ]);

      const result = statsService.getMyStats({ userId: 1, month: "2024-01" });

      expect(result.today).toBeDefined();
      expect(result.monthStart).toBe("2024-01-01");
      expect(result.monthEnd).toBe("2024-01-31");
      expect(result.lastEntry).toBeDefined();
      expect(result.participationCount).toBe(10);
      expect(result.currentMonthAvg).toBe(14.5);
      expect(result.monthEntries).toHaveLength(2);
    });

    it("should handle null entries", () => {
      mockEntryRepo.getLastByUser.mockReturnValue(undefined);
      mockEntryRepo.findByUserAndDate.mockReturnValue(undefined);
      mockEntryRepo.countByUser.mockReturnValue(0);
      mockEntryRepo.getAvgByUserAndRange.mockReturnValue(null);
      mockEntryRepo.listByUserAndRange.mockReturnValue([]);

      const result = statsService.getMyStats({ userId: 1 });

      expect(result.lastEntry).toBeNull();
      expect(result.todayEntry).toBeNull();
      expect(result.participationCount).toBe(0);
      expect(result.currentMonthAvg).toBeNull();
      expect(result.monthEntries).toEqual([]);
    });
  });

  describe("getUserStats", () => {
    it("should return stats for another user", () => {
      mockUserRepo.findById.mockReturnValue({ id: 2, username: "otheruser" });
      mockEntryRepo.getLastByUser.mockReturnValue(null);
      mockEntryRepo.findByUserAndDate.mockReturnValue(null);
      mockEntryRepo.countByUser.mockReturnValue(5);
      mockEntryRepo.getAvgByUserAndRange.mockReturnValue(12.0);
      mockEntryRepo.listByUserAndRange.mockReturnValue([]);

      const result = statsService.getUserStats({ userId: 2, month: "2024-01" });

      expect(result.user.id).toBe(2);
      expect(result.user.username).toBe("otheruser");
      expect(result.participationCount).toBe(5);
    });

    it("should throw NotFoundError for non-existent user", () => {
      mockUserRepo.findById.mockReturnValue(undefined);

      expect(() => {
        statsService.getUserStats({ userId: 999 });
      }).toThrow(NotFoundError);
    });
  });

  describe("getRecap", () => {
    it("should calculate recap stats", () => {
      const entries = [
        { username: "alice", rating: 20, description: "Great!" },
        { username: "bob", rating: 15, description: "OK" },
        { username: "charlie", rating: 10, description: "Meh" },
      ];
      mockEntryRepo.listByDateWithUsers.mockReturnValue(entries);
      mockRatingRepo.countByDate.mockReturnValue(5);

      const result = statsService.getRecap({ date: "2024-01-15" });

      expect(result.date).toBe("2024-01-15");
      expect(result.participantCount).toBe(3);
      expect(result.avgRating).toBe(15);
      expect(result.top3).toHaveLength(3);
      expect(result.ratingsGiven).toBe(5);
    });

    it("should use today when no date provided", () => {
      mockEntryRepo.listByDateWithUsers.mockReturnValue([]);
      mockRatingRepo.countByDate.mockReturnValue(0);

      const result = statsService.getRecap();

      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.participantCount).toBe(0);
    });

    it("should handle empty recap", () => {
      mockEntryRepo.listByDateWithUsers.mockReturnValue([]);
      mockRatingRepo.countByDate.mockReturnValue(0);

      const result = statsService.getRecap({ date: "2024-01-15" });

      expect(result.participantCount).toBe(0);
      expect(result.avgRating).toBe(0);
      expect(result.top3).toEqual([]);
      expect(result.ratingsGiven).toBe(0);
    });
  });

  describe("listUsers", () => {
    it("should return all users", () => {
      mockUserRepo.listAll.mockReturnValue([
        { id: 1, username: "alice" },
        { id: 2, username: "bob" },
      ]);

      const result = statsService.listUsers();

      expect(result).toHaveLength(2);
      expect(mockUserRepo.listAll).toHaveBeenCalled();
    });
  });

  describe("checkUserExists", () => {
    it("should return true for existing user", () => {
      mockUserRepo.findByUsername.mockReturnValue({
        id: 1,
        username: "testuser",
      });

      const result = statsService.checkUserExists({ username: "testuser" });

      expect(result.exists).toBe(true);
      expect(result.user.username).toBe("testuser");
    });

    it("should return false for non-existent user", () => {
      mockUserRepo.findByUsername.mockReturnValue(undefined);

      const result = statsService.checkUserExists({ username: "nonexistent" });

      expect(result.exists).toBe(false);
      expect(result.user).toBeNull();
    });
  });
});
