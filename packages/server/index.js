/**
 * Server Bootstrap (PostgreSQL async)
 * - Load config
 * - Initialize DB
 * - Initialize repositories
 * - Initialize services
 * - Create app + middlewares
 * - Mount routes
 * - Start server
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initDb } from "./db.js";
import { logger, Logger } from "./logger.js";
import config from "./config.js";

// Infrastructure
import {
  createUserRepository,
  createEntryRepository,
  createRatingRepository,
  createAssignmentRepository,
  createBadgeRepository,
  createGuessRepository,
} from "./infrastructure/index.js";

// Application
import {
  createAuthService,
  createEntryService,
  createStatsService,
  createBadgeService,
} from "./application/index.js";

// HTTP Interface
import {
  createAuthMiddleware,
  createBotAuthMiddleware,
  createErrorMiddleware,
  createAuthRoutes,
  createEntriesRoutes,
  createStatsRoutes,
  createUsersRoutes,
  createBotRoutes,
} from "./interfaces/index.js";

// Path helpers
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// Initialize repositories (with pool)
const userRepo = createUserRepository(pool);
const entryRepo = createEntryRepository(pool);
const ratingRepo = createRatingRepository(pool);
const assignmentRepo = createAssignmentRepository(pool);
const badgeRepo = createBadgeRepository(pool);
const guessRepo = createGuessRepository(pool);

// Initialize loggers
const logAuth = new Logger("Auth");
const logAPI = new Logger("API");
const logBot = new Logger("Bot");

// Initialize services
const authService = createAuthService({ userRepo, config, logger: logAuth });
const badgeService = createBadgeService({ badgeRepo, entryRepo, ratingRepo, guessRepo, logger: logAPI });
const entryService = createEntryService({ entryRepo, ratingRepo, assignmentRepo, guessRepo, badgeService, logger: logAPI });
const statsService = createStatsService({ userRepo, entryRepo, ratingRepo, guessRepo, badgeService, logger: logBot });

// Initialize middlewares
const authenticateToken = createAuthMiddleware(config, logAuth);
const authenticateBot = createBotAuthMiddleware(config, logBot);
const errorMiddleware = createErrorMiddleware(logAPI);

// Create Express app
const app = express();

// Global middlewares
app.use(cors({
  origin: [
    config.frontendUrl,
    "https://www.pierrederache.fr",
    "http://localhost:5173",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? "warning" : "debug";
    logAPI[logLevel](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Mount routes
app.use("/api", createAuthRoutes({ authService }));
app.use("/api", createEntriesRoutes({ entryService, authenticateToken }));
app.use("/api", createStatsRoutes({ statsService, authenticateToken }));
app.use("/api", createUsersRoutes({ statsService, authenticateToken }));
app.use("/api", createBotRoutes({ statsService, authenticateBot, logger: logBot }));

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Export for testing
export { app, pool };

// Start server only when run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMainModule) {
  // Initialize database before starting server
  initDb().then(() => {
    app.listen(config.port, () => {
      logger.info(`Serveur démarré sur http://localhost:${config.port}`);
    });
  }).catch((err) => {
    logger.error("Erreur d'initialisation de la base de données", { error: err.message });
    process.exit(1);
  });
}
