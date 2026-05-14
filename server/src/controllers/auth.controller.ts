import { Request, Response } from 'express';
import { UserService } from '../services/auth.service.ts';
import { generateToken } from '../config/jwt.ts';

export class AuthController {
  private userService = new UserService();

  /**
   * Register user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { nom, prenom, email, mot_de_passe, telephone, pays, ville, code_parrainage, is_verified } = req.body;

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

      // Register user
      const user = await this.userService.registerUser({
        nom,
        prenom,
        email,
        mot_de_passe,
        telephone,
        pays,
        ville,
        parrain_id,
        is_verified,
      });

      // Return user without password
      const { mot_de_passe: _, ...userWithoutPassword } = user;
      
      // Generate token for auto-login
      const token = generateToken(user.id, user.email, user.role);

      res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword,
        token,
        code_invitation: user.code_invitation,
      });
    } catch (error: any) {
      // Handle duplicate email
      if (error.message.includes('duplicate key')) {
        res.status(409).json({ error: 'Email already exists' });
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
      const { user, token } = await this.userService.loginUser(email, mot_de_passe);

      res.status(200).json({
        message: 'Login successful',
        user,
        token,
      });
    } catch (error: any) {
      if (error.message.includes('Invalid email or password')) {
        res.status(401).json({ error: 'Invalid email or password' });
      } else {
        res.status(500).json({ error: error.message || 'Login failed' });
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

      const token = await this.userService.requestPasswordReset(email);

      res.status(200).json({
        message: 'Password reset email sent',
        token, // In production, send this via email, not in response
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
      const { nom, prenom, telephone, date_naissance, lieu_naissance, currency } = req.body;
      let photo_url: string | undefined = undefined;

      // Handle photo upload if present
      if (req.file) {
        photo_url = `uploads/profiles/${req.file.filename}`;
      }

      const updatedUser = await this.userService.updateProfile(userId, {
        nom,
        prenom,
        telephone,
        photo_url,
        date_naissance,
        lieu_naissance,
        currency
      });

      const { mot_de_passe: _, ...userWithoutPassword } = updatedUser;
      res.status(200).json({
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });
    } catch (error: any) {
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
      res.status(200).json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch profile' });
    }
  }

  /**
   * Get all users (Admin)
   */
  async getAdminUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.getAllUsersForAdmin();
      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  }

  /**
   * Send verification PIN to email
   */
  async sendVerificationPin(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email required' });
        return;
      }

      await this.userService.sendVerificationPin(email);
      res.status(200).json({ message: 'Verification code sent to email' });
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
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch earnings stats' });
    }
  }
}
