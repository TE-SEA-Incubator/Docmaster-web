import pool from "../../database/db.js";

export interface PartenaireProfile {
  id: string;
  nom_organisation: string;
  adresse: string | null;
  logo_url: string | null;
  statut: 'ACTIF' | 'SUSPENDU' | 'INACTIF';
  must_change_password: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  // colonnes autonomes (plus de lien users)
  email: string;
  mot_de_passe?: string;
  telephone: string | null;
  nom_contact: string | null;
  prenom_contact: string | null;
  ville: string | null;
  region?: string | null;
  wallet_balance: number;
  points: number;
  is_verified: boolean;
}

const PUBLIC_COLUMNS = `
  p.id, p.nom_organisation, p.adresse, p.logo_url,
  p.statut, p.must_change_password, p.created_by, p.created_at, p.updated_at,
  p.email, p.telephone, p.nom_contact, p.prenom_contact,
  p.ville, p.region, p.wallet_balance, p.points, p.is_verified
`;

const WITH_PASSWORD_COLUMNS = `${PUBLIC_COLUMNS}, p.mot_de_passe`;

interface PartenaireCreateData {
  nom_organisation: string;
  adresse?: string;
  email: string;
  mot_de_passe: string;
  telephone?: string | null;
  nom_contact?: string | null;
  prenom_contact?: string | null;
  ville?: string | null;
  region?: string | null;
  created_by?: string;
}

interface PartenaireUpdateData {
  nom_organisation?: string;
  adresse?: string;
  logo_url?: string | null;
  statut?: 'ACTIF' | 'SUSPENDU' | 'INACTIF';
  email?: string;
  telephone?: string | null;
  nom_contact?: string | null;
  prenom_contact?: string | null;
  ville?: string | null;
  region?: string | null;
  is_verified?: boolean;
}

export class PartenaireRepository {
  /**
   * Create a standalone partner account (no linked user)
   */
  async create(data: PartenaireCreateData): Promise<PartenaireProfile> {
    const query = `
      INSERT INTO partenaires (nom_organisation, adresse, email, mot_de_passe, telephone, nom_contact, prenom_contact, ville, region, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, nom_organisation, adresse, logo_url, statut, must_change_password, created_by,
                created_at, updated_at, email, telephone, nom_contact, prenom_contact,
                ville, region, wallet_balance, is_verified, mot_de_passe
    `;
    const { rows } = await pool.query(query, [
      data.nom_organisation,
      data.adresse || null,
      data.email,
      data.mot_de_passe,
      data.telephone || null,
      data.nom_contact || null,
      data.prenom_contact || null,
      data.ville || null,
      data.region || null,
      data.created_by || null,
    ]);
    return rows[0];
  }

  /**
   * Find profile by email (for login)
   */
  async findByEmail(email: string): Promise<PartenaireProfile | null> {
    const query = `
      SELECT ${WITH_PASSWORD_COLUMNS}
      FROM partenaires p
      WHERE LOWER(p.email) = LOWER($1)
    `;
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  }

  /**
   * Find profile by partenaire id
   */
  async findById(id: string): Promise<PartenaireProfile | null> {
    const query = `
      SELECT ${PUBLIC_COLUMNS}
      FROM partenaires p
      WHERE p.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find profile by id including password (internal use)
   */
  async findByIdWithPassword(id: string): Promise<PartenaireProfile | null> {
    const query = `
      SELECT ${WITH_PASSWORD_COLUMNS}
      FROM partenaires p
      WHERE p.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * List partners with pagination, search and status filter
   */
  async findAll(filters: {
    search?: string;
    statut?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rows: PartenaireProfile[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`(p.nom_organisation ILIKE $${idx} OR p.email ILIKE $${idx} OR p.nom_contact ILIKE $${idx} OR p.prenom_contact ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.statut) {
      conditions.push(`p.statut = $${idx++}`);
      params.push(filters.statut);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM partenaires p ${where}`,
      params
    );
    const total = countRes.rows[0].total;

    const query = `
      SELECT ${PUBLIC_COLUMNS}
      FROM partenaires p
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const { rows } = await pool.query(query, [...params, limit, offset]);
    return { rows, total };
  }

  /**
   * Update the partenaire profile
   */
  async update(id: string, data: PartenaireUpdateData): Promise<PartenaireProfile | null> {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fields: Record<string, any> = {
      nom_organisation: data.nom_organisation,
      adresse: data.adresse,
      logo_url: data.logo_url,
      statut: data.statut,
      email: data.email,
      telephone: data.telephone,
      nom_contact: data.nom_contact,
      prenom_contact: data.prenom_contact,
      ville: data.ville,
      region: data.region,
      is_verified: data.is_verified,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    await pool.query(
      `UPDATE partenaires SET ${sets.join(', ')} WHERE id = $${idx}`,
      params
    );
    return this.findById(id);
  }

  /**
   * Update password and reset the must_change_password flag
   */
  async updatePassword(id: string, newHashedPassword: string): Promise<void> {
    await pool.query(
      `UPDATE partenaires SET mot_de_passe = $1, must_change_password = false, is_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHashedPassword, id]
    );
  }

  /**
   * Store a password reset token for a partner
   */
  async setPasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    await pool.query(
      `UPDATE partenaires
       SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, expires, id]
    );
  }

  /**
   * Find a partner by a valid (non-expired) password reset token
   */
  async findByResetToken(token: string): Promise<PartenaireProfile | null> {
    const query = `
      SELECT ${WITH_PASSWORD_COLUMNS}
      FROM partenaires p
      WHERE p.password_reset_token = $1 AND p.password_reset_expires > CURRENT_TIMESTAMP
    `;
    const { rows } = await pool.query(query, [token]);
    return rows[0] || null;
  }

  /**
   * Clear the password reset token after a successful reset
   */
  async clearPasswordResetToken(id: string): Promise<void> {
    await pool.query(
      `UPDATE partenaires
       SET password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }

  async setRefreshToken(id: string, tokenHash: string, expires: Date): Promise<void> {
    await pool.query(
      `UPDATE partenaires
       SET refresh_token_hash = $1, refresh_token_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [tokenHash, expires, id]
    );
  }

  async findByRefreshTokenHash(tokenHash: string): Promise<PartenaireProfile | null> {
    const query = `
      SELECT ${PUBLIC_COLUMNS}
      FROM partenaires p
      WHERE p.refresh_token_hash = $1 AND p.refresh_token_expires > CURRENT_TIMESTAMP
    `;
    const { rows } = await pool.query(query, [tokenHash]);
    return rows[0] || null;
  }

  async clearRefreshToken(id: string): Promise<void> {
    await pool.query(
      `UPDATE partenaires
       SET refresh_token_hash = NULL, refresh_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * Delete a partner profile (nothing else to cascade, fully standalone)
   */
  async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM partenaires WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  /**
   * Count declarations made by the partner (reporter_id = partenaire id)
   */
  async countDeclarations(partenaireId: string, declarationType?: string): Promise<number> {
    const params: any[] = [partenaireId];
    let sql = `SELECT COUNT(*)::int AS count FROM declarations WHERE reporter_id = $1 AND reporter_type = 'PARTENAIRE'`;
    if (declarationType) {
      sql += ` AND declaration_type = $2`;
      params.push(declarationType);
    }
    const { rows } = await pool.query(sql, params);
    return rows[0].count;
  }
}
