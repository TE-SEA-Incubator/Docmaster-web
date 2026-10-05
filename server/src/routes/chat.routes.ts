import { Router, Request, Response, NextFunction } from 'express';
import { chatCompletion } from '../controllers/chat.controller.ts';

const router = Router();

/**
 * Simple in-memory rate limiter (per IP)
 * Limits: 10 requests per minute, 60 per hour
 */
const WINDOW_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_MINUTE = 10;
const MAX_PER_HOUR = 60;

const hits = new Map<string, number[]>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.ip || req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < HOUR_MS);
  list.push(now);

  const lastMinute = list.filter((t) => now - t < WINDOW_MS).length;
  if (lastMinute > MAX_PER_MINUTE || list.length > MAX_PER_HOUR) {
    hits.set(ip, list.slice(0, 1000));
    return res.status(429).json({
      success: false,
      message: "Trop de requêtes. Veuillez patienter quelques instants avant de continuer.",
    });
  }
  hits.set(ip, list);
  next();
}

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Assistant IA Docmaster (Groq)
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string }
 *               user:
 *                 type: object
 *                 properties:
 *                   prenom: { type: string }
 *                   nom: { type: string }
 *                   points: { type: number }
 *                   subscription: { type: string }
 *     responses:
 *       200:
 *         description: Réponse de l'assistant
 */
router.post("/", rateLimit, chatCompletion);

export default router;
