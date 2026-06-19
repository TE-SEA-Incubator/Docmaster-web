import { useState, useEffect, useCallback } from 'react';
import { referralsService } from '@/core/api/referralsService';
import type { Referral, ReferralStats } from '@/types';

export function useReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats>({ totalPoints: 0, activeReferrals: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await referralsService.getMyReferrals();
      if (res.success && res.data) {
        setReferrals(res.data.referrals || []);
        setStats(res.data.stats || { totalPoints: 0, activeReferrals: 0, totalEarned: 0 });
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { referrals, stats, loading, error, refresh: fetch };
}
