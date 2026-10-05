import { PartenaireEarningsRepository } from '../repositories/partenaire-earnings.repository.ts';
import { notificationService } from './notification.service.ts';

const EARNINGS_TYPES = {
  DECLARATION_POINTS: 'declaration_points',
  RETURN_POINTS: 'return_points',
  POINTS_CONVERSION: 'POINTS_CONVERSION',
  FINDER_PAYOUT: 'finder_payout',
} as const;

export class PartenaireEarningsService {
  private repository = new PartenaireEarningsRepository();

  async recordEarning(data: {
    partenaire_id: string;
    type: string;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: any;
  }) {
    const record = await this.repository.create(data);
    const isPoints = data.currency === 'POINTS' || !data.currency;

    if (isPoints && data.amount > 0) {
      await notificationService.createNotification({
        destinataire_type: 'PARTENAIRE',
        destinataire_id: data.partenaire_id,
        type: 'POINTS_EARNED',
        title: 'Points gagnés !',
        message: `Vous avez reçu ${data.amount} points : ${data.description || 'Gain'}`,
        metadata: { ...data.metadata, earningId: record.id, amount: data.amount, currency: 'POINTS' },
      });
    }

    if (data.currency === 'XAF' && data.amount > 0) {
      await notificationService.createNotification({
        destinataire_type: 'PARTENAIRE',
        destinataire_id: data.partenaire_id,
        type: 'MONEY_EARNED',
        title: 'Gain reçu !',
        message: `Vous avez reçu ${data.amount} XAF : ${data.description || 'Gain'}`,
        metadata: { ...data.metadata, earningId: record.id, amount: data.amount, currency: 'XAF' },
      });
    }

    return record;
  }

  async recordDeclarationPoints(partenaireId: string, points: number, metadata?: any) {
    return this.recordEarning({
      partenaire_id: partenaireId,
      type: EARNINGS_TYPES.DECLARATION_POINTS,
      amount: points,
      description: 'Points pour déclaration de document',
      metadata,
    });
  }

  async recordReturnPoints(partenaireId: string, points: number, amount: number, metadata?: any) {
    if (points > 0) {
      await this.recordEarning({
        partenaire_id: partenaireId,
        type: EARNINGS_TYPES.RETURN_POINTS,
        amount: points,
        description: 'Points pour remise de document',
        metadata,
      });
    }

    if (amount > 0) {
      await this.recordEarning({
        partenaire_id: partenaireId,
        type: EARNINGS_TYPES.FINDER_PAYOUT,
        amount,
        currency: 'XAF',
        description: 'Récompense pour remise de document',
        metadata,
      });
    }
  }

  async getPartenaireEarnings(partenaireId: string, limit = 50, offset = 0) {
    const [data, total] = await Promise.all([
      this.repository.findByPartenaire(partenaireId, limit, offset),
      this.repository.countByPartenaire(partenaireId),
    ]);
    return { data, total, limit, offset };
  }

  async getPointsBreakdown(partenaireId: string) {
    const [declarationPts, returnPts] = await Promise.all([
      this.repository.sumPointsByType(partenaireId, EARNINGS_TYPES.DECLARATION_POINTS),
      this.repository.sumPointsByType(partenaireId, EARNINGS_TYPES.RETURN_POINTS),
    ]);
    return {
      declaration_points: declarationPts,
      return_points: returnPts,
    };
  }
}

export const partenaireEarningsService = new PartenaireEarningsService();
