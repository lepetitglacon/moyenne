import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, db } from "../index.js";

describe("API Smoke Tests", () => {
  let testUserToken;
  const testUser = {
    username: "testuser_" + Date.now(),
    password: "testpassword123",
  };

  beforeAll(() => {
    // Clean existing test data (keep admin user)
    db.prepare("DELETE FROM ratings").run();
    db.prepare("DELETE FROM entries").run();
    db.prepare("DELETE FROM user_sessions").run();
    db.prepare("DELETE FROM events").run();
    db.prepare("DELETE FROM users WHERE username NOT LIKE 'admin%'").run();
  });

  afterAll(() => {
    // Clean up test user data
    db.prepare("DELETE FROM ratings").run();
    db.prepare("DELETE FROM entries").run();
    db.prepare("DELETE FROM users WHERE username = ?").run(testUser.username);
  });

  describe("Auth Endpoints", () => {
    it("POST /api/register - should create a new user", async () => {
      const res = await request(app)
        .post("/api/register")
        .send(testUser)
        .expect(200);

      expect(res.body).toHaveProperty("message", "User created");
    });

    it("POST /api/register - should reject duplicate username", async () => {
      const res = await request(app)
        .post("/api/register")
        .send(testUser)
        .expect(400);

      expect(res.body).toHaveProperty("message", "Username already taken");
    });

    it("POST /api/register - should require username and password", async () => {
      const res = await request(app)
        .post("/api/register")
        .send({ username: "onlyusername" })
        .expect(400);

      expect(res.body).toHaveProperty("message", "Username and password required");
    });

    it("POST /api/login - should return token for valid credentials", async () => {
      const res = await request(app)
        .post("/api/login")
        .send(testUser)
        .expect(200);

      expect(res.body).toHaveProperty("token");
      testUserToken = res.body.token;
    });

    it("POST /api/login - should reject invalid credentials", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ username: testUser.username, password: "wrongpassword" })
        .expect(401);

      expect(res.body).toHaveProperty("message", "Invalid credentials");
    });

    it("POST /api/login - should reject non-existent user", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ username: "nonexistent", password: "whatever" })
        .expect(401);

      expect(res.body).toHaveProperty("message", "Invalid credentials");
    });
  });

  describe("Authenticated Endpoints", () => {
    it("GET /api/me/stats - should return stats for authenticated user", async () => {
      const res = await request(app)
        .get("/api/me/stats")
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("today");
      expect(res.body).toHaveProperty("monthStart");
      expect(res.body).toHaveProperty("monthEnd");
      expect(res.body).toHaveProperty("participationCount");
      expect(res.body).toHaveProperty("monthEntries");
    });

    it("GET /api/me/stats - should reject without token", async () => {
      await request(app).get("/api/me/stats").expect(401);
    });

    it("GET /api/me/stats - should reject invalid token", async () => {
      await request(app)
        .get("/api/me/stats")
        .set("Authorization", "Bearer invalid_token")
        .expect(403);
    });

    it("GET /api/users - should return list of users", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${testUserToken}`)
        .expect(200);

      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it("POST /api/entries - should save entry", async () => {
      const res = await request(app)
        .post("/api/entries")
        .set("Authorization", `Bearer ${testUserToken}`)
        .send({ rating: 15, description: "Test entry" })
        .expect(200);

      expect(res.body).toHaveProperty("message", "Saved");
    });
  });

  describe("Bot Endpoints", () => {
    const botApiKey = "test_bot_api_key";

    it("GET /api/bot/users - should return users with valid API key", async () => {
      const res = await request(app)
        .get("/api/bot/users")
        .set("X-API-Key", botApiKey)
        .expect(200);

      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it("GET /api/bot/users - should reject without API key", async () => {
      await request(app).get("/api/bot/users").expect(401);
    });

    it("GET /api/bot/users - should reject invalid API key", async () => {
      await request(app)
        .get("/api/bot/users")
        .set("X-API-Key", "wrong_key")
        .expect(401);
    });

    it("GET /api/bot/user/:username - should check if user exists", async () => {
      const res = await request(app)
        .get(`/api/bot/user/${testUser.username}`)
        .set("X-API-Key", botApiKey)
        .expect(200);

      expect(res.body).toHaveProperty("exists", true);
      expect(res.body.user).toHaveProperty("username", testUser.username);
    });

    it("GET /api/bot/user/:username - should return exists:false for unknown user", async () => {
      const res = await request(app)
        .get("/api/bot/user/nonexistentuser")
        .set("X-API-Key", botApiKey)
        .expect(200);

      expect(res.body).toHaveProperty("exists", false);
    });

    it("GET /api/recap - should return recap data", async () => {
      const res = await request(app)
        .get("/api/recap")
        .set("X-API-Key", botApiKey)
        .expect(200);

      expect(res.body).toHaveProperty("date");
      expect(res.body).toHaveProperty("participantCount");
      expect(res.body).toHaveProperty("avgRating");
      expect(res.body).toHaveProperty("top3");
      expect(res.body).toHaveProperty("ratingsGiven");
    });
  });
});
