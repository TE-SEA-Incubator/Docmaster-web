import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

/**
 * Bridges @react-native-community/netinfo into TanStack Query's
 * onlineManager. When offline, React Query pauses queries and queues
 * "paused" mutations; when connectivity returns it resumes them.
 *
 * "Online" here means: connected AND the internet is actually reachable
 * (isInternetReachable), which avoids false positives on captive portals.
 */
export function initOnlineManager(): () => void {
  let netUnsubscribe: (() => void) | undefined;

  onlineManager.setEventListener((setOnline) => {
    netUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      setOnline(online);
    });
    return netUnsubscribe;
  });

  return () => netUnsubscribe?.();
}

/** One-shot connectivity check (used before flushing the offline queue). */
export async function isCurrentlyOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
