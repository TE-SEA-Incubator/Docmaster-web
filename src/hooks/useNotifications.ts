import { useState, useEffect, useCallback } from "react";
import { notificationsService } from "../services/notificationsService";
import type { Notification } from "../types/api";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsService.getAll();
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !(n.is_read ?? n.lue)).length);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur de chargement");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const handler = () => fetch();
    window.addEventListener("docmaster:notification-read", handler);
    return () => window.removeEventListener("docmaster:notification-read", handler);
  }, [fetch]);

  const markAsRead = useCallback(async (id: string) => {
    const res = await notificationsService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, lue: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    window.dispatchEvent(new CustomEvent("docmaster:notification-read"));
    return res;
  }, []);

  const markAllAsRead = useCallback(async () => {
    const res = await notificationsService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, lue: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent("docmaster:notification-read"));
    return res;
  }, []);

  return { notifications, loading, error, unreadCount, fetch, markAsRead, markAllAsRead };
}
