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

    // If frontend says it's verified, double check in DB for security
    let isVerified = false;
    if (data.is_verified) {
      isVerified = await this.userRepository.checkRecentlyVerified(data.email);
    }

    // Hash password
    const hashedPassword = await argon2.hash(data.mot_de_passe);
    
    // Generate unique referral code
    const codeInvitation = await this.generateUniqueReferralCode();

    // Create user with hashed password and referral code
    const user = await this.userRepository.createUser({
      ...data,
      mot_de_passe: hashedPassword,
      code_invitation: codeInvitation,
      is_verified: isVerified,
    });

    // If there is a parrain_id, create a referral
    if (data.parrain_id) {
      const referralService = new ReferralService();
      await referralService.createReferral(data.parrain_id, user.id);
    }

    // Send welcome email
    try {
      await this.mailService.sendWelcomeEmail(user.email, user.prenom);
    } catch (err) {
      console.warn('Could not send welcome email:', err);
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
  async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(user.mot_de_passe, password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    // Return user and token (without password hash)
    const { mot_de_passe, ...userWithoutPassword } = user;
    return {
      user: await encodeMediaFields(userWithoutPassword as any),
      token,
    };
  }

  /**
   * Delete user account (Admin)
   */
  async deleteUser(userId: string): Promise<boolean> {
    return await this.userRepository.deleteUser(userId);
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
    currency?: string
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
    const settingRepo = new SettingRepository();
    const docTypeRepo = new DocumentTypeRepository();

    // 1. Get all declarations by this user
    const declarations = await declRepo.findByReporterId(userId);
    const totalFound = declarations.filter(d => d.declaration_type === 'FOUND').length;
    const returnedDecls = declarations.filter(d => d.status === 'RETURNED');
    const totalReturned = returnedDecls.length;

    // 2. Get all referrals by this user
    const referrals = await referralRepo.getReferralsByParrain(userId);
    const totalReferrals = referrals.length;

    // 3. Points per declaration (from settings)
    const ptsPerDeclStr = await settingRepo.getByKey('points_per_declaration') || '5';
    const PTS_PER_DECL = parseInt(ptsPerDeclStr);

    // 4. Calculate points breakdown
    const declPoints = declarations.length * PTS_PER_DECL;
    
    // For returned docs, we sum up their doc type rewards
    let returnPoints = 0;
    const docTypesCache = new Map();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const d of returnedDecls) {
      if (!d.doc_type) continue;
      
      let docType = docTypesCache.get(d.doc_type);
      if (!docType) {
        // 1. Try as UUID if format matches
        if (uuidRegex.test(d.doc_type)) {
           try {
             docType = await docTypeRepo.findById(d.doc_type);
           } catch (e) {
             console.error(`Error finding doc type by ID ${d.doc_type}:`, e);
           }
        }
        
        // 2. If not found or not a UUID, try as code
        if (!docType) {
          try {
            docType = await docTypeRepo.findByCode(d.doc_type.toUpperCase());
          } catch (e) {
            console.error(`Error finding doc type by code ${d.doc_type}:`, e);
          }
        }
        
        if (docType) {
          docTypesCache.set(d.doc_type, docType);
        }
      }
      
      returnPoints += docType?.points_recompense || 0;
    }

    // For referrals, 10 points each (as defined in ReferralRepository)
    const refPoints = totalReferrals * 10;

    const calculatedTotal = declPoints + returnPoints + refPoints;

    // Sync back to DB if different (self-healing)
    if ((user.points || 0) !== calculatedTotal) {
      await this.userRepository.setPoints(userId, calculatedTotal);
    }

    return {
      wallet_balance: user.wallet_balance || 0,
      total_points: calculatedTotal,
      db_points: user.points || 0, // For debugging
      stats: {
        total_found: totalFound,
        total_returned: totalReturned,
        total_referrals: totalReferrals
      },
      points_breakdown: {
        declarations: {
          count: declarations.length,
          points: declPoints,
          pts_per_unit: PTS_PER_DECL
        },
        returns: {
          count: totalReturned,
          points: returnPoints
        },
        referrals: {
          count: totalReferrals,
          points: refPoints
        }
      }
    };
  }
}