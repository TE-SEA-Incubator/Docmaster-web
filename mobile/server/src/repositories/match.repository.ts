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
  ) {
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

  async findByDeclarationId(declarationId: string) {
    const query = `
      SELECT * FROM matches 
      WHERE lost_declaration_id = $1 OR found_declaration_id = $1
    `;
    const { rows } = await pool.query(query, [declarationId]);
    return rows;
  }
}
