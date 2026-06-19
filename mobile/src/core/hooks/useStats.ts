import { useEffect, useState, useCallback, useRef } from 'react';
import { statsService, type GlobalStats, type PerformanceDoc } from '@/core/api/statsService';

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await statsService.getGlobal();
      if (mountedRef.current) setStats((res.data as GlobalStats) || null);
    } catch (e) {
      console.warn('[useGlobalStats] error', e);
      if (mountedRef.current) setStats(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { stats, loading, refresh: fetch };
}

export function usePerformanceStats() {
  const [stats, setStats] = useState<PerformanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetch = useCallback(async (period?: string) => {
    setLoading(true);
    try {
      const res = await statsService.getPerformance(period);
      if (mountedRef.current) setStats((res.data as PerformanceDoc[]) || []);
    } catch (e) {
      console.warn('[usePerformanceStats] error', e);
      if (mountedRef.current) setStats([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { stats, loading, refresh: fetch };
}
