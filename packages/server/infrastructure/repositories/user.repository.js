/**
 * User Repository - Data access layer for users table
 * Factory pattern with db injection
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string} [password] - Only included when needed for auth
 */

/**
 * Create a user repository instance
 * @param {import('better-sqlite3').Database} db - SQLite database instance
 */
export function createUserRepository(db) {
  return {
    /**
     * Find user by username (includes password hash for auth)
     * @param {string} username
     * @returns {User|undefined}
     */
    findByUsernameWithPassword(username) {
      return db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username);
    },

    /**
     * Find user by username (public info only)
     * @param {string} username
     * @returns {User|undefined}
     */
    findByUsername(username) {
      return db
        .prepare("SELECT id, username FROM users WHERE username = ?")
        .get(username);
    },

    /**
     * Find user by ID
     * @param {number} id
     * @returns {User|undefined}
     */
    findById(id) {
      return db
        .prepare("SELECT id, username FROM users WHERE id = ?")
        .get(id);
    },

    /**
     * Check if username exists
     * @param {string} username
     * @returns {boolean}
     */
    existsByUsername(username) {
      const row = db
        .prepare("SELECT id FROM users WHERE username = ?")
        .get(username);
      return !!row;
    },

    /**
     * Create a new user
     * @param {string} username
     * @param {string} passwordHash - Already hashed password
     * @returns {import('better-sqlite3').RunResult}
     */
    create(username, passwordHash) {
      return db
        .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
        .run(username, passwordHash);
    },

    /**
     * List all users sorted alphabetically
     * @returns {User[]}
     */
    listAll() {
      return db
        .prepare("SELECT id, username FROM users ORDER BY username COLLATE NOCASE ASC")
        .all();
    },
  };
}
