/**
 * Application layer - Use cases / Services
 * Orchestrates domain logic and infrastructure
 */

export { createAuthService } from "./auth.service.js";
export { createEntryService } from "./entry.service.js";
export { createStatsService } from "./stats.service.js";
export { createBadgeService, BADGE_DEFINITIONS } from "./badge.service.js";
