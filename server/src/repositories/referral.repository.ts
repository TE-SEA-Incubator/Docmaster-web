import { pool } from '../database/db.ts';

export class ReferralRepository {
  /**
   * Create a new referral and award rewards to both parrain and filleul
   */
  async createReferral(parrainId: string, filleulId: string, pointsGagnes: number = 500): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert into referrals table
      const insertRefQuery = `
        INSERT INTO referrals (parrain_id, filleul_id, points_gagnes, status, recompense_attribuee)
        VALUES ($1, $2, $3, 'VALIDATED', true)
        RETURNING *
      `;
      const { rows: refRows } = await client.query(insertRefQuery, [parrainId, filleulId, pointsGagnes]);
      
      // 2. Award Parrain: +500 XAF to wallet_balance and +10 points
      const updateParrainQuery = `
        UPDATE users 
        SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
            points = COALESCE(points, 0) + 10
        WHERE id = $2
      `;
      await client.query(updateParrainQuery, [pointsGagnes, parrainId]);

      // 3. Award Filleul: 1 month Standard plan
      const planId = 'standard';
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const insertSubQuery = `
        INSERT INTO user_subscriptions (user_id, plan_id, date_debut, date_fin, status, avantages_restants)
        VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
      `;
      // Avantages restants include 3 free declarations as requested in the UI
      const avantages = JSON.stringify({ declarations: 3 });
      await client.query(insertSubQuery, [filleulId, planId, startDate, endDate, avantages]);

      await client.query('COMMIT');
      return refRows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error in createReferral transaction:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all referrals for a user (as a parrain)
   */
  async getReferralsByParrain(parrainId: string): Promise<any[]> {
    const query = `
      SELECT r.*, u.nom, u.prenom, u.photo_url, u.created_at as filleul_created_at
      FROM referrals r
      JOIN users u ON r.filleul_id = u.id
      WHERE r.parrain_id = $1
      ORDER BY r.created_at DESC
    `;
    const { rows } = await pool.query(query, [parrainId]);
    return rows;
  }

  /**
   * Get all referrals for Admin
   */
  async getAllReferrals(): Promise<any[]> {
    const query = `
      SELECT 
        r.*, 
        p.nom as parrain_nom, p.prenom as parrain_prenom, p.email as parrain_email,
        f.nom as filleul_nom, f.prenom as filleul_prenom, f.email as filleul_email
      FROM referrals r
      JOIN users p ON r.parrain_id = p.id
      JOIN users f ON r.filleul_id = f.id
      ORDER BY r.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Admin: Reward a referral manually
   */
  async rewardReferral(id: string): Promise<any> {
    const query = `
      UPDATE referrals 
      SET recompense_attribuee = true 
      WHERE id = $1 AND recompense_attribuee = false
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      throw new Error('Le parrainage est déjà récompensé ou n\'existe pas.');
    }

    const ref = rows[0];
    
    // Add points/wallet to parrain
    const rewardAmount = ref.points_gagnes || 500;
    const updateParrainQuery = `
      UPDATE users 
      SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
          points = COALESCE(points, 0) + 10 -- Bonus points
      WHERE id = $2
    `;
    await pool.query(updateParrainQuery, [rewardAmount, ref.parrain_id]);

    return ref;
  }
}
