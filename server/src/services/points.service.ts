import { v4 as uuidv4 } from 'uuid';
import { pool, query } from '../database/db.ts';
import { EarningsRepository } from '../repositories/earnings.repository.ts';
import { UserRepository } from '../repositories/auth.repository.ts';
import { notificationService } from './notification.service.ts';
import argon2 from 'argon2';

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
   * Refund points when a points-funded recovery could not be finalized.
   * Must only be called when no claim was created for the payment.
   */
  async refundPoints(
    userId: string,
    amountPoints: number,
    description: string,
    metadata: any = {},
  ) {
    await query(
      'UPDATE users SET points = points + $1, updated_at = NOW() WHERE id = $2',
      [amountPoints, userId],
    );

    await this.earningsRepository.create({
      user_id: userId,
      type: 'POINTS_REFUND',
      amount: amountPoints,
      currency: 'POINTS',
      description,
      metadata,
    });

    await notificationService.createNotification({
      user_id: userId,
      type: 'POINTS_REFUND',
      title: 'Points remboursés',
      message: `${amountPoints} points ont été recrédités : ${description}`,
      metadata: { ...metadata, amount: amountPoints, type: 'POINTS_REFUND' },
    });

    return true;
  }

  /**
   * Convert points to wallet balance
   */
  async convertPointsToWallet(userId: string, amountPoints: number, password?: string) {
    const rate = await this.getExchangeRate();
    const amountXaf = amountPoints / rate;

    // Verify password if provided
    if (password) {
      const userPwRes = await query('SELECT mot_de_passe FROM users WHERE id = $1', [userId]);
      if (userPwRes.rows.length === 0) throw new Error('Utilisateur non trouvé');
      const valid = await argon2.verify(userPwRes.rows[0].mot_de_passe, password);
      if (!valid) {
        const error = new Error('Mot de passe incorrect');
        (error as any).status = 403;
        throw error;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Check & deduct points
      const userRes = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) throw new Error('Utilisateur non trouvé');
      const currentPoints = userRes.rows[0].points || 0;
      if (currentPoints < amountPoints) {
        const error = new Error(`Solde de points insuffisant (${currentPoints} pts disponibles, ${amountPoints} pts requis)`);
        (error as any).status = 400;
        throw error;
      }
      await client.query(
        'UPDATE users SET points = points - $1, updated_at = NOW() WHERE id = $2',
        [amountPoints, userId]
      );

      // 2. Credit wallet
      const balRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
      const balanceBefore = parseFloat(balRes.rows[0]?.wallet_balance || 0);
      const updRes = await client.query(
        'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance',
        [amountXaf, userId]
      );
      const balanceAfter = parseFloat(updRes.rows[0]?.wallet_balance || 0);
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, balance_before, balance_after, type, reason, metadata)
         VALUES ($1, $2, $3, $4, 'CREDIT', 'POINTS_CONVERSION', $5)`,
        [userId, amountXaf, balanceBefore, balanceAfter, JSON.stringify({ amountPoints, rate })]
      );

      // 3. Record earnings (dans la transaction)
      await client.query(
        `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 'POINTS_CONVERSION', -amountPoints, 'POINTS', 'Conversion de points en solde portefeuille', JSON.stringify({ rate, amountXaf })]
      );
      await client.query(
        `INSERT INTO earnings_history (user_id, type, amount, currency, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 'wallet_credit', amountXaf, 'XAF', 'Crédit par conversion de points', JSON.stringify({ amountPoints, rate })]
      );

      // 4. Notification DB records (dans la transaction)

      // Notification user
      const userNotif = await client.query(
        `INSERT INTO notifications (user_id, type, title, message, metadata, channels)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, 'POINTS_CONVERSION', 'Points convertis avec succès',
         `Vous avez converti ${amountPoints} points en ${amountXaf} XAF. Votre nouveau solde portefeuille est de ${balanceAfter} XAF.`,
         JSON.stringify({ amount: amountPoints, amountXaf, rate, balanceAfter }),
         JSON.stringify({ in_app: true, email: true, sms: false, push: true })]
      );

      // Notification admins
      const adminRes = await client.query("SELECT id, email, prenom, nom FROM users WHERE role = 'ADMIN'");
      const adminNotifs: { id: string; userId: string; email: string; name: string }[] = [];
      for (const admin of adminRes.rows) {
        const n = await client.query(
          `INSERT INTO notifications (user_id, type, title, message, metadata, channels)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [admin.id, 'POINTS_CONVERSION', 'Conversion de points',
           `Un utilisateur a converti ${amountPoints} points en ${amountXaf} XAF.`,
           JSON.stringify({ paymentType: 'POINTS_CONVERSION', amount: amountXaf, currency: 'XAF', pointsUsed: amountPoints }),
           JSON.stringify({ in_app: true, email: true, sms: false, push: true })]
        );
        adminNotifs.push({ id: n.rows[0].id, userId: admin.id, email: admin.email, name: `${admin.prenom} ${admin.nom}` });
      }

      await client.query('COMMIT');
      client.release();

      // ── Après COMMIT : livraison des notifications externes ──
      try {
        notificationService.deliverNotification({
          id: userNotif.rows[0].id,
          user_id: userId,
          type: 'POINTS_CONVERSION',
          title: 'Points convertis avec succès',
          message: `Vous avez converti ${amountPoints} points en ${amountXaf} XAF. Votre nouveau solde portefeuille est de ${balanceAfter} XAF.`,
          metadata: { amount: amountPoints, amountXaf, rate, balanceAfter },
          channels: { in_app: true, email: true, sms: false, push: true }
        });
      } catch (e) {
        console.error('Erreur livraison notification user:', e);
      }

      try {
        for (const an of adminNotifs) {
          notificationService.deliverNotification({
            id: an.id,
            user_id: an.userId,
            type: 'POINTS_CONVERSION',
            title: 'Conversion de points',
            message: `Un utilisateur a converti ${amountPoints} points en ${amountXaf} XAF.`,
            metadata: { paymentType: 'POINTS_CONVERSION', amount: amountXaf, currency: 'XAF', pointsUsed: amountPoints },
            channels: { in_app: true, email: true, sms: false, push: true }
          });
        }
      } catch (e) {
        console.error('Erreur livraison notification admins:', e);
      }

      return { success: true, amountXaf, balanceAfter };
    } catch (error) {
      console.error('❌ convertPointsToWallet transaction error:', error);
      try { await client.query('ROLLBACK'); } catch (_) {}
      try { client.release(); } catch (_) {}
      throw error;
    }
  }

  /**
   * Initiate a points purchase via Nokash
   */
  async purchasePoints(userId: string, pointsAmount: number, phone: string, method: 'MTN_MOMO' | 'ORANGE_MONEY') {
    const rate = await this.getExchangeRate();
    const amountXaf = Math.ceil(pointsAmount / rate);
    const orderId = `PTS-${uuidv4().substring(0, 8)}`;

    const { nokashService } = await import('./nokash.service.ts');

    const nokashRes = await nokashService.initiatePayment({
      payment_method: method,
      amount: amountXaf,
      order_id: orderId,
      user_phone: phone,
      country: 'CM'
    });

    if (nokashRes.status !== 'REQUEST_OK' && nokashRes.status !== 'SUCCESS') {
      throw new Error('Le service de paiement est temporairement indisponible. Veuillez réessayer plus tard.');
    }

    await query(
      `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, amountXaf, 'XAF', 'PENDING', method, 'points_purchase', nokashRes.data.id,
       JSON.stringify({ pointsAmount, rate, orderId })]
    );

    return { transactionId: nokashRes.data.id, amountXaf, pointsAmount };
  }
}

export const pointsService = new PointsService();
