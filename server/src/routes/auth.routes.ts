import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { upload } from '../utils/upload.utils.ts';

const router = Router();
const authController = new AuthController();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', (req, res) => authController.register(req, res));
router.post('/send-verification-pin', (req, res) => authController.sendVerificationPin(req, res));
router.post('/verify-email-pin', (req, res) => authController.verifyEmailPin(req, res));

/**
 * POST /auth/login
 * Login user and get JWT token
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

/**
 * GET /auth/profile
 * Get current user profile (Protected)
 */
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

/**
 * PUT /auth/profile
 * Update user profile (Protected)
 */
router.put('/profile', authMiddleware, upload.single('photo_profile'), (req, res) => authController.updateProfile(req, res));
router.get('/earnings-stats', authMiddleware, (req, res) => authController.getEarningsStats(req, res));

/**
 * GET /auth/admin/users
 * Admin: Get all users
 */
router.get('/admin/users', authMiddleware, (req, res) => authController.getAdminUsers(req, res));

export default router;
