import { EarningsRepository } from '../repositories/earnings.repository.ts';
import { NotificationService } from './notification.service.ts';

const EARNINGS_TYPES = {
  DECLARATION_POINTS: 'declaration_points',
  RETURN_POINTS: 'return_points',
  REFERRAL_POINTS: 'referral_points',
  FINDER_PAYOUT: 'finder_payout',
} as const;

export class EarningsService {
  private earningsRepository: EarningsRepository;
  private notificationService: NotificationService;

  constructor() {
    this.earningsRepository = new EarningsRepository();
    this.notificationService = new NotificationService();
  }

  /**
   * Record an earning event and send notification
   */
  async recordEarning(data: {
    user_id: string;
    type: string;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: any;
  }) {
    const record = await this.earningsRepository.create(data);

    // Send notification for the earning
    const isPoints = data.currency === 'POINTS' || !data.currency;
    const isMoney = data.currency === 'XAF';

    if (isPoints) {
      await this.notificationService.createNotification({
        user_id: data.user_id,
        type: 'POINTS_EARNED',
        title: 'Points gagnés !',
        message: `Vous avez reçu ${data.amount} points : ${data.description || 'Gain'}`,
        metadata: { ...data.metadata, earningId: record.id, amount: data.amount, currency: 'POINTS' }
      });
    }

    if (isMoney) {
      await this.notificationService.createNotification({
        user_id: data.user_id,
        type: 'MONEY_EARNED',
        title: 'Gain reçu !',
        message: `Vous avez reçu ${data.amount} XAF : ${data.description || 'Gain'}`,
        metadata: { ...data.metadata, earningId: record.id, amount: data.amount, currency: 'XAF' }
      });
    }

    return record;
  }

  /**
   * Record declaration points
   */
  async recordDeclarationPoints(userId: string, points: number, metadata?: any) {
    return this.recordEarning({
      user_id: userId,
      type: EARNINGS_TYPES.DECLARATION_POINTS,
      amount: points,
      description: 'Points pour déclaration de document',
      metadata
    });
  }

  /**
   * Record return points (finder reward)
   */
  async recordReturnPoints(userId: string, points: number, amount: number, metadata?: any) {
    // Record points
    if (points > 0) {
      await this.recordEarning({
        user_id: userId,
        type: EARNINGS_TYPES.RETURN_POINTS,
        amount: points,
        description: 'Points pour remise de document',
        metadata
      });
    }

    // Record monetary reward
    if (amount > 0) {
      await this.recordEarning({
        user_id: userId,
        type: EARNINGS_TYPES.FINDER_PAYOUT,
        amount,
        currency: 'XAF',
        description: `Récompense pour remise de document`,
        metadata
      });
    }
  }

  /**
   * Record referral points
   */
  async recordReferralPoints(userId: string, points: number, walletBonus: number, metadata?: any) {
    if (points > 0) {
      await this.recordEarning({
        user_id: userId,
        type: EARNINGS_TYPES.REFERRAL_POINTS,
        amount: points,
        description: 'Points de parrainage',
        metadata
      });
    }

    if (walletBonus > 0) {
      await this.recordEarning({
        user_id: userId,
        type: 'referral_bonus',
        amount: walletBonus,
        currency: 'XAF',
        description: 'Bonus de parrainage',
        metadata
      });
    }
  }

  /**
   * Get earnings history for a user
   */
  async getUserEarnings(userId: string, limit = 50, offset = 0) {
    const [data, total] = await Promise.all([
      this.earningsRepository.findByUser(userId, limit, offset),
      this.earningsRepository.countByUser(userId)
    ]);
    return { data, total, limit, offset };
  }

  /**
   * Get all earnings (admin)
   */
  async getAllEarnings(limit = 50, offset = 0) {
    return this.earningsRepository.findAll(limit, offset);
  }
}

export const earningsService = new EarningsService();
