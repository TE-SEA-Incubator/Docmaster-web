import { ReferralRepository } from '../repositories/referral.repository.ts';
import { encodeMediaFields } from '../utils/media.utils.ts';

export class ReferralService {
  private referralRepository = new ReferralRepository();

  /**
   * Create a new referral
   */
  async createReferral(parrainId: string, filleulId: string): Promise<any> {
    return await this.referralRepository.createReferral(parrainId, filleulId);
  }

  /**
   * Get all referrals for a user (as a parrain)
   */
  async getReferralsByParrain(parrainId: string): Promise<any> {
    const referrals = await this.referralRepository.getReferralsByParrain(parrainId);
    
    // Calculate stats
    const totalPoints = referrals.reduce((sum, ref) => sum + (ref.points_gagnes || 0), 0);
    const activeReferrals = referrals.length; // assuming all are active for now
    
    return {
      referrals: await encodeMediaFields(referrals),
      stats: {
        totalPoints,
        activeReferrals,
        totalEarned: totalPoints // If points map 1:1 to XAF or similar
      }
    };
  }

  /**
   * Admin: Get all referrals
   */
  async getAllReferrals(): Promise<any[]> {
    const referrals = await this.referralRepository.getAllReferrals();
    return await encodeMediaFields(referrals);
  }

  /**
   * Admin: Reward a referral
   */
  async rewardReferral(id: string): Promise<any> {
    return await this.referralRepository.rewardReferral(id);
  }
}
