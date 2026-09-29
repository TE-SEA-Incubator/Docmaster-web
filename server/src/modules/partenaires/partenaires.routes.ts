import { Router } from 'express';
import { PartenaireController } from './partenaires.controller.ts';
import { partenaireAuthMiddleware } from './partenaires.middleware.ts';
import { authMiddleware, adminMiddleware } from '../../middleware/auth.middleware.ts';
import { upload } from '../../utils/upload.utils.ts';

const router = Router();
const controller = new PartenaireController();

/**
 * ── PUBLIC ──
 */
// POST /api/partenaires/login — partner login
router.post('/login', controller.login);
// POST /api/partenaires/refresh-token — refresh JWT
router.post('/refresh-token', controller.refreshToken);
// POST /api/partenaires/logout — partner logout
router.post('/logout', controller.logout);
// POST /api/partenaires/forgot-password — send password reset link
router.post('/forgot-password', controller.forgotPassword);
// POST /api/partenaires/reset-password — reset password with token
router.post('/reset-password', controller.resetPassword);

/**
 * ── PARTNER (JWT utilisateur role PARTNER) ──
 */
// POST /api/partenaires/change-password — first login mandatory password change
router.post('/change-password', partenaireAuthMiddleware, controller.changePassword);
// GET /api/partenaires/me — partner profile + wallet
router.get('/me', partenaireAuthMiddleware, controller.me);
// PUT /api/partenaires/profil — partner updates its own organisation profile
router.put('/profil', partenaireAuthMiddleware, controller.updateProfil);
// POST /api/partenaires/profil/logo — upload organisation logo
router.post('/profil/logo', partenaireAuthMiddleware, upload.single('logo'), controller.uploadLogo);
// GET /api/partenaires/stats — partner dashboard stats
router.get('/stats', partenaireAuthMiddleware, controller.getStats);
// GET /api/partenaires/declarations — partner's found declarations
router.get('/declarations', partenaireAuthMiddleware, controller.getDeclarations);
// POST /api/partenaires/declarations — create a found declaration (unlimited)
router.post('/declarations', partenaireAuthMiddleware, upload.fields([
  { name: 'photo_recto', maxCount: 1 },
  { name: 'photo_verso', maxCount: 1 }
]), controller.createFoundDeclaration);
// DELETE /api/partenaires/declarations/:id — partner deletes its own declaration
router.delete('/declarations/:id', partenaireAuthMiddleware, controller.deleteDeclaration);
// GET /api/partenaires/wallet — balance + history
router.get('/wallet', partenaireAuthMiddleware, controller.getWallet);
// GET /api/partenaires/earnings-stats — points + wallet stats
router.get('/earnings-stats', partenaireAuthMiddleware, controller.getEarningsStats);
// GET /api/partenaires/earnings — points/money earnings history
router.get('/earnings', partenaireAuthMiddleware, controller.getEarnings);
// POST /api/partenaires/points/convert — convert points to wallet FCFA
router.post('/points/convert', partenaireAuthMiddleware, controller.convertPoints);
// POST /api/partenaires/withdrawals/request — request withdrawal
router.post('/withdrawals/request', partenaireAuthMiddleware, controller.requestWithdrawal);
// GET /api/partenaires/withdrawals — get withdrawal history
router.get('/withdrawals', partenaireAuthMiddleware, controller.getWithdrawals);

/**
 * ── ADMIN (token utilisateur admin) ──
 */
// POST /api/partenaires — admin creates a partner
router.post('/', authMiddleware, adminMiddleware, controller.create);
// GET /api/partenaires — admin lists partners
router.get('/', authMiddleware, adminMiddleware, controller.findAll);
// GET /api/partenaires/:id — admin gets partner detail
router.get('/:id', authMiddleware, adminMiddleware, controller.findById);
// GET /api/partenaires/:id/wallet — admin gets partner wallet balance + history
router.get('/:id/wallet', authMiddleware, adminMiddleware, controller.getAdminWallet);
// PUT /api/partenaires/:id — admin updates a partner
router.put('/:id', authMiddleware, adminMiddleware, controller.update);
// POST /api/partenaires/:id/wallet — admin adjusts partner wallet
router.post('/:id/wallet', authMiddleware, adminMiddleware, controller.adjustWallet);
// DELETE /api/partenaires/:id — admin deletes a partner
router.delete('/:id', authMiddleware, adminMiddleware, controller.delete);

export default router;