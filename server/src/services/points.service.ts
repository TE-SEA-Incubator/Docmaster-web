import { query } from '../database/db.ts';
import { EarningsRepository } from '../repositories/earnings.repository.ts';
import { UserRepository } from '../repositories/auth.repository.ts';
import { notificationService } from './notification.service.ts';

export class PointsService {
  private earningsRepository: EarningsRepository;
  private userRepository: UserRepository;

  constructor() {
    this.earningsRepository = new EarningsRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Get current exchange rate (Points to XAF)
   * rate = 10 means 10 points = 1 XAF
   */
  async getExchangeRate(): Promise<number> {
    const res = await query("SELECT value FROM app_settings WHERE key = 'points_to_xaf_rate'");
    if (res.rows.length === 0) return 10; // Default fallback
    return Number(res.rows[0].value);
  }

  /**
   * Calculate points needed for a given XAF amount
   */
  async calculatePointsNeeded(amountXaf: number): Promise<number> {
    const rate = await this.getExchangeRate();
    if (rate <= 0) return Infinity; 
    return Math.ceil(amountXaf * rate);
  }

  /**
   * Redeem points for a service or conversion
   */
  async redeemPoints(userId: string, amountPoints: number, type: string, description: string, metadata: any = {}) {
    // 1. Check user points
    const userRes = await query('SELECT points FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) throw new Error('Utilisateur non trouvé');
    
    const currentPoints = userRes.rows[0].points || 0;
    if (currentPoints < amountPoints) {
      const error = new Error(`Solde de points insuffisant (${currentPoints} pts disponibles, ${amountPoints} pts requis)`);
      (error as any).status = 400;
      throw error;
    }

    // 2. Deduct points (Atomic update)
    await query(
      'UPDATE users SET points = points - $1, updated_at = NOW() WHERE id = $2',
      [amountPoints, userId]
    );

    // 3. Record in earnings history (as a negative or specific type)
    await this.earningsRepository.create({
      user_id: userId,
      type: type,
      amount: -amountPoints,
      currency: 'POINTS',
      description: description,
      metadata: metadata
    });

    // 4. Notify user
    await notificationService.createNotification({
      user_id: userId,
      type: 'POINTS_SPENT',
      title: 'Points utilisés',
      message: `Vous avez utilisé ${amountPoints} points pour : ${description}`,
      metadata: { ...metadata, amount: amountPoints, type }
    });

    return true;
  }

  /**
   * Convert points to wallet balance
   */
  async convertPointsToWallet(userId: string, amountPoints: number) {
    const rate = await this.getExchangeRate();
    const amountXaf = amountPoints / rate;

    // Use a transaction for safety
    const client = await query('BEGIN');
    try {
      // Deduct points
      await this.redeemPoints(userId, amountPoints, 'POINTS_CONVERSION', 'Conversion de points en solde portefeuille', { rate, amountXaf });

      // Add to wallet
      await query(
        'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() WHERE id = $2',
        [amountXaf, userId]
      );

      // Record monetary earning
      await this.earningsRepository.create({
        user_id: userId,
        type: 'wallet_credit',
        amount: amountXaf,
        currency: 'XAF',
        description: 'Crédit par conversion de points',
        metadata: { amountPoints, rate }
      });

      await query('COMMIT');
      return { success: true, amountXaf };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
}

export const pointsService = new PointsService();
