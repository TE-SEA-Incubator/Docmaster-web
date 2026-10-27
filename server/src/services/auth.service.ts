import { UserRepository } from '../repositories/auth.repository.ts';
import argon2 from 'argon2';
import crypto from 'crypto';
import { User } from '../types/database.ts';
import { generateToken } from '../config/jwt.ts';
import { ReferralService } from './referral.service.ts';
import { MailService } from './mail.service.ts';
import { SmsService } from './sms.service.ts';
import { DeclarationRepository } from '../repositories/declaration.repository.ts';
import { ReferralRepository } from '../repositories/referral.repository.ts';
import { SettingRepository } from '../repositories/setting.repository.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';
import { encodeMediaFields } from '../utils/media.utils.ts';
import { bumpCacheVersion } from '../cache/cache.ts';
import { PUBLIC_SEARCH_VERSION } from '../cache/keys.ts';

export class UserService {
  private userRepository = new UserRepository();
  private mailService = new MailService();
  private smsService = new SmsService();

  /**
   * Generate a unique referral code
   * Format: 8-character alphanumeric (e.g., "ABC12XYZ")
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    let code = '';

    while (!isUnique) {
      // Generate random 8-character code
      code = Array.from({ length: 8 })
        .map(() => characters[Math.floor(Math.random() * characters.length)])
        .join('');

      // Check if code already exists
      const existingUser = await this.userRepository.findByReferralCode(code);
      isUnique = !existingUser;
    }

    return code;
  }

  /**
   * Register a new user with referral code generation
   */
  async registerUser(data: any): Promise<User> {
    // Pre-check: email already used?
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('duplicate key value violates unique constraint "users_email_key"');
    }

    // Pre-check: telephone already used?
    if (data.telephone) {
      const existingPhone = await this.userRepository.findByTelephone(data.telephone);
      if (existingPhone) {
        throw new Error('duplicate key value violates unique constraint "users_telephone_key"');
      }
    }

    // Hash password (generate a secure random password if none is provided, e.g. for Google OAuth)
    const passwordToHash = data.mot_de_passe || crypto.randomBytes(32).toString('hex');
    const hashedPassword = await argon2.hash(passwordToHash);
    
    // Generate unique referral code
    const codeInvitation = await this.generateUniqueReferralCode();

    // Create user with is_verified = false
    const user = await this.userRepository.createUser({
      ...data,
      mot_de_passe: hashedPassword,
      code_invitation: codeInvitation,
      is_verified: false,
    });

    // If there is a parrain_id, create a referral
    if (data.parrain_id) {
      const referralService = new ReferralService();
      await referralService.createReferral(data.parrain_id, user.id);
    }

    // Auto-send verification PIN by email
    try {
      await this.sendVerificationPin(user.email, user.telephone);
    } catch (err: any) {
      console.error('❌ Échec envoi email de vérification:', err.message);
    }

    // Send welcome email
    try {
      await this.mailService.sendWelcomeEmail(user.email, user.prenom);
    } catch (err: any) {
      console.error('❌ Échec envoi email de bienvenue:', err.message);
    }

