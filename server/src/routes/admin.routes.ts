import { Router } from 'express';
import { getActivityLogs } from '../controllers/admin/activity.controller.ts';
import { getRecentMatches, getMatchingStats } from '../controllers/admin/match-monitor.controller.ts';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.ts';
import { query } from '../database/db.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Endpoints d'administration — accès réservé aux administrateurs
 */

router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @swagger
 * /admin/activity-log:
 *   get:
 *     summary: Récupérer le journal d'activité administrateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par ID utilisateur
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *         description: Filtrer par type d'action
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filtrer par type d'entité
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre de résultats par page
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de début (ISO 8601)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de fin (ISO 8601)
 *     responses:
 *       200:
 *         description: Journal d'activité récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityLog'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit — Privilèges administrateur requis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/activity-log', getActivityLogs);

/**
 * @swagger
 * /admin/matching/recent:
 *   get:
 *     summary: Récupérer les correspondances récentes (matching)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Correspondances récentes récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       lost_declaration_id:
 *                         type: string
 *                         format: uuid
 *                       found_declaration_id:
 *                         type: string
 *                         format: uuid
 *                       score:
 *                         type: integer
 *                         example: 85
 *                       status:
 *                         type: string
 *                         enum: [PENDING, CONFIRMED, REJECTED]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       details:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           criteria:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: "Empreinte numérique"
 *                                 points:
 *                                   type: integer
 *                                   example: 100
 *                                 max:
 *                                   type: integer
 *                                   example: 100
 *                                 matched:
 *                                   type: boolean
 *                                   example: true
 *                                 icon:
 *                                   type: string
 *                                   example: "✓"
 *                                 detail:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "Identique"
 *                       lost_identifiant:
 *                         type: string
 *                         example: "DM_2024_001"
 *                       lost_owner_name:
 *                         type: string
 *                         example: "Jean Dupont"
 *                       lost_doc_type:
 *                         type: string
 *                         example: "CNI"
 *                       lost_ville:
 *                         type: string
 *                         example: "Douala"
 *                       lost_quartier:
 *                         type: string
 *                         nullable: true
 *                         example: "Akwa"
 *                       found_identifiant:
 *                         type: string
 *                         example: "DM_2024_045"
 *                       found_owner_name:
 *                         type: string
 *                         example: "Marie Paul"
 *                       found_doc_type:
 *                         type: string
 *                         example: "CNI"
 *                       found_ville:
 *                         type: string
 *                         example: "Douala"
 *                       found_quartier:
 *                         type: string
 *                         nullable: true
 *                         example: "Akwa"
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/matching/recent', getRecentMatches);

/**
 * @swagger
 * /admin/matching/stats:
 *   get:
 *     summary: Récupérer les statistiques de matching
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques de matching récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MatchingStats'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/matching/stats', getMatchingStats);

/**
 * @swagger
 * /admin/global-search:
 *   get:
 *     summary: Recherche globale (utilisateurs + déclarations)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Terme de recherche (minimum 2 caractères)
 *         example: "Jean"
 *     responses:
 *       200:
 *         description: Résultats de la recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     declarations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DocumentDeclaration'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       403:
 *         description: Accès interdit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error403'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
router.get('/global-search', async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, data: { users: [], declarations: [] } });
  }
  const like = `%${q}%`;
  try {
    const [usersRes, declRes] = await Promise.all([
      query(
        `SELECT id, name, email, phone, role, created_at FROM users
         WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
         ORDER BY created_at DESC LIMIT 5`,
        [like]
      ),
      query(
        `SELECT d.id, d.doc_master_id, d.declaration_type, d.status, d.created_at,
                u.name as user_name
         FROM declarations d
         LEFT JOIN users u ON d.user_id = u.id
         WHERE d.doc_master_id ILIKE $1 OR d.declaration_type ILIKE $1 OR u.name ILIKE $1
         ORDER BY d.created_at DESC LIMIT 5`,
        [like]
      ),
    ]);
    res.json({
      success: true,
      data: {
        users: usersRes.rows,
        declarations: declRes.rows,
      },
    });
  } catch (err: any) {
    console.error('[GlobalSearch]', err.message);
    res.status(500).json({ success: false, message: 'Erreur de recherche' });
  }
});

export default router;
