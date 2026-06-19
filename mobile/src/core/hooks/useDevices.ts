import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesService } from '@/core/api/devicesService';
import type { Device as ApiDevice } from '@/types/api';

/**
 * Normalised device shape used by the UI layer. Mirrors the local
 * `Device` type in `src/components/devices/DeviceCard.tsx` so screens can
 * pass it directly to <DeviceCard /> without per-call mapping.
 */
export type DeviceListItem = {
  id: string;
  nom: string;
  type: 'telephone' | 'ordinateur' | 'tablette' | 'tv' | 'autre';
  marque: string;
  modele: string;
  serial: string;
  couleur: string;
  dateAchat: string;
  garantie: string;
  prix: number;
  lieu: string;
  assurance: string;
  notes: string;
  is_lost: boolean;
  status: string;
  photo: string | null;
};

function normaliseType(category: string): DeviceListItem['type'] {
  const c = (category || '').toLowerCase();
  if (c.includes('phone') || c.includes('téléphone') || c.includes('telephone')) return 'telephone';
  if (c.includes('laptop') || c.includes('ordinateur')) return 'ordinateur';
  if (c.includes('tablet') || c.includes('tablette')) return 'tablette';
  if (c.includes('tv')) return 'tv';
  return 'autre';
}

function toListItem(d: ApiDevice): DeviceListItem {
  return {
    id: d.id || '',
    nom: d.model || d.modele || d.nom || 'Appareil',
    type: normaliseType(d.category || d.type || ''),
    marque: d.brand || d.marque || '',
    modele: d.model || d.modele || '',
    serial: d.serial_number_imei || d.serial_number || d.imei || '',
    couleur: d.color || d.couleur || '',
    dateAchat: d.purchase_date || '',
    garantie: d.garantie_end || '',
    prix: d.purchase_value || 0,
    lieu: d.where_buy || '',
    assurance: d.assurance || 'non',
    notes: d.notes || '',
    is_lost: ['LOST', 'STOLEN', 'VOLE', 'PERDU'].includes((d.status || '').toUpperCase()),
    status: d.status || 'SAFE',
    photo: Array.isArray(d.photos) && d.photos.length > 0 ? d.photos[0] : null,
  };
}

export type CreateDeviceInput = FormData | Record<string, unknown>;
export type UpdateDeviceInput = CreateDeviceInput;

const DEVICES_QUERY_KEY = ['devices', 'my'] as const;

/**
 * useDevices — read/write the user's device list with React Query.
 *
 * Reading benefits from `persistQueryClient` (see `@/core/api/queryClient`):
 * the cache is rehydrated from AsyncStorage on cold start, so a freshly
 * launched app shows the last known devices immediately, even offline.
 *
 * Mutations use optimistic updates — the UI flips before the request
 * resolves, and rolls back on failure. If the device is offline, the
 * underlying `apiClient` rejects; the cache reverts and the UI shows the
 * snapshot.
 */
export function useDevices() {
  const queryClient = useQueryClient();

  const {
    data: devices = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: DEVICES_QUERY_KEY,
    queryFn: async () => {
      // Try the user-scoped endpoint first; fall back to the global list.
      // Any error is swallowed and surfaced as an empty list so the screen
      // can render its offline/mock fallback without throwing.
      try {
        const mine = await devicesService.getMyDevices();
        if (mine?.success && Array.isArray(mine.data)) return mine.data.map(toListItem);
      } catch {}
      try {
        const all = await devicesService.getAll();
        if (all?.success && Array.isArray(all.data)) return all.data.map(toListItem);
      } catch {}
      return [] as DeviceListItem[];
    },
    staleTime: 60_000,
  });

  // Helper that produces the optimistic-update machinery used by every
  // mutation below: snapshot the cache, apply the mutation to a copy,
  // roll back on error, and revalidate when the request settles.
  const makeOptimistic = <Args,>(
    apply: (current: DeviceListItem[], args: Args) => DeviceListItem[],
  ) => ({
    mutationFn: async (args: Args) => apply([], args), // placeholder, see each mutation
    onMutate: async (args: Args) => {
      await queryClient.cancelQueries({ queryKey: DEVICES_QUERY_KEY });
      const previous = queryClient.getQueryData<DeviceListItem[]>(DEVICES_QUERY_KEY);
      queryClient.setQueryData<DeviceListItem[]>(DEVICES_QUERY_KEY, (old) =>
        apply(old ?? [], args),
      );
      return { previous };
    },
    onError: (_err: unknown, _args: Args, context: { previous?: DeviceListItem[] } | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData(DEVICES_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateDeviceInput) => devicesService.registerMyDevice(input),
    onSuccess: (res) => {
      // Server is the source of truth: merge the returned entity if any.
      if (res && 'data' in res && res.data && !Array.isArray(res.data)) {
        const incoming = toListItem(res.data as ApiDevice);
        queryClient.setQueryData<DeviceListItem[]>(DEVICES_QUERY_KEY, (old) => {
          const list = old ?? [];
          // replace if id collides, else append
          const idx = list.findIndex((d) => d.id === incoming.id);
          if (idx >= 0) {
            const next = list.slice();
            next[idx] = incoming;
            return next;
          }
          return [incoming, ...list];
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    ...makeOptimistic<{ id: string; input: UpdateDeviceInput; previousStatus?: string }>(
      (current, { id, previousStatus }) =>
        current.map((d) =>
          d.id === id ? { ...d, status: previousStatus ?? d.status, is_lost: previousStatus ? ['LOST', 'STOLEN'].includes(previousStatus) : d.is_lost } : d,
        ),
    ),
    mutationFn: ({ id, input }: { id: string; input: UpdateDeviceInput; previousStatus?: string }) =>
      devicesService.update(id, input),
  });

  const deleteMutation = useMutation({
    ...makeOptimistic<string>((current, id) => current.filter((d) => d.id !== id)),
    mutationFn: (id: string) => devicesService.delete(id),
  });

  const reportLostMutation = useMutation({
    ...makeOptimistic<{ id: string; password: string; type: 'LOST' | 'STOLEN' }>(
      (current, { id, type }) =>
        current.map((d) => (d.id === id ? { ...d, is_lost: true, status: type } : d)),
    ),
    mutationFn: ({ id, password, type }: { id: string; password: string; type: 'LOST' | 'STOLEN' }) =>
      devicesService.reportDeviceLost(id, password, type),
  });

  const reportFoundMutation = useMutation({
    ...makeOptimistic<{ id: string; password: string }>((current, { id }) =>
      current.map((d) => (d.id === id ? { ...d, is_lost: false, status: 'SAFE' } : d)),
    ),
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      devicesService.reportDeviceFound(id, password),
  });

  return {
    devices,
    isLoading,
    isFetching,
    error: isError ? (error instanceof Error ? error.message : 'Failed to fetch devices') : null,
    refresh: refetch,

    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    reportLost: reportLostMutation.mutate,
    reportFound: reportFoundMutation.mutate,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReporting: reportLostMutation.isPending || reportFoundMutation.isPending,
  };
}