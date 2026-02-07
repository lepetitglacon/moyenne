/**
 * Password Reset Repository - Data access layer for password_reset_tokens table
 */

/**
 * Create a password reset repository instance
 * @param {import('pg').Pool} pool - PostgreSQL pool instance
 */
export function createPasswordResetRepository(pool) {
  return {
    /**
     * Create a password reset token
     * @param {number} userId
     * @param {string} token
     * @param {Date} expiresAt
     */
    async create(userId, token, expiresAt) {
      await pool.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [userId, token, expiresAt]
      );
    },

    /**
     * Find a valid (non-expired, non-used) token
     * @param {string} token
     * @returns {Promise<Object|undefined>}
     */
    async findValidToken(token) {
      const result = await pool.query(
        `SELECT prt.*, u.username, u.email
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.token = $1
           AND prt.used = FALSE
           AND prt.expires_at > NOW()`,
        [token]
      );
      return result.rows[0];
    },

    /**
     * Mark a token as used
     * @param {number} tokenId
     */
    async markUsed(tokenId) {
      await pool.query(
        "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
        [tokenId]
      );
    },

    /**
     * Delete expired tokens (cleanup)
     */
    async deleteExpired() {
      await pool.query(
        "DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE"
      );
    },
  };
}
