import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import { Logger } from "./logger.js";

const dbLogger = new Logger("DB");

// Create PostgreSQL connection pool
// Supports both connection string (DATABASE_URL) and individual variables
// Individual variables take precedence to avoid URL encoding issues with special characters
const poolConfig = process.env.POSTGRES_HOST ? {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'moyenne',
  user: process.env.POSTGRES_USER || 'moyenne',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
} : {
  connectionString: process.env.DATABASE_URL || 'postgresql://moyenne:moyenne_password@localhost:5432/moyenne',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

// Export pool as db for compatibility
export const db = {
  // Query method similar to better-sqlite3's prepare().get()
  async query(text, params) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  // Get single row (similar to .get())
  async get(text, params) {
    const rows = await this.query(text, params);
    return rows[0];
  },

  // Get all rows (similar to .all())
  async all(text, params) {
    return this.query(text, params);
  },

  // Run query without returning rows (similar to .run())
  async run(text, params) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
    } finally {
      client.release();
    }
  },

  // For backward compatibility
  prepare(text) {
    return {
      get: async (...params) => this.get(text, params),
      all: async (...params) => this.all(text, params),
      run: async (...params) => this.run(text, params),
    };
  },
};

async function initDb() {
  dbLogger.info("Database initialization started");

  try {
    // Test connection
    dbLogger.info("Testing database connection...");
    const now = await pool.query('SELECT NOW() as time');
    dbLogger.info("Connected to PostgreSQL", { time: now.rows[0].time });

    // ═══════════════════════════════════════════════════════════════
    // TABLES
    // ═══════════════════════════════════════════════════════════════
    dbLogger.info("Creating tables...");

    // Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    // Entries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 20),
        description TEXT,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);

    // Review assignments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_assignments (
        id SERIAL PRIMARY KEY,
        reviewer_id INTEGER NOT NULL REFERENCES users(id),
        reviewee_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reviewer_id, date),
        UNIQUE(reviewee_id, date)
      )
    `);

    // Ratings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_user_id, to_user_id, date)
      )
    `);

    // User sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        logout_at TIMESTAMP,
        ip TEXT,
        user_agent TEXT
      )
    `);

    // Events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        meta_json JSONB
      )
    `);

    // User badges
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        badge_type TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        UNIQUE(user_id, badge_type)
      )
    `);

    // Guesses (detective game)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guesses (
        id SERIAL PRIMARY KEY,
        guesser_id INTEGER NOT NULL REFERENCES users(id),
        entry_user_id INTEGER NOT NULL REFERENCES users(id),
        guessed_user_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guesser_id, date)
      )
    `);

    dbLogger.info("All tables ready");

    // ═══════════════════════════════════════════════════════════════
    // MIGRATIONS
    // ═══════════════════════════════════════════════════════════════
    dbLogger.info("Running migrations...");

    // Migration: Add tags column to entries
    const tagsColumnCheck = await pool.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'entries' AND column_name = 'tags'
    `);
    if (tagsColumnCheck.rows.length === 0) {
      await pool.query(`ALTER TABLE entries ADD COLUMN tags JSONB DEFAULT '[]'`);
      dbLogger.info("Migration: Added tags column to entries");
    }

    // ═══════════════════════════════════════════════════════════════
    // INDEXES
    // ═══════════════════════════════════════════════════════════════
    dbLogger.info("Creating indexes...");

    const indexes = [
      // Entries - frequent queries by user, date, or both
      { name: 'idx_entries_date', table: 'entries', column: 'date' },
      { name: 'idx_entries_user_date', table: 'entries', column: 'user_id, date' },
      { name: 'idx_entries_user_id', table: 'entries', column: 'user_id' },

      // Ratings - frequent queries for leaderboards and stats
      { name: 'idx_ratings_date', table: 'ratings', column: 'date' },
      { name: 'idx_ratings_from_date', table: 'ratings', column: 'from_user_id, date' },
      { name: 'idx_ratings_to_date', table: 'ratings', column: 'to_user_id, date' },
      { name: 'idx_ratings_from_user', table: 'ratings', column: 'from_user_id' },
      { name: 'idx_ratings_to_user', table: 'ratings', column: 'to_user_id' },

      // Review assignments - lookups by reviewer and date
      { name: 'idx_assignments_date', table: 'review_assignments', column: 'date' },
      { name: 'idx_assignments_reviewer_date', table: 'review_assignments', column: 'reviewer_id, date' },
      { name: 'idx_assignments_reviewee_date', table: 'review_assignments', column: 'reviewee_id, date' },

      // User sessions and events (if used later)
      { name: 'idx_sessions_user_login', table: 'user_sessions', column: 'user_id, login_at' },
      { name: 'idx_events_type_at', table: 'events', column: 'type, at' },
      { name: 'idx_events_user_at', table: 'events', column: 'user_id, at' },

      // Badges and guesses
      { name: 'idx_user_badges_user', table: 'user_badges', column: 'user_id' },
      { name: 'idx_guesses_guesser', table: 'guesses', column: 'guesser_id' },
      { name: 'idx_guesses_date', table: 'guesses', column: 'date' },
      { name: 'idx_guesses_guesser_date', table: 'guesses', column: 'guesser_id, date' },
    ];

    for (const idx of indexes) {
      await pool.query(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`);
    }
    dbLogger.info("Indexes ready", { count: indexes.length });

    // ═══════════════════════════════════════════════════════════════
    // SEED DATA
    // ═══════════════════════════════════════════════════════════════
    const admin = await pool.query("SELECT id FROM users WHERE username = $1", ["admin"]);
    if (admin.rows.length === 0) {
      const hashed = bcrypt.hashSync("admin123", 10);
      await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", ["admin", hashed]);
      dbLogger.info("Admin user created", { username: "admin" });
    }

    dbLogger.info("Database initialization complete");

  } catch (error) {
    dbLogger.error("Database initialization failed", { error: error.message, stack: error.stack });
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

export { pool, initDb };
