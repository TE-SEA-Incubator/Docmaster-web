import { useState, useEffect, useCallback } from "react";
import { documentsService } from "../services/documentsService";
import type { Document } from "../types/api";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentsService.getAll();
      setDocuments(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur de chargement");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const register = useCallback(async (data: Parameters<typeof documentsService.register>[0]) => {
    const res = await documentsService.register(data);
    await fetch();
    return res;
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    const res = await documentsService.delete(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    return res;
  }, []);

  const reportLost = useCallback(async (id: string) => {
    const res = await documentsService.reportLost(id);
    await fetch();
    return res;
  }, [fetch]);

  const createShare = useCallback(async (documentId: string, daysValid?: number) => {
    const res = await documentsService.createShare(documentId, daysValid);
    return res;
  }, []);

  return { documents, loading, error, fetch, register, remove, reportLost, createShare };
}

export function useDocumentShare(code?: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    documentsService.getSharedDocument(code)
      .then((res) => setDocument(res.data || null))
      .catch((err) => setError(err.response?.data?.error || "Document introuvable"))
      .finally(() => setLoading(false));
  }, [code]);

  return { document, loading, error };
}

export function useDocumentShares(docId?: string) {
  const [shares, setShares] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentsService.getDocumentShares(docId);
      setShares(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { fetch(); }, [fetch]);

  const revoke = useCallback(async (shareId: string) => {
    const res = await documentsService.revokeShare(shareId);
    setShares((prev) => prev.filter((s: any) => s.id !== shareId));
    return res;
  }, []);

  return { shares, loading, error, fetch, revoke };
}
