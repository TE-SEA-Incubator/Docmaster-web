import { useQuery } from '@tanstack/react-query';
import { documentsService } from '@/core/api/documentsService';
import { declarationsService } from '@/core/api/declarationsService';
import { notificationsService } from '@/core/api/notificationsService';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [docRes, decRes, notifRes] = await Promise.all([
        documentsService.getAll().catch(() => ({ success: false, data: [] })),
        declarationsService.getMyDeclarations().catch(() => ({ success: false, data: [] })),
        notificationsService.getAll().catch(() => ({ success: false, data: [] })),
      ]);
      return {
        docs: docRes.success && docRes.data ? docRes.data : [],
        declarations: decRes.success && decRes.data ? decRes.data : [],
        notifications: notifRes.success && notifRes.data ? notifRes.data : [],
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}
