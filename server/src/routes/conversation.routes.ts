import { Router } from 'express';
import {
  closeConversation,
  getMessages,
  listConversations,
  markRead,
  sendMessage,
  setArchived,
} from '../controllers/conversation.controller.ts';

const router = Router();

/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: Liste les conversations de l'acteur connecté (propriétaire ou trouveur)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, unread, archived]
 *     responses:
 *       200:
 *         description: Conversations avec contrepartie, dernier message et compteur non lus
 *       401:
 *         description: Non authentifié
 */
router.get('/', listConversations);

/**
 * @swagger
 * /conversations/{id}/messages:
 *   get:
 *     summary: Messages d'une conversation (du plus ancien au plus récent)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messages
 *       403:
 *         description: Acteur non participant
 *       404:
 *         description: Conversation introuvable
 */
router.get('/:id/messages', getMessages);

/**
 * @swagger
 * /conversations/{id}/messages:
 *   post:
 *     summary: Envoyer un message dans la conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Message persisté et diffusé aux participants connectés
 *       409:
 *         description: Conversation fermée
 */
router.post('/:id/messages', sendMessage);

/**
 * @swagger
 * /conversations/{id}/read:
 *   patch:
 *     summary: Marquer la conversation comme lue
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lu
 */
router.patch('/:id/read', markRead);

/**
 * @swagger
 * /conversations/{id}/close:
 *   post:
 *     summary: Cloturer la conversation (remise effectuée)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversation clôturée
 */
router.post('/:id/close', closeConversation);

/**
 * @swagger
 * /conversations/{id}/archive:
 *   post:
 *     summary: Archiver ou désarchiver une conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statut à jour
 */
router.post('/:id/archive', setArchived);

/**
 * Le routeur est monté deux fois (portail user sous /api/conversations, portail partenaire sous
 * /api/partenaires/conversations). L'autorisation réelle est la participation au fil,
 * contrôlée dans MessagingService — pas le préfixe d'URL.
 */
export default router;
