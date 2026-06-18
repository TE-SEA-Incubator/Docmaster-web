import AsyncStorage from "@react-native-async-storage/async-storage";

import { isCurrentlyOnline } from "./onlineManager";

/**
 * A lightweight, persisted "outbox" of mutations performed while
 * offline. Each entry references a registered handler by `kind` and
 * carries the JSON-serializable `payload` to replay against the API.
 *
 * Flow:
 *  1. A mutation fails (or is skipped) because the device is offline.
 *  2. We `enqueue()` it and optimistically update the UI.
 *  3. When connectivity returns, `flushQueue()` replays every entry in
 *     FIFO order and removes the ones that succeed.
 */

const STORAGE_KEY = "docmaster.offlineQueue.v1";

export interface QueuedMutation<TPayload = unknown> {
  id: string;
  kind: string;
  payload: TPayload;
  createdAt: number;
  retries: number;
}

type Handler = (payload: unknown) => Promise<unknown>;

const handlers = new Map<string, Handler>();
const listeners = new Set<(items: QueuedMutation[]) => void>();
let isFlushing = false;

/** Register the executor that knows how to replay a given `kind`. */
export function registerQueueHandler<TPayload>(
  kind: string,
  handler: (payload: TPayload) => Promise<unknown>,
): void {
  handlers.set(kind, handler as Handler);
}

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

export async function getQueue(): Promise<QueuedMutation[]> {
  return readQueue();
}

/** Subscribe to queue changes (e.g. to render a pending badge). */
export function subscribeToQueue(
  listener: (items: QueuedMutation[]) => void,
): () => void {
  listeners.add(listener);
  void readQueue().then(listener);
  return () => listeners.delete(listener);
}

export async function enqueue<TPayload>(
  kind: string,
  payload: TPayload,
): Promise<QueuedMutation<TPayload>> {
  const item: QueuedMutation<TPayload> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    kind,
    payload,
    createdAt: Date.now(),
    retries: 0,
  };
  const items = await readQueue();
  items.push(item);
  await writeQueue(items);
  return item;
}

/**
 * Replays queued mutations against the API. Safe to call repeatedly;
 * it no-ops while offline or already flushing. Returns the number of
 * entries successfully processed.
 */
export async function flushQueue(): Promise<number> {
  if (isFlushing) return 0;
  if (!(await isCurrentlyOnline())) return 0;

  isFlushing = true;
  let processed = 0;
  try {
    let items = await readQueue();
    for (const item of items) {
      const handler = handlers.get(item.kind);
      if (!handler) continue; // No handler registered yet; keep for later.
      try {
        await handler(item.payload);
        processed += 1;
        items = (await readQueue()).filter((q) => q.id !== item.id);
        await writeQueue(items);
      } catch {
        // Leave the entry in place; bump retries and stop the batch so we
        // preserve ordering and don't hammer a failing endpoint.
        items = (await readQueue()).map((q) =>
          q.id === item.id ? { ...q, retries: q.retries + 1 } : q,
        );
        await writeQueue(items);
        break;
      }
    }
  } finally {
    isFlushing = false;
  }
  return processed;
}

export async function clearQueue(): Promise<void> {
  await writeQueue([]);
}
