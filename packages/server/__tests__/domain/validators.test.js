import { describe, it, expect } from "vitest";
import {
  validateTimeFormat,
  timeToCron,
} from "../../domain/validators/time.validator.js";
import {
  validateRating,
  validateEntry,
  RATING_MIN,
  RATING_MAX,
} from "../../domain/validators/entry.validator.js";
import {
  validateCredentials,
  validateUserId,
} from "../../domain/validators/user.validator.js";

describe("Validators", () => {
  describe("Time Validator", () => {
    describe("validateTimeFormat", () => {
      it("should accept valid HH:MM format", () => {
        expect(validateTimeFormat("23:30")).toEqual({
          valid: true,
          error: null,
          normalized: "23:30",
        });
      });

      it("should accept and normalize single-digit hours", () => {
        expect(validateTimeFormat("9:30")).toEqual({
          valid: true,
          error: null,
          normalized: "09:30",
        });
      });

      it("should accept midnight", () => {
        expect(validateTimeFormat("00:00")).toEqual({
          valid: true,
          error: null,
          normalized: "00:00",
        });
      });

      it("should accept 23:59", () => {
        expect(validateTimeFormat("23:59")).toEqual({
          valid: true,
          error: null,
          normalized: "23:59",
        });
      });

      it("should reject invalid hour (24+)", () => {
        const result = validateTimeFormat("24:00");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid time format");
      });

      it("should reject invalid minutes (60+)", () => {
        const result = validateTimeFormat("23:60");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid time format");
      });

      it("should reject wrong format", () => {
        expect(validateTimeFormat("2330").valid).toBe(false);
        expect(validateTimeFormat("23-30").valid).toBe(false);
        expect(validateTimeFormat("23:30:00").valid).toBe(false);
      });

      it("should reject null/undefined", () => {
        expect(validateTimeFormat(null).valid).toBe(false);
        expect(validateTimeFormat(null).error).toBe("Time is required");
        expect(validateTimeFormat(undefined).valid).toBe(false);
      });

      it("should reject empty string", () => {
        expect(validateTimeFormat("").valid).toBe(false);
      });
    });

    describe("timeToCron", () => {
      it("should convert HH:MM to cron expression", () => {
        expect(timeToCron("23:30")).toBe("30 23 * * *");
        expect(timeToCron("09:00")).toBe("00 09 * * *");
        expect(timeToCron("00:00")).toBe("00 00 * * *");
      });
    });
  });

  describe("Entry Validator", () => {
    describe("validateRating", () => {
      it("should accept valid ratings (0-20)", () => {
        expect(validateRating(0).valid).toBe(true);
        expect(validateRating(10).valid).toBe(true);
        expect(validateRating(20).valid).toBe(true);
      });

      it("should reject ratings below minimum", () => {
        const result = validateRating(-1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(`between ${RATING_MIN} and ${RATING_MAX}`);
      });

      it("should reject ratings above maximum", () => {
        const result = validateRating(21);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(`between ${RATING_MIN} and ${RATING_MAX}`);
      });

      it("should reject non-integer ratings", () => {
        const result = validateRating(10.5);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Rating must be an integer");
      });

      it("should reject null/undefined", () => {
        expect(validateRating(null).valid).toBe(false);
        expect(validateRating(null).error).toBe("Rating is required");
        expect(validateRating(undefined).valid).toBe(false);
      });

      it("should reject non-numeric values", () => {
        const result = validateRating("ten");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Rating must be a number");
      });

      it("should accept numeric strings", () => {
        expect(validateRating("10").valid).toBe(true);
      });

      it("should reject NaN", () => {
        expect(validateRating(NaN).valid).toBe(false);
      });

      it("should reject Infinity", () => {
        expect(validateRating(Infinity).valid).toBe(false);
      });
    });

    describe("validateEntry", () => {
      it("should accept valid entry", () => {
        const result = validateEntry({ rating: 15, description: "Good day" });
        expect(result.valid).toBe(true);
      });

      it("should accept entry without description", () => {
        const result = validateEntry({ rating: 15 });
        expect(result.valid).toBe(true);
      });

      it("should reject null entry", () => {
        const result = validateEntry(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Entry is required");
      });

      it("should reject entry with invalid rating", () => {
        const result = validateEntry({ rating: 25 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("between");
      });
    });
  });

  describe("User Validator", () => {
    describe("validateCredentials", () => {
      it("should accept valid credentials", () => {
        const result = validateCredentials({
          username: "testuser",
          password: "password123",
        });
        expect(result.valid).toBe(true);
      });

      it("should reject missing username", () => {
        const result = validateCredentials({ password: "password123" });
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Username and password required");
      });

      it("should reject missing password", () => {
        const result = validateCredentials({ username: "testuser" });
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Username and password required");
      });

      it("should reject empty username", () => {
        const result = validateCredentials({ username: "", password: "pass" });
        expect(result.valid).toBe(false);
      });

      it("should reject whitespace-only username", () => {
        const result = validateCredentials({ username: "   ", password: "pass" });
        expect(result.valid).toBe(false);
      });

      it("should reject null credentials", () => {
        const result = validateCredentials(null);
        expect(result.valid).toBe(false);
      });

      it("should reject undefined credentials", () => {
        const result = validateCredentials(undefined);
        expect(result.valid).toBe(false);
      });
    });

    describe("validateUserId", () => {
      it("should accept valid positive integer", () => {
        expect(validateUserId(1).valid).toBe(true);
        expect(validateUserId(100).valid).toBe(true);
      });

      it("should accept numeric string", () => {
        expect(validateUserId("1").valid).toBe(true);
        expect(validateUserId("100").valid).toBe(true);
      });

      it("should reject zero", () => {
        const result = validateUserId(0);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid user id");
      });

      it("should reject negative numbers", () => {
        const result = validateUserId(-1);
        expect(result.valid).toBe(false);
      });

      it("should reject non-integers", () => {
        const result = validateUserId(1.5);
        expect(result.valid).toBe(false);
      });

      it("should reject non-numeric strings", () => {
        const result = validateUserId("abc");
        expect(result.valid).toBe(false);
      });

      it("should reject NaN", () => {
        expect(validateUserId(NaN).valid).toBe(false);
      });

      it("should reject Infinity", () => {
        expect(validateUserId(Infinity).valid).toBe(false);
      });
    });
  });
});
