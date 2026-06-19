import { Request, Response } from 'express';
import { ReferralService } from '../services/referral.service.ts';

export class ReferralController {
  private referralService = new ReferralService();

  /**
   * Get all referrals for the authenticated user
   */
  async getMyReferrals(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const data = await this.referralService.getReferralsByParrain(userId);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch referrals' });
    }
  }

  /**
   * Admin: Get all referrals across the platform
   */
  async getAllReferrals(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.referralService.getAllReferrals();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch all referrals' });
    }
  }
  /**
   * Admin: Reward a referral across the platform
   */
  async rewardReferral(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) throw new Error('ID requis');
      const data = await this.referralService.rewardReferral(id as string);
      res.status(200).json({ success: true, message: 'Récompense attribuée avec succès', data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to reward referral' });
    }
  }
}
