import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.ts';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.ts';
import { upload } from '../utils/upload.utils.ts';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints pour la gestion des utilisateurs et de l'authentification
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscrire un nouvel utilisateur
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, prenom, email, mot_de_passe]
 *             properties:
 *               nom: { type: string, example: "Dupont" }
 *               prenom: { type: string, example: "Jean" }
 *               email: { type: string, example: "jean.dupont@example.com" }
 *               mot_de_passe: { type: string, example: "password123" }
 *               telephone: { type: string, example: "+237677000000" }
 *               pays: { type: string, example: "Cameroun" }
 *               ville: { type: string, example: "Douala" }
 *               code_parrainage: { type: string, example: "ABC12XYZ" }
 *               is_verified: { type: boolean, example: false }
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: "User registered successfully"
 *               user: { id: "uuid", nom: "Dupont", prenom: "Jean", email: "jean.dupont@example.com", telephone: "+237...", pays: "Cameroun", ville: "Douala", points: 0, wallet_balance: "0.00", is_verified: false, role: "USER" }
 *               token: "eyJhbGciOiJIUzI1NiIsInR..."
 *               code_invitation: "ABC12XYZ"
 *       400:
 *         description: Champs manquants
 *         content:
 *           application/json:
 *             example: { error: "Missing required fields" }
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             example: { error: "Email already exists" }
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             example: { error: "Registration failed" }
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, mot_de_passe]
 *             properties:
 *               email: { type: string, example: "jean.dupont@example.com" }
 *               mot_de_passe: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             example:
 *               message: "Login successful"
 *               user: { id: "uuid", nom: "Dupont", prenom: "Jean", email: "jean.dupont@example.com", role: "USER" }
 *               token: "eyJhbGciOiJIUzI1NiIsInR..."
 *       400:
 *         description: Champs manquants
 *         content:
 *           application/json:
 *             example: { error: "Email and password required" }
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             example: { error: "Invalid email or password" }
 *       500:
 *         description: Erreur serveur
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnecter l'utilisateur (supprime le cookie)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/logout', (req, res) => authController.logout(req, res));

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré
 *         content:
 *           application/json:
 *             example:
 *               id: "uuid"
 *               nom: "Dupont"
 *               prenom: "Jean"
 *               email: "jean.dupont@example.com"
 *               telephone: "+237..."
 *               points: 150
 *               wallet_balance: "2500.00"
 *               is_verified: true
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             example: { error: "User not found" }
 *       500:
 *         description: Erreur serveur
 */
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Mettre à jour le profil
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *               date_naissance: { type: string, format: date }
 *               lieu_naissance: { type: string }
 *               currency: { type: string }
 *               photo_profile: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *         content:
 *           application/json:
 *             example:
 *               message: "Profile updated successfully"
 *               user: { id: "uuid", nom: "Dupont", prenom: "Jean", photo_url: "uploads/profiles/..." }
 *       500:
 *         description: Erreur serveur
 */
router.put('/profile', authMiddleware, upload.single('photo_profile'), (req, res) => authController.updateProfile(req, res));

/**
 * @swagger
 * /auth/password:
 *   put:
 *     summary: Changer le mot de passe de l'utilisateur connecté
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: "ancien_mdp123" }
 *               newPassword: { type: string, example: "nouveau_mdp456!" }
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *         content:
 *           application/json:
 *             example: { message: "Password changed successfully" }
 *       400:
 *         description: Champs manquants
 *         content:
 *           application/json:
 *             example: { error: "Current password and new password are required" }
 *       401:
 *         description: Mot de passe actuel incorrect
 *         content:
 *           application/json:
 *             example: { error: "Current password is incorrect" }
 *       500:
 *         description: Erreur serveur
 */
router.put('/password', authMiddleware, (req, res) => authController.changePassword(req, res));

/**
 * @swagger
 * /auth/earnings-stats:
 *   get:
 *     summary: Récupérer les statistiques de gains et points
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 total_points: 340
 *                 stats: { total_found: 8, total_returned: 5 }
 *                 points_breakdown: { declarations: { count: 4, points: 200, pts_per_unit: 50 }, returns: { count: 1, points: 100, pts_per_unit: 100 } }
 *       500:
 *         description: Erreur serveur
 */
router.get('/earnings-stats', authMiddleware, (req, res) => authController.getEarningsStats(req, res));

/**
 * @swagger
 * /auth/send-verification-pin:
 *   post:
 *     summary: Envoyer le code PIN par email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "jean@example.com" }
 *     responses:
 *       200:
 *         description: Code envoyé
 *         content:
 *           application/json:
 *             example: { message: "Verification code sent to email" }
 *       400:
 *         description: Email requis
 *       500:
 *         description: Erreur serveur
 */
router.post('/send-verification-pin', (req, res) => authController.sendVerificationPin(req, res));

/**
 * @swagger
 * /auth/verify-email-pin:
 *   post:
 *     summary: Vérifier le code PIN email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, pin]
 *             properties:
 *               email: { type: string, example: "jean@example.com" }
 *               pin: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Vérification réussie
 *         content:
 *           application/json:
 *             example: { message: "Email verified successfully", success: true }
 *       400:
 *         description: PIN invalide
 *         content:
 *           application/json:
 *             example: { error: "Invalid or expired verification code", success: false }
 */
router.post('/verify-email-pin', (req, res) => authController.verifyEmailPin(req, res));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Demander la réinitialisation du mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "jean@example.com" }
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé
 *         content:
 *           application/json:
 *             example: { message: "Password reset email sent", token: "abcdef123456" }
 *       404:
 *         description: Utilisateur introuvable
 */
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string, example: "abcdef123456" }
 *               newPassword: { type: string, example: "newpass123!" }
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 *         content:
 *           application/json:
 *             example: { message: "Password reset successfully", user: { id: "uuid", email: "jean@example.com" } }
 *       401:
 *         description: Token invalide
 */
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

/**
 * @swagger
 * /auth/admin/users:
 *   get:
 *     summary: Liste des utilisateurs (Admin)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *       500:
 *         description: Erreur serveur
 */
router.get('/admin/users', authMiddleware, adminMiddleware, (req, res) => authController.getAdminUsers(req, res));

/**
 * @swagger
 * /auth/admin/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur (Admin)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Utilisateur introuvable
 */
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => authController.deleteAdminUser(req, res));

/**
 * @swagger
 * /auth/google-oauth:
 *   post:
 *     summary: Connexion avec Google OAuth (via Firebase)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, email]
 *             properties:
 *               token: { type: string, description: "Firebase ID Token de Google" }
 *               email: { type: string, example: "user@gmail.com" }
 *               displayName: { type: string, example: "Jean Dupont" }
 *               photoURL: { type: string, example: "https://..." }
 *     responses:
 *       200:
 *         description: Connexion ou création réussie
 *         content:
 *           application/json:
 *             example:
 *               message: "Google OAuth login successful"
 *               user: { id: "uuid", nom: "Dupont", prenom: "Jean", email: "user@gmail.com", photo_url: "https://...", role: "USER" }
 *               token: "eyJhbGciOiJIUzI1NiIsInR..."
 *       400:
 *         description: Token ou email manquant
 *       401:
 *         description: Token Firebase invalide
 *       500:
 *         description: Erreur serveur
 */
router.post('/google-oauth', (req, res) => authController.googleOAuth(req, res));

export default router;
