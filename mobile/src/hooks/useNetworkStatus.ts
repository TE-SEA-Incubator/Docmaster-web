import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

import { flushQueue, subscribeToQueue } from "@/lib/offlineQueue";

export interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
}

/**
 * Reactive network + offline-queue status for UI (offline banner,
 * pending badge). Also auto-flushes the queue when connectivity returns.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      setIsOnline(online);
      if (online) void flushQueue();
    });

    const unsubQueue = subscribeToQueue((items) =>
      setPendingCount(items.length),
    );

    return () => {
      unsubNet();
      unsubQueue();
    };
  }, []);

  return { isOnline, pendingCount };
}
