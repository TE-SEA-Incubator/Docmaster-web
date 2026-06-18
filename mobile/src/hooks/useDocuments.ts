import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/endpoints";
import { documentsService } from "@/services/documentsService";
import type { CreateDocumentInput, Document } from "@/types/api";

import { useOfflineMutation } from "./useOfflineMutation";

/** Cached, offline-readable list of the user's documents. */
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: documentsService.getAll,
  });
}

/**
 * Offline-first document creation (POST /documents).
 * Shows how `useOfflineMutation` is composed for a concrete feature.
 */
export function useCreateDocument() {
  return useOfflineMutation<CreateDocumentInput, Document>({
    kind: "documents.create",
    mutationFn: documentsService.create,
    invalidateKeys: [queryKeys.documents],
    onOptimistic: (payload, { queryClient }) => {
      // Insert a temporary, clearly-pending row so the list updates instantly.
      const optimistic: Document = {
        id: `temp-${Date.now()}`,
        numero_doc: payload.numero,
        nom_sur_doc: payload.nom_complet,
        type_id: payload.type_id,
        created_at: new Date().toISOString(),
        is_verified: false,
      };
      queryClient.setQueryData<Document[]>(
        queryKeys.documents,
        (prev: Document[] | undefined) =>
          prev ? [optimistic, ...prev] : [optimistic],
      );
    },
  });
}
