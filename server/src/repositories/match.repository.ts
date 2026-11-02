import { pool } from "../database/db.js";

export class MatchRepository {
  async exists(lostId: string, foundId: string): Promise<boolean> {
    const query =
      "SELECT 1 FROM matches WHERE lost_declaration_id = $1 AND found_declaration_id = $2";
    const { rows } = await pool.query(query, [lostId, foundId]);
    return rows.length > 0;
  }

  async create(
    lostId: string,
    foundId: string,
    score: number,
    status: string = "PENDING",
    details?: Record<string, unknown> | null,
  ) {
    if (details) {
      const query = `
        INSERT INTO matches (lost_declaration_id, found_declaration_id, score, status, details)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (lost_declaration_id, found_declaration_id) DO NOTHING
        RETURNING *
      `;
      const { rows } = await pool.query(query, [lostId, foundId, score, status, JSON.stringify(details)]);
      return rows[0];
    }
    const query = `
      INSERT INTO matches (lost_declaration_id, found_declaration_id, score, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (lost_declaration_id, found_declaration_id) DO NOTHING
      RETURNING *
    `;
    const { rows } = await pool.query(query, [lostId, foundId, score, status]);
    return rows[0];
  }

  async findBetween(lostId: string, foundId: string) {
    const query = `
      SELECT * FROM matches 
      WHERE (lost_declaration_id = $1 AND found_declaration_id = $2)
         OR (lost_declaration_id = $2 AND found_declaration_id = $1)
    `;
    const { rows } = await pool.query(query, [lostId, foundId]);
    return rows[0];
  }

  async updateScoreAndStatus(
    lostId: string,
    foundId: string,
    score: number,
    status: string,
    details?: Record<string, unknown> | null,
  ) {
    const q = `
      UPDATE matches
      SET score = $3, status = $4, details = COALESCE($5, details), updated_at = NOW()
      WHERE lost_declaration_id = $1 AND found_declaration_id = $2
        AND status <> 'REJECTED'
      RETURNING *
    `;
    const { rows } = await pool.query(q, [
      lostId,
      foundId,
      score,
      status,
      details ? JSON.stringify(details) : null,
    ]);
    return rows[0];
  }

  async findByDeclarationId(declarationId: string) {
    const query = `
      SELECT * FROM matches 
      WHERE lost_declaration_id = $1 OR found_declaration_id = $1
      ORDER BY score DESC, created_at DESC
    `;
    const { rows } = await pool.query(query, [declarationId]);
    return rows;
  }

  async findById(id: string) {
    const { rows } = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async findConfirmedByLost(lostId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM matches
       WHERE lost_declaration_id = $1 AND status = 'CONFIRMED'
       ORDER BY score DESC, created_at DESC`,
      [lostId],
    );
    return rows;
  }

  async findConfirmedByFound(foundId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM matches
       WHERE found_declaration_id = $1 AND status = 'CONFIRMED'
       ORDER BY score DESC, created_at DESC`,
      [foundId],
    );
    return rows;
  }

  async findActiveByFound(foundId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM matches
       WHERE found_declaration_id = $1 AND status IN ('PENDING', 'CONFIRMED')
       ORDER BY score DESC, created_at DESC`,
      [foundId],
    );
    return rows;
  }

  /**
   * Une déclaration perdue ne peut avoir qu'un seul document trouvé actif.
   * L'ordre privilégie une correspondance déjà confirmée par le propriétaire,
   * puis le meilleur score, puis la plus ancienne.
   */
  async findActiveByLost(lostId: string) {
    const { rows } = await pool.query(
      `SELECT * FROM matches
       WHERE lost_declaration_id = $1 AND status IN ('PENDING', 'CONFIRMED')
       ORDER BY (owner_confirmed_at IS NOT NULL) DESC, score DESC, created_at ASC`,
      [lostId],
    );
    return rows;
  }

  async rejectActiveByLost(lostId: string, reason: string) {
    const { rows } = await pool.query(
      `UPDATE matches
       SET status = 'REJECTED',
           closed_reason = $2,
           closed_at = NOW(),
           updated_at = NOW()
       WHERE lost_declaration_id = $1
         AND status IN ('PENDING', 'CONFIRMED')
       RETURNING *`,
      [lostId, reason],
    );
    return rows;
  }

  async closeOtherActiveForLost(lostId: string, winnerMatchId: string, reason: string) {
    const { rows } = await pool.query(
      `UPDATE matches
       SET status = 'REJECTED',
           closed_reason = $3,
           closed_at = NOW(),
           updated_at = NOW()
       WHERE lost_declaration_id = $1
         AND id <> $2
         AND status IN ('PENDING', 'CONFIRMED')
       RETURNING *`,
      [lostId, winnerMatchId, reason],
    );
    return rows;
  }

  async setOwnerConfirmation(matchId: string, userId: string) {
    const { rows } = await pool.query(
      `UPDATE matches
       SET status = 'CONFIRMED',
           owner_confirmed_at = NOW(),
           owner_confirmed_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [matchId, userId],
    );
    return rows[0] || null;
  }

  async closeCompetingMatches(foundId: string, winnerMatchId: string, reason: string) {
    const { rows } = await pool.query(
      `UPDATE matches
       SET status = 'REJECTED',
           closed_reason = $3,
           closed_at = NOW(),
           updated_at = NOW()
       WHERE found_declaration_id = $1
         AND id <> $2
         AND status IN ('PENDING', 'CONFIRMED')
       RETURNING *`,
      [foundId, winnerMatchId, reason],
    );
    return rows;
  }

  async reject(matchId: string, reason: string) {
    const { rows } = await pool.query(
      `UPDATE matches
       SET status = 'REJECTED',
           closed_reason = $2,
           closed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [matchId, reason],
    );
    return rows[0] || null;
  }

  async findForRefresh(limit = 100) {
    const { rows } = await pool.query(
      `SELECT * FROM matches
       WHERE status IN ('PENDING', 'CONFIRMED')
         AND owner_confirmed_at IS NULL
       ORDER BY updated_at ASC NULLS FIRST, created_at ASC
       LIMIT $1`,
      [limit],
    );
    return rows;
  }
}
