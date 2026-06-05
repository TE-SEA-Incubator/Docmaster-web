import { useState, useEffect, useCallback } from "react";
import { statsService } from "../services/statsService";

export function useGlobalStats() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsService.getGlobal()
      .then((res) => setStats(res.data || null))
      .catch((e: any) => {
        console.error("[useGlobalStats] error:", e?.response?.data || e);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

export function usePerformanceStats() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await statsService.getPerformance();
      setStats(res.data || null);
    } catch (e: any) {
      console.error("[usePerformanceStats] error:", e?.response?.data || e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, fetch };
}

export function useActiveDocumentTypes() {
  const [types, setTypes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsService.getActiveDocumentTypes()
      .then((res) => setTypes(res.data || []))
      .catch((e: any) => {
        console.error("[useActiveDocumentTypes] error:", e?.response?.data || e);
        setTypes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { types, loading };
}
