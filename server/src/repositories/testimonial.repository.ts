import pool from '../database/db.js';
import {
  PublicTestimonial,
  Testimonial,
  TestimonialContext,
} from '../types/database.ts';

function buildAuthorLabel(prenom?: string | null, nom?: string | null): string {
  const first = String(prenom || '').trim();
  const lastInitial = String(nom || '').trim().charAt(0).toUpperCase();
  const label = [first, lastInitial ? `${lastInitial}.` : ''].filter(Boolean).join(' ');
  return label || 'DocMaster';
}

export class TestimonialRepository {
  async findByUserAndDeclaration(
    userId: string,
    declarationId: string,
  ): Promise<Testimonial | null> {
    const { rows } = await pool.query(
      `SELECT * FROM testimonials WHERE user_id = $1 AND declaration_id = $2 LIMIT 1`,
      [userId, declarationId],
    );
    return rows[0] || null;
  }

  async create(data: {
    user_id: string;
    declaration_id: string;
    context: TestimonialContext;
    rating: number;
    comment: string;
  }): Promise<Testimonial> {
    const { rows } = await pool.query(
      `INSERT INTO testimonials (user_id, declaration_id, context, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.user_id, data.declaration_id, data.context, data.rating, data.comment],
    );
    return rows[0];
  }

  /**
   * Avis publiés pour la page publique. L'identité est réduite au prénom et à
   * l'initiale du nom, et les comptes bloqués sont exclus.
   */
  async findPublished(limit: number): Promise<PublicTestimonial[]> {
    const { rows } = await pool.query(
      `SELECT t.id, t.context, t.rating, t.comment, t.created_at,
              u.prenom, u.nom
       FROM testimonials t
       JOIN users u ON u.id = t.user_id
       WHERE t.status = 'PUBLISHED'
         AND u.blocked_at IS NULL
       ORDER BY t.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((row) => ({
      id: row.id,
      author_label: buildAuthorLabel(row.prenom, row.nom),
      context: row.context,
      rating: Number(row.rating),
      comment: row.comment,
      created_at: row.created_at,
    }));
  }
}
