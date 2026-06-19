import { useEffect, useState } from 'react';
import { socketClient } from '@/core/api/socket';

type NotificationEvent = {
  type: 'MATCH_FOUND' | 'DOC_ADDED' | 'PAYMENT_RECEIVED' | 'RECOVERY_SUCCESS' | 'WARNING' | 'SYSTEM';
  document?: unknown;
  message: string;
  title: string;
};

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    const handleNotification = (data: unknown) => {
      const event = data as NotificationEvent;
      setNotifications((prev) => [event, ...prev]);
    };

    socketClient.init();
    socketClient.on('notification', handleNotification);

    return () => {
      socketClient.off('notification', handleNotification);
    };
  }, []);

  const clearNotifications = () => setNotifications([]);

  return {
    notifications,
    clearNotifications,
  };
}
