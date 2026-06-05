import { useState, useEffect, useCallback } from "react";
import { declarationsService } from "../services/declarationsService";
import type { Declaration } from "../types/api";

export function useDeclarations() {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await declarationsService.getMyDeclarations();
      setDeclarations(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur de chargement");
      setDeclarations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createLost = useCallback(async (data: Parameters<typeof declarationsService.createLost>[0]) => {
    const res = await declarationsService.createLost(data);
    await fetch();
    return res;
  }, [fetch]);

  const createFound = useCallback(async (data: Parameters<typeof declarationsService.createFound>[0]) => {
    const res = await declarationsService.createFound(data);
    await fetch();
    return res;
  }, [fetch]);

  const requestDeletion = useCallback(async (declarationId: string, reason: string) => {
    const res = await declarationsService.requestDeletion({ declaration_id: declarationId, reason });
    return res;
  }, []);

  return { declarations, loading, error, fetch, createLost, createFound, requestDeletion };
}

export function useDeclaration(id?: string) {
  const [declaration, setDeclaration] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    declarationsService.getById(id)
      .then((res) => setDeclaration(res.data || null))
      .catch((err) => setError(err.response?.data?.error || "Déclaration introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  return { declaration, loading, error };
}

export function useSearchDeclarations() {
  const [results, setResults] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await declarationsService.searchPublic(query);
      setResults(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Aucun résultat");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

export function useDeclarationStats() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    declarationsService.getStats()
      .then((res) => setStats(res.data || null))
      .catch((e: any) => {
        console.error("[useDeclarationStats] error:", e?.response?.data || e);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

export function useRecovery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiate = useCallback(async (declarationId: string, email?: string, telephone?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await declarationsService.initiateRecovery({
        declaration_id: declarationId,
        email,
        telephone,
      });
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Erreur de récupération";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, initiate };
}

export function useDeletionRequests() {
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await declarationsService.getDeletionRequests();
      setRequests(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  return { requests, loading, error, fetch };
}
