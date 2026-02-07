import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Checks if a column exists on a table (used to detect already-applied migrations).
 */
async function columnExists(pool, table, column) {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return result.rows.length > 0;
}

/**
 * Map of migration filenames to detection functions.
 * If the detection returns true, the migration is already applied in the DB
 * (even if not tracked in the migrations table).
 */
const LEGACY_DETECTORS = {
  '001_add_tags.sql': (pool) => columnExists(pool, 'entries', 'tags'),
  '002_add_gif_url.sql': (pool) => columnExists(pool, 'entries', 'gif_url'),
  '003_add_email_and_password_reset.sql': (pool) => columnExists(pool, 'users', 'email'),
};

/**
 * Run all pending migrations from the migrations/ directory.
 * - Creates the migrations tracking table if needed
 * - Detects legacy migrations already applied before this system existed
 * - Executes new migrations in order within a transaction
 */
export async function runMigrations(pool, logger) {
  // Ensure migrations tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Read migration files sorted by name
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.info('No migration files found');
    return;
  }

  // Get already-tracked migrations
  const applied = await pool.query('SELECT name FROM migrations');
  const appliedSet = new Set(applied.rows.map(r => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) {
      logger.info(`Migration already applied: ${file}`);
      continue;
    }

    // Check if this is a legacy migration that was applied before the tracking system
    const detector = LEGACY_DETECTORS[file];
    if (detector && await detector(pool)) {
      // Mark as applied without executing
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      logger.info(`Migration already applied (legacy): ${file}`);
      continue;
    }

    // Execute the migration in a transaction
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Migration failed: ${file}`, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }
}
