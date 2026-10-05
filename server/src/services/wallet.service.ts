import { query } from '../database/db.ts';

const reasonLabels: Record<string, string> = {
  REFERRAL_REWARD: 'Bonus de parrainage',
  DECLARATION_REWARD: 'Récompense déclaration',
  POINTS_CONVERSION: 'Conversion points',
  WITHDRAWAL: 'Retrait',
  ADMIN_ADJUSTMENT: 'Ajustement admin',
  OTHER: 'Autre',
};

type WalletReason =
  | 'REFERRAL_REWARD'
  | 'DECLARATION_REWARD'
  | 'POINTS_CONVERSION'
  | 'WITHDRAWAL'
  | 'ADMIN_ADJUSTMENT'
  | 'OTHER';

export class WalletService {

  /**
   * Credit a user's wallet and log the transaction
   */
  async credit(
    userId: string,
    amount: number,
    reason: WalletReason,
    options?: {
      referenceId?: string;
      referenceType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<number> {
    const client = await query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
    const balanceBefore = parseFloat(client.rows[0]?.wallet_balance || 0);

    const res = await query(
      'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance',
      [amount, userId]
    );
    const balanceAfter = parseFloat(res.rows[0]?.wallet_balance || 0);

    await query(
      `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
       VALUES ($1, $2, $3, $4, 'CREDIT', $5, $6, $7, $8)`,
      [
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        reason,
        options?.referenceId || null,
        options?.referenceType || null,
        options?.metadata ? JSON.stringify(options.metadata) : null,
      ]
    );

    const { activityLogService } = await import('./activity-log.service.ts');
    activityLogService.log({
      user_id: userId,
      action_type: 'WALLET_CREDIT',
      entity_type: 'wallet',
      description: `${reasonLabels[reason] || reason} : +${amount} XAF (solde: ${balanceBefore} → ${balanceAfter})`,
      metadata: { amount, balanceBefore, balanceAfter, reason, ...(options?.metadata || {}) },
    });

    return balanceAfter;
  }

  /**
   * Debit a user's wallet and log the transaction
   */
  async debit(
    userId: string,
    amount: number,
    reason: WalletReason,
    options?: {
      referenceId?: string;
      referenceType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<number> {
    const client = await query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
    const balanceBefore = parseFloat(client.rows[0]?.wallet_balance || 0);

    const res = await query(
      `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) - $1, updated_at = NOW()
       WHERE id = $2 AND COALESCE(wallet_balance, 0) >= $1
       RETURNING wallet_balance`,
      [amount, userId]
    );
    if (res.rows.length === 0) {
      throw new Error('Solde insuffisant pour effectuer cette opération.');
    }
    const balanceAfter = parseFloat(res.rows[0]?.wallet_balance || 0);

    await query(
      `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
       VALUES ($1, $2, $3, $4, 'DEBIT', $5, $6, $7, $8)`,
      [
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        reason,
        options?.referenceId || null,
        options?.referenceType || null,
        options?.metadata ? JSON.stringify(options.metadata) : null,
      ]
    );

    const { activityLogService } = await import('./activity-log.service.ts');
    activityLogService.log({
      user_id: userId,
      action_type: 'WALLET_DEBIT',
      entity_type: 'wallet',
      description: `${reasonLabels[reason] || reason} : -${amount} XAF (solde: ${balanceBefore} → ${balanceAfter})`,
      metadata: { amount, balanceBefore, balanceAfter, reason, ...(options?.metadata || {}) },
    });

    return balanceAfter;
  }

  /**
   * Get wallet transaction history for a user
   */
  async getHistory(userId: string, limit = 50, offset = 0) {
    const { rows } = await query(
      `SELECT * FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }

  /**
   * Credit a partner's wallet and log the transaction (standalone partner wallet)
   */
  async creditPartner(
    partenaireId: string,
    amount: number,
    reason: WalletReason,
    options?: {
      referenceId?: string;
      referenceType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<number> {
    const client = await query('SELECT wallet_balance FROM partenaires WHERE id = $1', [partenaireId]);
    const balanceBefore = parseFloat(client.rows[0]?.wallet_balance || 0);

    const res = await query(
      'UPDATE partenaires SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance',
      [amount, partenaireId]
    );
    const balanceAfter = parseFloat(res.rows[0]?.wallet_balance || 0);

    await query(
      `INSERT INTO partenaire_wallet_transactions (partenaire_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
       VALUES ($1, $2, $3, $4, 'CREDIT', $5, $6, $7, $8)`,
      [
        partenaireId,
        amount,
        balanceBefore,
        balanceAfter,
        reason,
        options?.referenceId || null,
        options?.referenceType || null,
        options?.metadata ? JSON.stringify(options.metadata) : null,
      ]
    );

    const { activityLogService } = await import('./activity-log.service.ts');
    activityLogService.log({
      user_id: null,
      action_type: 'WALLET_CREDIT',
      entity_type: 'partenaire_wallet',
      entity_id: partenaireId,
      description: `${reasonLabels[reason] || reason} : +${amount} XAF (solde: ${balanceBefore} → ${balanceAfter})`,
      metadata: { partenaire_id: partenaireId, amount, balanceBefore, balanceAfter, reason, ...(options?.metadata || {}) },
    });

    return balanceAfter;
  }

  /**
   * Debit a partner's wallet and log the transaction
   */
  async debitPartner(
    partenaireId: string,
    amount: number,
    reason: WalletReason,
    options?: {
      referenceId?: string;
      referenceType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<number> {
    const client = await query('SELECT wallet_balance FROM partenaires WHERE id = $1', [partenaireId]);
    const balanceBefore = parseFloat(client.rows[0]?.wallet_balance || 0);

    const res = await query(
      'UPDATE partenaires SET wallet_balance = COALESCE(wallet_balance, 0) - $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance',
      [amount, partenaireId]
    );
    const balanceAfter = parseFloat(res.rows[0]?.wallet_balance || 0);

    await query(
      `INSERT INTO partenaire_wallet_transactions (partenaire_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
       VALUES ($1, $2, $3, $4, 'DEBIT', $5, $6, $7, $8)`,
      [
        partenaireId,
        amount,
        balanceBefore,
        balanceAfter,
        reason,
        options?.referenceId || null,
        options?.referenceType || null,
        options?.metadata ? JSON.stringify(options.metadata) : null,
      ]
    );

    const { activityLogService } = await import('./activity-log.service.ts');
    activityLogService.log({
      user_id: null,
      action_type: 'WALLET_DEBIT',
      entity_type: 'partenaire_wallet',
      entity_id: partenaireId,
      description: `${reasonLabels[reason] || reason} : -${amount} XAF (solde: ${balanceBefore} → ${balanceAfter})`,
      metadata: { partenaire_id: partenaireId, amount, balanceBefore, balanceAfter, reason, ...(options?.metadata || {}) },
    });

    return balanceAfter;
  }

  /**
   * Get wallet transaction history for a partner
   */
  async getPartnerHistory(partenaireId: string, limit = 50, offset = 0) {
    const { rows } = await query(
      `SELECT * FROM partenaire_wallet_transactions
       WHERE partenaire_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [partenaireId, limit, offset]
    );
    return rows;
  }

  /**
   * Get all wallet transactions (admin view)
   */
  async getAllTransactions(limit = 50, offset = 0) {
    const { rows } = await query(
      `SELECT wt.*, u.nom, u.prenom, u.email
       FROM wallet_transactions wt
       JOIN users u ON wt.user_id = u.id
       ORDER BY wt.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }
}

export const walletService = new WalletService();
