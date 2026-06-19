import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { declarationsService } from '@/core/api/declarationsService';
import { documentsService } from '@/core/api/documentsService';
import type { Declaration } from '@/types';

type UseDocumentsOptions = {
  type?: 'lost' | 'found';
  search?: string;
};

export function useDocuments(options?: UseDocumentsOptions) {
  const queryClient = useQueryClient();
  const queryKey = ['documents', options?.type, options?.search];

  const {
    data: documents = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (options?.type) params.declaration_type = options.type;
      if (options?.search) params.search = options.search;
      const res = await declarationsService.getAll(params);
      if (res.success && res.data) {
        return res.data;
      }
      return [] as Declaration[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousDocs = queryClient.getQueryData<Declaration[]>(queryKey);
      
      // On crée une COPIE de la liste pour éviter l'erreur "readonly"
      queryClient.setQueryData<Declaration[]>(queryKey, (old) =>
        old ? [...old].filter((doc) => doc.id !== id) : []
      );
      
      return { previousDocs };
    },
    onError: (err, id, context) => {
      if (context?.previousDocs) {
        queryClient.setQueryData(queryKey, context.previousDocs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const reportLostMutation = useMutation({
    mutationFn: (id: string) => documentsService.reportLost(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousDocs = queryClient.getQueryData<Declaration[]>(queryKey);
      
      // On crée une COPIE et on modifie l'objet spécifique
      queryClient.setQueryData<Declaration[]>(queryKey, (old) =>
        old ? old.map((doc) => (doc.id === id ? { ...doc, status: 'lost' } : { ...doc })) : []
      );
      
      return { previousDocs };
    },
    onError: (err, id, context) => {
      if (context?.previousDocs) {
        queryClient.setQueryData(queryKey, context.previousDocs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    documents,
    isLoading,
    isFetching,
    error: isError ? (error instanceof Error ? error.message : 'Failed to fetch documents') : null,
    refresh: refetch,
    deleteDocument: deleteMutation.mutate,
    reportLost: reportLostMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isReporting: reportLostMutation.isPending,
  };
}
