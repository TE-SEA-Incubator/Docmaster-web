import { Request, Response } from 'express';
import { pool } from '../database/db.ts';
import { TestimonialRepository } from '../repositories/testimonial.repository.ts';
import { HttpError, errorStatus } from '../utils/http-error.ts';
import { TestimonialContext } from '../types/database.ts';

const testimonialRepository = new TestimonialRepository();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface OwnedDeclaration {
  id: string;
  reporter_id: string;
  status: string | null;
  payment_status: string | null;
}

async function loadOwnedDeclaration(
  userId: string,
  declarationId: string,
): Promise<OwnedDeclaration> {
  const { rows } = await pool.query(
    `SELECT id, reporter_id, status, payment_status
     FROM declarations WHERE id = $1`,
    [declarationId],
  );
  const declaration = rows[0];
  if (!declaration) throw new HttpError(404, 'Déclaration introuvable.');
  if (declaration.reporter_id !== userId) {
    throw new HttpError(403, 'Cette déclaration ne vous appartient pas.');
  }
  return declaration;
}

/**
 * Un avis n'est ouvert qu'une fois le document trouvé (MATCHED) ou récupéré
 * (retour validé ou paiement confirmé). Le contexte est déduit de l'état réel.
 */
function reviewContext(declaration: OwnedDeclaration): {
  eligible: boolean;
  context: TestimonialContext | null;
  reason: string | null;
} {
  const status = String(declaration.status || '').toUpperCase();
  const paymentStatus = String(declaration.payment_status || '').toUpperCase();
  const recovered = status === 'RETURNED' || paymentStatus === 'PAID';
  if (!recovered && status !== 'MATCHED') {
    return { eligible: false, context: null, reason: 'NO_MATCH_OR_RECOVERY' };
  }
  return {
    eligible: true,
    context: recovered ? 'RECOVERY' : 'MATCH',
    reason: null,
  };
}

export const getTestimonialEligibility = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    const rawId = req.params.declarationId;
    const declarationId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!UUID_RE.test(declarationId || '')) {
      return res.status(400).json({ success: false, message: 'Déclaration invalide.' });
    }

    const declaration = await loadOwnedDeclaration(userId, declarationId);
    const { eligible, context, reason } = reviewContext(declaration);
    const testimonial = await testimonialRepository.findByUserAndDeclaration(
      userId,
      declarationId,
    );

    return res.json({
      success: true,
      data: {
        eligible,
        context,
        reason,
        declaration_status: declaration.status,
        testimonial,
      },
    });
  } catch (error: any) {
    return res.status(errorStatus(error, 500)).json({
      success: false,
      message: error?.message || 'Impossible de vérifier votre éligibilité.',
    });
  }
};

export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const declarationId = String(req.body?.declaration_id || '');
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();

    if (!UUID_RE.test(declarationId)) {
      return res.status(400).json({ success: false, message: 'Déclaration invalide.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, message: 'Choisissez un niveau de satisfaction de 1 à 5.' });
    }
    if (comment.length < 10 || comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Écrivez un témoignage de 10 à 500 caractères.',
      });
    }

    const declaration = await loadOwnedDeclaration(userId, declarationId);
    const { eligible, context, reason } = reviewContext(declaration);
    if (!eligible || !context) {
      return res.status(409).json({
        success: false,
        message:
          'Vous pourrez donner votre avis dès qu’une correspondance ou une récupération sera confirmée.',
        data: { reason },
      });
    }

    const existing = await testimonialRepository.findByUserAndDeclaration(
      userId,
      declarationId,
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà donné votre avis pour cette déclaration.',
        data: existing,
      });
    }

    const testimonial = await testimonialRepository.create({
      user_id: userId,
      declaration_id: declarationId,
      context,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: 'Merci pour votre témoignage.',
      data: testimonial,
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res
        .status(409)
        .json({ success: false, message: 'Vous avez déjà donné votre avis pour cette déclaration.' });
    }
    return res.status(errorStatus(error, 500)).json({
      success: false,
      message: error?.message || 'Envoi de votre témoignage impossible pour le moment.',
    });
  }
};

export const listPublicTestimonials = async (req: Request, res: Response) => {
  try {
    const requested = Number(req.query.limit);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), 30)
      : 12;
    const testimonials = await testimonialRepository.findPublished(limit);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json({ success: true, data: testimonials });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Impossible de charger les témoignages.',
    });
  }
};
