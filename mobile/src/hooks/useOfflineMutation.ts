import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useCallback } from "react";

import { isCurrentlyOnline } from "@/lib/onlineManager";
import { enqueue, registerQueueHandler } from "@/lib/offlineQueue";

export interface OfflineMutationOptions<TPayload, TResult> {
  /** Unique id used to register the replay handler in the offline queue. */
  kind: string;
  /** The actual network call. */
  mutationFn: (payload: TPayload) => Promise<TResult>;
  /** Query keys to invalidate after a successful (online or replayed) write. */
  invalidateKeys?: QueryKey[];
  /**
   * Optimistic cache update applied immediately, online or offline.
   * Receives the queryClient so you can `setQueryData` for instant UI.
   */
  onOptimistic?: (
    payload: TPayload,
    ctx: { queryClient: ReturnType<typeof useQueryClient> },
  ) => void;
}

export type OfflineMutationResult<TPayload, TResult> = UseMutationResult<
  { queued: boolean; data?: TResult },
  Error,
  TPayload
> & {
  /** Fire the mutation. Resolves with `{ queued: true }` when stored offline. */
  submit: (payload: TPayload) => Promise<{ queued: boolean; data?: TResult }>;
};

/**
 * A drop-in replacement for `useMutation` that is offline-aware.
 *
 * Online  -> runs `mutationFn`, invalidates queries.
 * Offline -> persists the payload to the offline queue (via
 *            `registerQueueHandler` + `enqueue`), applies the optimistic
 *            update, and resolves with `{ queued: true }` so the UI can
 *            show "En attente de connexion" instead of an error.
 *
 * The registered handler is what `flushQueue()` calls when the network
 * returns, so the same `mutationFn` is reused for the replay.
 */
export function useOfflineMutation<TPayload, TResult>(
  options: OfflineMutationOptions<TPayload, TResult>,
): OfflineMutationResult<TPayload, TResult> {
  const { kind, mutationFn, invalidateKeys = [], onOptimistic } = options;
  const queryClient = useQueryClient();

  // Register once: the replay handler also invalidates on success so the
  // UI reconciles with the server's authoritative response.
  registerQueueHandler<TPayload>(kind, async (payload) => {
    const result = await mutationFn(payload);
    invalidateKeys.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key }),
    );
    return result;
  });

  const mutation = useMutation<
    { queued: boolean; data?: TResult },
    Error,
    TPayload
  >({
    mutationKey: [kind],
    mutationFn: async (payload: TPayload) => {
      onOptimistic?.(payload, { queryClient });

      if (!(await isCurrentlyOnline())) {
        await enqueue(kind, payload);
        return { queued: true };
      }

      try {
        const data = await mutationFn(payload);
        invalidateKeys.forEach((key) =>
          queryClient.invalidateQueries({ queryKey: key }),
        );
        return { queued: false, data };
      } catch (error) {
        // A network error mid-flight: degrade gracefully to the queue.
        if (!(await isCurrentlyOnline())) {
          await enqueue(kind, payload);
          return { queued: true };
        }
        throw error;
      }
    },
  });

  const submit = useCallback(
    (payload: TPayload) => mutation.mutateAsync(payload),
    [mutation],
  );

  return { ...mutation, submit };
}
