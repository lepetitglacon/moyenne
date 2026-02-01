import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthService } from "../../application/auth.service.js";
import { ValidationError, AuthError, ConflictError } from "../../shared/errors.js";
import bcrypt from "bcryptjs";

describe("Auth Service", () => {
  let authService;
  let mockUserRepo;
  let mockConfig;
  let mockLogger;

  beforeEach(() => {
    mockUserRepo = {
      findByUsernameWithPassword: vi.fn(),
      existsByUsername: vi.fn(),
      create: vi.fn(),
    };

    mockConfig = {
      secretKey: "test_secret_key",
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };

    authService = createAuthService({
      userRepo: mockUserRepo,
      config: mockConfig,
      logger: mockLogger,
    });
  });

  describe("register", () => {
    it("should create a new user successfully", () => {
      mockUserRepo.existsByUsername.mockReturnValue(false);
      mockUserRepo.create.mockReturnValue({ lastInsertRowid: 1 });

      const result = authService.register({
        username: "newuser",
        password: "password123",
      });

      expect(result.user.username).toBe("newuser");
      expect(result.user.id).toBe(1);
      expect(mockUserRepo.existsByUsername).toHaveBeenCalledWith("newuser");
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw ValidationError for missing username", () => {
      expect(() => {
        authService.register({ password: "password123" });
      }).toThrow(ValidationError);
    });

    it("should throw ValidationError for missing password", () => {
      expect(() => {
        authService.register({ username: "newuser" });
      }).toThrow(ValidationError);
    });

    it("should throw ConflictError if username already exists", () => {
      mockUserRepo.existsByUsername.mockReturnValue(true);

      expect(() => {
        authService.register({
          username: "existinguser",
          password: "password123",
        });
      }).toThrow(ConflictError);
    });

    it("should hash the password before storing", () => {
      mockUserRepo.existsByUsername.mockReturnValue(false);
      mockUserRepo.create.mockReturnValue({ lastInsertRowid: 1 });

      authService.register({
        username: "newuser",
        password: "password123",
      });

      const [username, passwordHash] = mockUserRepo.create.mock.calls[0];
      expect(username).toBe("newuser");
      // Password should be hashed (not plain text)
      expect(passwordHash).not.toBe("password123");
      expect(bcrypt.compareSync("password123", passwordHash)).toBe(true);
    });
  });

  describe("login", () => {
    it("should return token for valid credentials", () => {
      const hashedPassword = bcrypt.hashSync("password123", 10);
      mockUserRepo.findByUsernameWithPassword.mockReturnValue({
        id: 1,
        username: "testuser",
        password: hashedPassword,
      });

      const result = authService.login({
        username: "testuser",
        password: "password123",
      });

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(result.user.id).toBe(1);
      expect(result.user.username).toBe("testuser");
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw ValidationError for missing credentials", () => {
      expect(() => {
        authService.login({ username: "testuser" });
      }).toThrow(ValidationError);

      expect(() => {
        authService.login({ password: "password123" });
      }).toThrow(ValidationError);
    });

    it("should throw AuthError for non-existent user", () => {
      mockUserRepo.findByUsernameWithPassword.mockReturnValue(undefined);

      expect(() => {
        authService.login({
          username: "nonexistent",
          password: "password123",
        });
      }).toThrow(AuthError);
    });

    it("should throw AuthError for wrong password", () => {
      const hashedPassword = bcrypt.hashSync("correctpassword", 10);
      mockUserRepo.findByUsernameWithPassword.mockReturnValue({
        id: 1,
        username: "testuser",
        password: hashedPassword,
      });

      expect(() => {
        authService.login({
          username: "testuser",
          password: "wrongpassword",
        });
      }).toThrow(AuthError);
    });
  });
});
