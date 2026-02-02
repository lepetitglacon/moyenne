/**
 * Database initialization for Discord Bot (PostgreSQL)
 */

const { Pool } = require("pg");
const { Logger } = require("./logger");

const log = new Logger("DB");

// Create PostgreSQL connection pool
// Supports both connection string (DATABASE_URL) and individual variables
// Individual variables take precedence to avoid URL encoding issues with special characters
const poolConfig = process.env.POSTGRES_HOST ? {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'moyenne',
  user: process.env.POSTGRES_USER || 'moyenne',
  password: process.env.POSTGRES_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
} : {
  connectionString: process.env.DATABASE_URL || 'postgresql://moyenne:moyenne_password@localhost:5432/moyenne',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

// Create a db object with better-sqlite3-like interface for backward compatibility
const db = {
  // Query method
  async query(text, params) {
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } catch (error) {
      log.error('Query error', { error: error.message, query: text });
      throw error;
    }
  },

  // Get single row
  async get(text, params) {
    const rows = await this.query(text, params);
    return rows[0];
  },

  // Get all rows
  async all(text, params) {
    return this.query(text, params);
  },

  // Run query without returning rows
  async run(text, params) {
    try {
      const result = await pool.query(text, params);
      return { changes: result.rowCount };
    } catch (error) {
      log.error('Run error', { error: error.message, query: text });
      throw error;
    }
  },

  // Synchronous prepare for backward compatibility (returns async methods)
  prepare(text) {
    return {
      get: (...params) => this.get(text, params),
      all: (...params) => this.all(text, params),
      run: (...params) => this.run(text, params),
    };
  },

  // Pragma method for backward compatibility (not used in PostgreSQL)
  pragma: () => [],
};

async function initDb() {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log.info("Connecté à PostgreSQL");

    // Bot configuration (single row)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        guild_id TEXT,
        channel_id TEXT,
        enabled INTEGER DEFAULT 1,
        recap_time TEXT DEFAULT '23:30',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Display modes
        display_mode TEXT DEFAULT 'top3',
        show_comments INTEGER DEFAULT 1,
        show_stats INTEGER DEFAULT 1,

        -- Embed customization
        custom_title TEXT,
        custom_color TEXT,
        custom_footer TEXT,

        -- Advanced scheduling
        days_of_week TEXT DEFAULT 'lun,mar,mer,jeu,ven,sam,dim',
        timezone TEXT DEFAULT 'Europe/Paris',

        -- Notifications
        reminder_enabled INTEGER DEFAULT 0,
        reminder_minutes INTEGER DEFAULT 30,
        reminder_message TEXT,
        mention_role_id TEXT,

        -- Thresholds
        min_participants INTEGER DEFAULT 0
      )
    `);

    // Insert default config if not exists
    await pool.query(`INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

    // Discord ID -> Tilt username mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_links (
        id SERIAL PRIMARY KEY,
        discord_id TEXT UNIQUE NOT NULL,
        tilt_username TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    log.info("Base de données initialisée");
  } catch (error) {
    log.error("Erreur initialisation DB", { error: error.message });
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

module.exports = {
  db,
  pool,
  initDb,
};
