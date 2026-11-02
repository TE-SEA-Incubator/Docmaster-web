import { Request, Response } from 'express';
import { UserService } from '../services/auth.service.ts';
import { generateToken } from '../config/jwt.ts';
import { activityLogService } from '../services/activity-log.service.ts';
import { subscriptionService } from '../services/subscription.service.ts';
import admin from '../config/firebase-admin.ts';

export class AuthController {
  private userService = new UserService();

  /**
   * Check if email is already used
   */
  async checkEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email requis' });
        return;
      }
      const user = await this.userService.getUserByEmail(email);
      res.status(200).json({ exists: !!user });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
  }

  /**
   * Register user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { nom, prenom, email, mot_de_passe, telephone, pays, ville, date_naissance, genre, code_parrainage } = req.body;

      // Validate required fields
      if (!nom || !prenom || !email || !mot_de_passe) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      let parrain_id = undefined;
      if (code_parrainage) {
        const parrain = await this.userService.getUserByReferralCode(code_parrainage);
        if (parrain) {
          parrain_id = parrain.id;
        }
      }

      // Register user (is_verified is always checked server-side)
      const user = await this.userService.registerUser({
        nom,
        prenom,
        email,
        mot_de_passe,
        telephone,
        pays,
        ville,
        date_naissance,
        genre,
        parrain_id,
      });

      // Return user without password
      const { mot_de_passe: _, ...userWithoutPassword } = user;
      const session = await this.userService.createUserSession(user);

      res.cookie('docmaster_token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      activityLogService.log({
        user_id: user.id,
        action_type: 'REGISTER',
        entity_type: 'user',
        entity_id: user.id,
        description: `Inscription de ${user.prenom} ${user.nom}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }).catch(() => {});

      res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
        token: session.token,
        refresh_token: session.refresh_token,
        code_invitation: user.code_invitation,
      });
    } catch (error: any) {
      if (error.message.includes('duplicate key')) {
        if (error.message.includes('users_email_key')) {
          res.status(409).json({ error: 'Cet email est déjà utilisé' });
        } else if (error.message.includes('users_telephone_key')) {
          res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
        } else {
          res.status(409).json({ error: 'Un conflit est survenu lors de l\'inscription' });
        }
      } else {
        res.status(500).json({ error: error.message || 'Registration failed' });
      }
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, mot_de_passe } = req.body;

      // Validate required fields
      if (!email || !mot_de_passe) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      // Login user
      const { user, token, refresh_token } = await this.userService.loginUser(email, mot_de_passe);

      // Set cookie
      res.cookie('docmaster_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      activityLogService.log({
        user_id: user.id,
        action_type: 'LOGIN',
        entity_type: 'user',
        entity_id: user.id,
        description: `Connexion de ${user.prenom} ${user.nom}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }).catch(() => {});

      // Fetch active subscription
      const activeSub = await subscriptionService.getActiveSubscription(user.id);
      let subscription = null;
      if (activeSub) {
        subscription = {
          plan_id: activeSub.plan_id,
          plan_name: activeSub.plan_name,
          status: activeSub.date_fin > new Date() ? 'active' : 'expired',
          start_date: activeSub.date_debut,
          expiry_date: activeSub.date_fin,
        };
      }

      res.status(200).json({
        message: 'Login successful',
        user: { ...user, subscription },
        token,
        refresh_token,
      });
    } catch (error: any) {
      if (error.message.includes('Invalid email or password')) {
        res.status(401).json({ error: 'Invalid email or password' });
      } else if (error.code === 'ACCOUNT_BLOCKED') {
        res.status(403).json({
          error: error.message,
          message: error.message,
          code: 'ACCOUNT_BLOCKED',
        });
      } else {
        res.status(500).json({ error: error.message || 'Login failed' });
      }
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.body?.refresh_token as string | undefined;
    const userId = (req as any).user?.id;
    if (refreshToken) {
      await this.userService.revokeByRefreshToken(refreshToken);
    } else if (userId) {
      await this.userService.revokeRefreshToken(userId);
    }
    res.clearCookie('docmaster_token');
    res.status(200).json({ message: 'Logout successful', success: true });
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body?.refresh_token as string | undefined;
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'Refresh token requis' });
        return;
      }
      const result = await this.userService.refreshAccessToken(refreshToken);
      res.cookie('docmaster_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({
        success: true,
        token: result.token,
        refresh_token: result.refresh_token,
        user: result.user,
      });
    } catch (error: any) {
      if (error.code === 'ACCOUNT_BLOCKED') {
        res.status(403).json({
          success: false,
          error: error.message,
          message: error.message,
          code: 'ACCOUNT_BLOCKED',
        });
        return;
      }
      res.status(401).json({ success: false, error: error.message || 'Session expirée' });
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ error: 'Non authentifié' }); return; }

      const { current_password, new_password } = req.body;
      if (!current_password || !new_password) {
        res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
        return;
      }
      if (new_password.length < 6) {
        res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
        return;
      }

      await this.userService.changePassword(userId, current_password, new_password);
      res.status(200).json({ message: 'Mot de passe mis à jour avec succès', success: true });
    } catch (error: any) {
      if (error.message.includes('Current password is incorrect')) {
        res.status(400).json({ error: 'Mot de passe actuel incorrect' });
      } else {
        res.status(500).json({ error: error.message || 'Erreur lors du changement de mot de passe' });
      }
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email required' });
        return;
      }

      await this.userService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: 'If this email exists, a password reset link has been sent',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(500).json({ error: error.message || 'Request failed' });
      }
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and password required' });
        return;
      }

      const user = await this.userService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        user: { id: user.id, email: user.email },
      });
    } catch (error: any) {
      if (error.message.includes('Invalid or expired')) {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || 'Reset failed' });
      }
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { nom, prenom, telephone, ville, date_naissance, lieu_naissance, currency, genre } = req.body;
      let photo_url: string | undefined = undefined;

      // Handle photo upload if present
      if (req.file) {
        photo_url = `uploads/profiles/${req.file.filename}`;
      }

      const updatedUser = await this.userService.updateProfile(userId, {
        nom,
        prenom,
        telephone,
        ville,
        photo_url,
        date_naissance,
        lieu_naissance,
        currency,
        genre
      });

      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const { mot_de_passe: _, ...userWithoutPassword } = updatedUser;

      activityLogService.log({
        user_id: userId,
        action_type: 'UPDATE_PROFILE',
        entity_type: 'user',
        entity_id: userId,
        description: `Mise à jour du profil`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }).catch(() => {});

      res.status(200).json({
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });
    } catch (error: any) {
      console.error('[updateProfile]', error);
      res.status(500).json({ error: error.message || 'Update failed' });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { mot_de_passe: _, ...userWithoutPassword } = user;

      // Fetch active subscription
      const activeSub = await subscriptionService.getActiveSubscription(userId);
      let subscription = null;
      if (activeSub) {
        subscription = {
          plan_id: activeSub.plan_id,
          plan_name: activeSub.plan_name,
          status: activeSub.date_fin > new Date() ? 'active' : 'expired',
          start_date: activeSub.date_debut,
          expiry_date: activeSub.date_fin,
        };
      }

      res.status(200).json({ ...userWithoutPassword, subscription });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch profile' });
    }
  }

  /**
   * Get all users (Admin)
   */
  async getAdminUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, status, is_verified } = req.query;
      const result = await this.userService.getAllUsersForAdmin({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string || '',
        status: status as string || '',
        is_verified: is_verified !== undefined ? is_verified === 'true' : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  }

  /**
   * Send verification PIN to email
   */
  async sendVerificationPin(req: Request, res: Response): Promise<void> {
    try {
      const { email, telephone } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email required' });
        return;
      }

      const result = await this.userService.sendVerificationPin(email, telephone);
      res.status(200).json({ 
        message: `Code de vérification envoyé par ${result.method === 'SMS' ? 'SMS' : 'Email'}`,
        method: result.method,
        target: result.target
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to send code' });
    }
  }

  /**
   * Verify email PIN
   */
  async verifyEmailPin(req: Request, res: Response): Promise<void> {
    try {
      const { email, pin } = req.body;
      if (!email || !pin) {
        res.status(400).json({ error: 'Email and PIN required' });
        return;
      }

      const isValid = await this.userService.verifyEmailPin(email, pin);
      if (isValid) {
        res.status(200).json({ message: 'Email verified successfully', success: true });
      } else {
        res.status(400).json({ error: 'Invalid or expired verification code', success: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Verification failed' });
    }
  }

  /**
   * Get user earnings and points statistics
   */
  async getEarningsStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const stats = await this.userService.getEarningsStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      console.error('[getEarningsStats]', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch earnings stats' });
    }
  }

  /**
   * Get user earnings history with filters
   */
  async getEarningsHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { startDate, endDate, type, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        type: type as string | undefined,
        offset: (pageNum - 1) * limitNum,
        limit: limitNum,
      };

      const result = await this.userService.getEarningsHistory(userId, filters);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[getEarningsHistory]', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch earnings history' });
    }
  }

  /**
   * Delete own account (authenticated user)
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const success = await this.userService.deleteUser(userId);
      if (success) {
        res.clearCookie('docmaster_token');
        res.status(200).json({ message: 'Compte supprimé avec succès', success: true });
      } else {
        res.status(404).json({ error: 'Utilisateur introuvable' });
      }
    } catch (error: any) {
      console.error('[deleteAccount]', error);
      res.status(500).json({ error: error.message || 'Erreur lors de la suppression du compte' });
    }
  }

  /**
   * Delete user (Admin)
   */
  async deleteAdminUser(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      const currentUser = (req as any).user;
      if (currentUser.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (id === currentUser.id) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      const success = await this.userService.deleteUser(id);
      if (success) {
        res.status(200).json({ message: 'User deleted successfully', success: true });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  }

  /**
   * Google OAuth Login/Registration
   * Creates user if doesn't exist, returns JWT token for established user
   */
  async googleOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      // Verify Firebase ID token
      let decoded;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch {
        res.status(401).json({ error: 'Invalid or expired Firebase token' });
        return;
      }

      const email = decoded.email;
      if (!email) {
        res.status(400).json({ error: 'Email not provided in Google token' });
        return;
      }

      const displayName = decoded.name || '';
      const photoUrl = decoded.picture || null;

      try {
        // Try to find existing user
        let user = await this.userService.getUserByEmail(email);

        if (!user) {
          // Create new user from Google OAuth
          // Extract name parts from displayName
          const nameParts = displayName.split(' ');
          const prenom = nameParts[0] || 'User';
          const nom = nameParts.slice(1).join(' ') || 'Google';

          user = await this.userService.registerUser({
            nom,
            prenom,
            email,
            telephone: null,
            pays: 'Cameroun',
            ville: 'Yaoundé',
            is_verified: true, // Google users are pre-verified
          });

          console.log('✓ New Google OAuth user created:', email);
        } else {
          console.log('✓ Existing Google OAuth user logged in:', email);
        }

        const session = await this.userService.createUserSession(user);

        res.cookie('docmaster_token', session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        const { mot_de_passe: _, ...userWithoutPassword } = user;

        res.status(200).json({
          message: 'Google OAuth login successful',
          user: userWithoutPassword,
          token: session.token,
          refresh_token: session.refresh_token,
        });
      } catch (error: any) {
        if (error.message.includes('duplicate key')) {
          res.status(409).json({ error: 'Email already exists' });
        } else {
          res.status(500).json({ error: error.message || 'Google OAuth login failed' });
        }
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Google OAuth login failed' });
    }
  }
}
