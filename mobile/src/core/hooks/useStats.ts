import { useEffect, useState, useCallback } from 'react';
import { statsService, type GlobalStats, type PerformanceDoc } from '@/core/api/statsService';

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await statsService.getGlobal();
      setStats((res.data as GlobalStats) || null);
    } catch (e) {
      console.warn('[useGlobalStats] error', e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refresh: fetch };
}

export function usePerformanceStats() {
  const [stats, setStats] = useState<PerformanceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await statsService.getPerformance();
      setStats((res.data as PerformanceDoc[]) || []);
    } catch (e) {
      console.warn('[usePerformanceStats] error', e);
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refresh: fetch };
}