    return await encodeMediaFields(user);
  }

  /**
   * Verify user password
   */
  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return await argon2.verify(hashedPassword, plainPassword);
  }

  /**
   * Handle password reset request
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const token = await this.userRepository.forgotPassword(user.id);
    
    // Send reset email
    await this.mailService.sendPasswordResetEmail(user.email, token);
    
    return token;
  }

  /**
   * Login user with email and password
   */
  async loginUser(email: string, password: string): Promise<{ user: User; token: string; refresh_token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await this.verifyPassword(user.mot_de_passe, password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 30);
    await this.userRepository.setRefreshToken(user.id, refreshHash, refreshExpires);

    const { mot_de_passe, refresh_token_hash, refresh_token_expires, ...userWithoutPassword } = user as any;
    return {
      user: await encodeMediaFields(userWithoutPassword as User),
      token,
      refresh_token: refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken?.trim()) {
      throw new Error('Refresh token requis');
    }

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await this.userRepository.findByRefreshTokenHash(refreshHash);
    if (!user) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 30);
    await this.userRepository.setRefreshToken(user.id, newRefreshHash, refreshExpires);

    const accessToken = generateToken(user.id, user.email, user.role);
    const { mot_de_passe, refresh_token_hash, refresh_token_expires, ...safe } = user as any;
    return {
      token: accessToken,
      refresh_token: newRefreshToken,
      user: await encodeMediaFields(safe as User),
    };
  }

  /** Issue access + refresh tokens for an authenticated user (register, OAuth, etc.) */
  async createUserSession(user: User): Promise<{ user: User; token: string; refresh_token: string }> {
    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 30);
    await this.userRepository.setRefreshToken(user.id, refreshHash, refreshExpires);

    const { mot_de_passe, refresh_token_hash, refresh_token_expires, ...userWithoutPassword } = user as any;
    return {
      user: await encodeMediaFields(userWithoutPassword as User),
      token,
      refresh_token: refreshToken,
    };
  }

  async revokeRefreshToken(userId: string) {
    await this.userRepository.clearRefreshToken(userId);
    return { success: true };
  }

  async revokeByRefreshToken(refreshToken: string) {
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await this.userRepository.findByRefreshTokenHash(refreshHash);
    if (user) {
      await this.userRepository.clearRefreshToken(user.id);
    }
    return { success: true };
  }

  /**
   * Delete user account with cascade cleanup
   */
  async deleteUser(userId: string): Promise<boolean> {
    const { pool } = await import('../database/db.ts');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM my_devices WHERE user_id = $1', [userId]);

      // Delete notifications from OTHER users that reference this user's declarations
      await client.query(`
        DELETE FROM notifications
        WHERE type = 'VAULT_MATCH_PENDING'
          AND (metadata->>'declaration_id')::uuid IN (
            SELECT id FROM declarations WHERE reporter_id = $1
          )
      `, [userId]);

      await client.query('DELETE FROM declarations WHERE reporter_id = $1', [userId]);
      await client.query('DELETE FROM my_documents WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM claims WHERE owner_id = $1 OR finder_id = $1', [userId]);
      await client.query('DELETE FROM referrals WHERE parrain_id = $1 OR filleul_id = $1', [userId]);
      await client.query('DELETE FROM document_shares WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_subscriptions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM withdrawal_requests WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM verification_codes WHERE email = (SELECT email FROM users WHERE id = $1)', [userId]);
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

      const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      if ((rowCount ?? 0) > 0) await bumpCacheVersion(PUBLIC_SEARCH_VERSION);
      return (rowCount ?? 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<User> {
    // Verify token exists and is valid
    const resetToken = await this.userRepository.getResetToken(token);
    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    // Update password
    const user = await this.userRepository.updatePassword(resetToken.user_id, hashedPassword);

    // Mark token as used
    await this.userRepository.markResetTokenAsUsed(resetToken.id);

    return await encodeMediaFields(user);
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const isValid = await this.verifyPassword(user.mot_de_passe, currentPassword);
    if (!isValid) throw new Error('Current password is incorrect');

    const hashedPassword = await argon2.hash(newPassword);
    return await this.userRepository.updatePassword(userId, hashedPassword);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { 
    nom?: string, 
    prenom?: string, 
    telephone?: string, 
    photo_url?: string,
    ville?: string,
    date_naissance?: string | null,
    lieu_naissance?: string,
    currency?: string,
    genre?: string | null
  }): Promise<User> {
    const user = await this.userRepository.updateProfile(userId, data);
    if (!user) {
      throw new Error('User not found');
    }
    return await encodeMediaFields(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    return await encodeMediaFields(user);
  }

  /**
   * Get user by Referral Code
   */
  async getUserByReferralCode(code: string): Promise<User | null> {
    const user = await this.userRepository.findByReferralCode(code);
    return await encodeMediaFields(user);
  }

  /**
   * Get user by Email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    return await encodeMediaFields(user);
  }

  /**
   * Get all users for admin (paginated)
   */
  async getAllUsersForAdmin(options?: any): Promise<any> {
    const result = await this.userRepository.getAllUsersForAdmin(options || {});
    const users = await encodeMediaFields(result.users);
    return { users, total: result.total };
  }

  /**
   * Send verification PIN with SMS priority and Email fallback
   */
  async sendVerificationPin(email: string, telephone?: string): Promise<{ method: 'SMS' | 'EMAIL', target: string }> {
    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in DB (linked to email for verification)
    await this.userRepository.storeVerificationCode(email, pin);
    
    let smsSent = false;

    // 1. Try SMS if telephone is provided
    if (telephone) {
      try {
        console.log(`📱 Attempting to send OTP via SMS to ${telephone}...`);
        smsSent = await this.smsService.sendOtp(telephone, pin);
        if (smsSent) {
          console.log(`✅ OTP sent via SMS to ${telephone}`);
          return { method: 'SMS', target: telephone };
        } else {
          console.warn(`⚠️ SMS dispatch returned failure status for ${telephone}`);
        }
      } catch (err: any) {
        console.error(`❌ Error during SMS dispatch to ${telephone}:`, err.message);
      }
    }

    // 2. Fallback to Email if SMS failed or was not attempted
    console.log(`📧 Sending OTP via Email to ${email} (Fallback or Primary)...`);
    await this.mailService.sendVerificationEmail(email, pin);
    return { method: 'EMAIL', target: email };
  }

  /**
   * Verify email PIN
   */
  async verifyEmailPin(email: string, pin: string): Promise<boolean> {
    return await this.userRepository.verifyCode(email, pin);
  }

  /**
   * Get user earnings and points statistics
   */
  async getEarningsStats(userId: string): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const declRepo = new DeclarationRepository();
    const referralRepo = new ReferralRepository();

    const declarations = await declRepo.findByReporterId(userId);
    const totalFound = declarations.filter(d => d.declaration_type === 'FOUND').length;
    const returnedDecls = declarations.filter(d => d.status === 'RETURNED');
    const totalReturned = returnedDecls.length;

    const referrals = await referralRepo.getReferralsByParrain(userId);
    const totalReferrals = referrals.length;

    return {
      wallet_balance: user.wallet_balance || 0,
      total_points: user.points || 0,
      stats: {
        total_found: totalFound,
        total_returned: totalReturned,
        total_referrals: totalReferrals
      }
    };
  }
}