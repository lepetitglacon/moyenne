import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcryptjs";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://moyenne:moyenne_password@localhost:5432/moyenne',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

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
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to PostgreSQL database');

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

    // Entries (1 entry per user per day)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 20),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
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

    // Event log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        meta_json JSONB
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ratings_from_date ON ratings(from_user_id, date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ratings_to_date ON ratings(to_user_id, date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_login ON user_sessions(user_id, login_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_type_at ON events(type, at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_user_at ON events(user_id, at)`);

    // Seed admin user if not exists
    const admin = await pool.query("SELECT id FROM users WHERE username = $1", ["admin"]);
    if (admin.rows.length === 0) {
      const hashed = bcrypt.hashSync("admin123", 10);
      await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", ["admin", hashed]);
      console.log("Seed user created: admin / admin123");
    }

    console.log('✓ Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
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
