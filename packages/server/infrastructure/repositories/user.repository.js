/**
 * User Repository - Data access layer for users table (PostgreSQL)
 * Factory pattern with pool injection
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string} [password] - Only included when needed for auth
 */

/**
 * Create a user repository instance
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createUserRepository(pool) {
  return {
    /**
     * Find user by username (includes password hash for auth)
     * @param {string} username
     * @returns {Promise<User|undefined>}
     */
    async findByUsernameWithPassword(username) {
      const result = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );
      return result.rows[0];
    },

    /**
     * Find user by username (public info only)
     * @param {string} username
     * @returns {Promise<User|undefined>}
     */
    async findByUsername(username) {
      const result = await pool.query(
        "SELECT id, username FROM users WHERE username = $1",
        [username]
      );
      return result.rows[0];
    },

    /**
     * Find user by ID
     * @param {number} id
     * @returns {Promise<User|undefined>}
     */
    async findById(id) {
      const result = await pool.query(
        "SELECT id, username FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0];
    },

    /**
     * Check if username exists
     * @param {string} username
     * @returns {Promise<boolean>}
     */
    async existsByUsername(username) {
      const result = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );
      return result.rows.length > 0;
    },

    /**
     * Create a new user
     * @param {string} username
     * @param {string} passwordHash - Already hashed password
     * @returns {Promise<{ lastInsertRowid: number }>}
     */
    async create(username, passwordHash) {
      const result = await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
        [username, passwordHash]
      );
      return { lastInsertRowid: result.rows[0].id };
    },

    /**
     * List all users sorted alphabetically
     * @returns {Promise<User[]>}
     */
    async listAll() {
      const result = await pool.query(
        "SELECT id, username FROM users ORDER BY LOWER(username) ASC"
      );
      return result.rows;
    },

    /**
     * Update user password hash
     * @param {number} userId
     * @param {string} passwordHash
     */
    async updatePassword(userId, passwordHash) {
      await pool.query(
        "UPDATE users SET password = $1 WHERE id = $2",
        [passwordHash, userId]
      );
    },

    /**
     * Update user email
     * @param {number} userId
     * @param {string} email
     */
    async updateEmail(userId, email) {
      await pool.query(
        "UPDATE users SET email = $1 WHERE id = $2",
        [email, userId]
      );
    },

    /**
     * Find user by email
     * @param {string} email
     * @returns {Promise<User|undefined>}
     */
    async findByEmail(email) {
      const result = await pool.query(
        "SELECT id, username, email FROM users WHERE email = $1",
        [email]
      );
      return result.rows[0];
    },

    /**
     * Find user by ID with password hash
     * @param {number} id
     * @returns {Promise<User|undefined>}
     */
    async findByIdWithPassword(id) {
      const result = await pool.query(
        "SELECT id, username, email, password FROM users WHERE id = $1",
        [id]
      );
      return result.rows[0];
    },
  };
}
