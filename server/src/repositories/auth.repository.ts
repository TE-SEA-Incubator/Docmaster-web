import { pool } from '../database/db.ts';
import { User, PasswordResetToken } from '../types/database.ts';
import crypto from 'crypto';

export class UserRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find user by referral code
   */
  async findByReferralCode(code: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE code_invitation = $1';
    const { rows } = await pool.query(query, [code]);
    return rows[0] || null;
  }

  /**
   * Create a new user with all provided fields
   */
  async createUser(userData: Partial<User>): Promise<User> {
    const query = `
      INSERT INTO users (nom, prenom, email, mot_de_passe, telephone, pays, ville, code_invitation, parrain_id, is_verified) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`;
    
    const { rows } = await pool.query(query, [
      userData.nom,
      userData.prenom,
      userData.email,
      userData.mot_de_passe,
      userData.telephone || null,
      userData.pays || 'Cameroun',
      userData.ville || 'Yaoundé',
      userData.code_invitation || null,
      userData.parrain_id || null,
      userData.is_verified || false,
    ]);
    
    return rows[0];
  }

  /**
   * Check if an email has been verified recently (e.g., in the last 15 minutes)
   */
  async checkRecentlyVerified(email: string): Promise<boolean> {
    const query = `
      SELECT id FROM verification_codes 
      WHERE email = $1 AND used = true AND created_at > NOW() - INTERVAL '15 minutes'
      LIMIT 1`;
    const { rows } = await pool.query(query, [email]);
    return rows.length > 0;
  }

  /**
   * Generate a password reset token and store it in the database
   */
  async forgotPassword(userId: string, expiresInHours: number = 24): Promise<string> {
    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    // Store token in database
    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING token`;
    
    const { rows } = await pool.query(query, [userId, token, expiresAt]);
    return rows[0].token;
  }

  /**
   * Get a valid password reset token
   */
  async getResetToken(token: string): Promise<PasswordResetToken | null> {
    const query = `
      SELECT * FROM password_reset_tokens 
      WHERE token = $1 AND expires_at > NOW() AND used = false`;
    
    const { rows } = await pool.query(query, [token]);
    return rows[0] || null;
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<User> {
    const query = `
      UPDATE users 
      SET mot_de_passe = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *`;
    
    const { rows } = await pool.query(query, [newPassword, userId]);
    return rows[0];
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, data: { 
    nom?: string, 
    prenom?: string, 
    telephone?: string, 
    photo_url?: string,
    ville?: string,
    date_naissance?: string | null,
    lieu_naissance?: string,
    currency?: string
  }): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.nom !== undefined) {
      fields.push(`nom = $${idx++}`);
      values.push(data.nom);
    }
    if (data.prenom !== undefined) {
      fields.push(`prenom = $${idx++}`);
      values.push(data.prenom);
    }
    if (data.telephone !== undefined) {
      fields.push(`telephone = $${idx++}`);
      values.push(data.telephone);
    }
    if (data.photo_url !== undefined) {
      fields.push(`photo_url = $${idx++}`);
      values.push(data.photo_url);
    }
    if (data.ville !== undefined) {
      fields.push(`ville = $${idx++}`);
      values.push(data.ville);
    }
    if (data.date_naissance !== undefined) {
      fields.push(`date_naissance = $${idx++}`);
      // Handle empty string as null for DATE type
      const dateVal = data.date_naissance === "" ? null : data.date_naissance;
      values.push(dateVal);
    }
    if (data.lieu_naissance !== undefined) {
      fields.push(`lieu_naissance = $${idx++}`);
      values.push(data.lieu_naissance);
    }
    if (data.currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(data.currency);
    }

    if (fields.length === 0) return this.findById(userId);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = NOW() 
      WHERE id = $${idx} 
      RETURNING *`;
    
    values.push(userId);
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  /**
   * Mark password reset token as used
   */
  async markResetTokenAsUsed(tokenId: string): Promise<void> {
    const query = `
      UPDATE password_reset_tokens 
      SET used = true, used_at = NOW()
      WHERE id = $1`;
    
    await pool.query(query, [tokenId]);
  }

  /**
   * Update user wallet balance
   */
  async updateBalance(userId: string, amount: number): Promise<number> {
    const query = `
      UPDATE users 
      SET wallet_balance = wallet_balance + $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING wallet_balance`;
    const { rows } = await pool.query(query, [amount, userId]);
    return rows[0]?.wallet_balance || 0;
  }
  
  /**
   * Update user points (increment)
   */
  async updatePoints(userId: string, points: number): Promise<number> {
    const query = `
      UPDATE users 
      SET points = COALESCE(points, 0) + $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING points`;
    
    const { rows } = await pool.query(query, [points, userId]);
    return rows[0]?.points || 0;
  }

  /**
   * Set user points (absolute)
   */
  async setPoints(userId: string, points: number): Promise<number> {
    const query = `
      UPDATE users 
      SET points = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING points`;
    
    const { rows } = await pool.query(query, [points, userId]);
    return rows[0]?.points || 0;
  }

  /**
   * Clean up expired password reset tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const query = `
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW()`;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  /**
   * Get all users with subscription and referral info (Admin)
   */
  async getAllUsersForAdmin(): Promise<any[]> {
    const query = `
      SELECT 
          u.id, u.nom, u.prenom, u.email, u.telephone, u.pays, u.ville, 
          u.role, u.wallet_balance, u.points, u.code_invitation, u.created_at,
          s.plan_id as active_plan, 
          s.status as subscription_status,
          s.date_fin as subscription_end,
          (SELECT COUNT(*) FROM users WHERE parrain_id = u.id) as referral_count
      FROM users u
      LEFT JOIN user_subscriptions s ON s.user_id = u.id AND s.status = 'ACTIVE'
      ORDER BY u.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Store a verification code
   */
  async storeVerificationCode(email: string, code: string, expiresInMinutes: number = 10): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
    
    const query = `
      INSERT INTO verification_codes (email, code, expires_at)
      VALUES ($1, $2, $3)`;
    
    await pool.query(query, [email, code, expiresAt]);
  }

  /**
   * Verify a code
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const query = `
      SELECT * FROM verification_codes 
      WHERE email = $1 AND code = $2 AND expires_at > NOW() AND used = false
      ORDER BY created_at DESC LIMIT 1`;
    
    const { rows } = await pool.query(query, [email, code]);
    if (rows[0]) {
      // Mark as used
      await pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [rows[0].id]);
      return true;
    }
    return false;
  }

  /**
   * Delete a user account (Admin)
   */
  async deleteUser(userId: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const { rowCount } = await pool.query(query, [userId]);
    return (rowCount ?? 0) > 0;
  }
}