import { useState, useEffect, useCallback } from 'react';
import { earningsService, type EarningsRecord, type EarningsStats } from '@/core/api/earningsService';
import type { Transaction } from '@/types';

export function useEarnings() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<EarningsRecord[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [minWithdrawal, setMinWithdrawal] = useState(500);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [txRes, earningsRes, statsRes, settingsRes] = await Promise.all([
        earningsService.getMyTransactions().catch(() => ({ success: false, data: [] as Transaction[] })),
        earningsService.getMyEarnings().catch(() => ({ success: false, data: { data: [] as EarningsRecord[] } })),
        earningsService.getEarningsStats().catch(() => ({ success: false, data: null })),
        earningsService.getMinWithdrawal().catch(() => ({ success: false, data: { min_withdrawal_amount: 500 } })),
      ]);

      if (txRes.success && txRes.data) setTransactions(txRes.data);
      if (earningsRes.success && earningsRes.data) setEarnings(earningsRes.data.data || []);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (settingsRes.success && settingsRes.data) {
        setMinWithdrawal(Number(settingsRes.data.min_withdrawal_amount) || 500);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { transactions, earnings, stats, minWithdrawal, loading, error, refresh: fetch };
}
