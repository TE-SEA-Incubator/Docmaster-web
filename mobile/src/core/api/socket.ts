import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';
import { useAuthStore } from '@/core/store/useAuthStore';
import { queryClient } from './queryClient';

type NotificationType =
  | 'MATCH_FOUND'
  | 'PAYMENT_RECEIVED'
  | 'RECOVERY_SUCCESS'
  | 'DOC_ADDED'
  | 'WARNING'
  | 'SYSTEM';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
}

type ListenerMap = Map<string, Set<(...args: unknown[]) => void>>;

class SocketService {
  private socket: Socket | null = null;
  private listeners: ListenerMap = new Map();
  private userId: string | null = null;
  private isInitialized = false;

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  init(): Socket | null {
    if (this.isInitialized && this.socket?.connected) return this.socket;

    const token = useAuthStore.getState().token;
    if (!token) return null;

    this.isInitialized = true;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {});

    this.socket.on('connect_error', () => {});

    this.socket.on('disconnect', () => {});

    this.socket.on('authenticated', (payload: { userId?: string }) => {
      this.userId = payload?.userId ?? null;
    });

    this.socket.on('notification', (notification: AppNotification) => {
      this.handleNotification(notification);
      // Invalidation sur notification
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    // Écouteurs pour la synchronisation de données pure (sans forcément de notification)
    this.socket.on('documents:update', () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    this.socket.on('documents:create', () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    this.socket.on('documents:delete', () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

    this.socket.io?.on?.('reconnect_attempt', () => {
      const newToken = useAuthStore.getState().token;
      if (newToken && this.socket) {
        this.socket.auth = { token: newToken };
      }
    });

    return this.socket;
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.socket) return;
    this.socket.on(event, handler);
    const set = this.listeners.get(event) || new Set();
    set.add(handler);
    this.listeners.set(event, set);
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(event, handler);
      const set = this.listeners.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) this.listeners.delete(event);
      }
    } else {
      const set = this.listeners.get(event);
      if (set) {
        set.forEach((h) => this.socket!.off(event, h));
        this.listeners.delete(event);
      } else {
        this.socket.removeAllListeners(event);
      }
    }
  }

  emit(event: string, payload?: unknown): void {
    if (!this.socket?.connected) return;
    this.socket.emit(event, payload);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isInitialized = false;
    this.userId = null;
    this.listeners.clear();
  }

  private handleNotification(notification: AppNotification): void {
    const set = this.listeners.get('notification');
    if (set) {
      set.forEach((handler) => handler(notification));
    }
  }
}

export const socketClient = new SocketService();
