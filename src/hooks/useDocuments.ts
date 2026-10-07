import { useState, useEffect, useCallback } from "react";
import { documentsService } from "../services/documentsService";
import { useToast } from "../context/ToastContext";
import { extractApiError } from "../utils/extractApiError";
import type { Document } from "../types/api";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

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
    try {
      const res = await documentsService.register(data);
      toast.success("Document ajouté avec succès");
      await fetch();
      return res;
    } catch (err: any) {
      toast.error(extractApiError(err));
      throw err;
    }
  }, [fetch, toast]);

  const remove = useCallback(async (id: string) => {
    try {
      const res = await documentsService.delete(id);
      toast.success("Document supprimé");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      return res;
    } catch (err: any) {
      toast.error(extractApiError(err));
      throw err;
    }
  }, [toast]);

  const reportLost = useCallback(async (id: string, password?: string) => {
    try {
      const res = await documentsService.reportLost(id, password);
      toast.success("Document signalé comme perdu");
      await fetch();
      return res;
    } catch (err: any) {
      toast.error(extractApiError(err));
      throw err;
    }
  }, [fetch, toast]);

  const createShare = useCallback(async (documentId: string, daysValid?: number) => {
    try {
      const res = await documentsService.createShare(documentId, daysValid);
      toast.success("Lien de partage créé");
      return res;
    } catch (err: any) {
      toast.error(extractApiError(err));
      throw err;
    }
  }, [toast]);

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
  const toast = useToast();

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
    try {
      const res = await documentsService.revokeShare(shareId);
      toast.success("Partage révoqué");
      setShares((prev) => prev.filter((s: any) => s.id !== shareId));
      return res;
    } catch (err: any) {
      toast.error(extractApiError(err));
      throw err;
    }
  }, [toast]);

  return { shares, loading, error, fetch, revoke };
}
