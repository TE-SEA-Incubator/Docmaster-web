import { pool, query } from '../database/db.ts';
import { PartenaireEarningsRepository } from '../repositories/partenaire-earnings.repository.ts';
import { notificationService } from './notification.service.ts';

export class PartenairePointsService {
  private earningsRepository = new PartenaireEarningsRepository();

  async getExchangeRate(): Promise<number> {
    const res = await query("SELECT value FROM app_settings WHERE key = 'points_to_xaf_rate'");
    if (res.rows.length === 0) return 10;
    return Number(res.rows[0].value);
  }

  async convertPointsToWallet(partenaireId: string, amountPoints: number) {
    const rate = await this.getExchangeRate();
    const amountXaf = amountPoints / rate;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const partnerRes = await client.query(
        'SELECT COALESCE(points, 0)::int AS points, COALESCE(wallet_balance, 0)::float AS wallet_balance FROM partenaires WHERE id = $1 FOR UPDATE',
        [partenaireId]
      );
      if (partnerRes.rows.length === 0) throw new Error('Partenaire introuvable');

      const currentPoints = partnerRes.rows[0].points || 0;
      const balanceBefore = parseFloat(partnerRes.rows[0].wallet_balance || 0);
      if (currentPoints < amountPoints) {
        const error = new Error(
          `Solde de points insuffisant (${currentPoints} pts disponibles, ${amountPoints} pts requis)`
        );
        (error as any).status = 400;
        throw error;
      }

      await client.query('UPDATE partenaires SET points = points - $1, updated_at = NOW() WHERE id = $2', [
        amountPoints,
        partenaireId,
      ]);

      const updRes = await client.query(
        'UPDATE partenaires SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance, points',
        [amountXaf, partenaireId]
      );
      const balanceAfter = parseFloat(updRes.rows[0]?.wallet_balance || 0);
      const pointsAfter = updRes.rows[0]?.points || 0;

      await client.query(
        `INSERT INTO partenaire_wallet_transactions (partenaire_id, amount, balance_before, balance_after, type, reason, metadata)
         VALUES ($1, $2, $3, $4, 'CREDIT', 'OTHER', $5)`,
        [
          partenaireId,
          amountXaf,
          balanceBefore,
          balanceAfter,
          JSON.stringify({ motif: 'Conversion de points', amountPoints, rate }),
        ]
      );

      await client.query(
        `INSERT INTO partenaire_earnings_history (partenaire_id, type, amount, currency, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          partenaireId,
          'POINTS_CONVERSION',
          -amountPoints,
          'POINTS',
          'Conversion de points en solde portefeuille',
          JSON.stringify({ rate, amountXaf }),
        ]
      );

      await client.query(
        `INSERT INTO partenaire_earnings_history (partenaire_id, type, amount, currency, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          partenaireId,
          'wallet_credit',
          amountXaf,
          'XAF',
          'Crédit par conversion de points',
          JSON.stringify({ amountPoints, rate }),
        ]
      );

      await client.query('COMMIT');

      await notificationService.createNotification({
        destinataire_type: 'PARTENAIRE',
        destinataire_id: partenaireId,
        type: 'POINTS_CONVERSION',
        title: 'Points convertis',
        message: `Vous avez converti ${amountPoints} points en ${amountXaf} XAF.`,
        metadata: { amountPoints, amountXaf, rate },
      });

      return {
        amountPoints,
        amountXaf,
        rate,
        wallet_balance: balanceAfter,
        points: pointsAfter,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const partenairePointsService = new PartenairePointsService();
