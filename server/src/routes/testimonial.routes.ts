import { Router } from 'express';
import {
  createTestimonial,
  getTestimonialEligibility,
  listPublicTestimonials,
} from '../controllers/testimonial.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Testimonials
 *   description: Témoignages après matching ou récupération
 */

/**
 * @swagger
 * /testimonials:
 *   get:
 *     summary: Témoignages publiés (public)
 *     tags: [Testimonials]
 */
router.get('/', listPublicTestimonials);

/**
 * @swagger
 * /testimonials:
 *   post:
 *     summary: Publier un témoignage après matching ou récupération
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authMiddleware, createTestimonial);

/**
 * @swagger
 * /testimonials/eligibility/{declarationId}:
 *   get:
 *     summary: Savoir si un avis peut être déposé pour cette déclaration
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 */
router.get('/eligibility/:declarationId', authMiddleware, getTestimonialEligibility);

export default router;
