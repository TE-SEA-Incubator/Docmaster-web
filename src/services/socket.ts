import { io, Socket } from "socket.io-client";
import { getToken } from "../utils/cookie";
import { API_BASE_URL } from "./api";

type NotificationType =
  | "MATCH_FOUND"
  | "PAYMENT_RECEIVED"
  | "RECOVERY_SUCCESS"
  | "DOC_ADDED"
  | "WARNING"
  | "SYSTEM";

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

    const token = getToken();
    if (!token) return null;

    this.isInitialized = true;
    // URL de base pour socket.io doit être la racine du domaine/port de l'API
    // On extrait la partie base de l'URL sans le /api
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, "");

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("[Socket] Connected to", socketUrl);
    });

    this.socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    this.socket.on("authenticated", (payload: { userId?: string }) => {
      this.userId = payload?.userId ?? null;
    });

    this.socket.on("notification", (notification: AppNotification) => {
      this.handleNotification(notification);
    });

    this.socket.on("MATCHING:CYCLE_START", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:matching-cycle-start", { detail: data }));
    });

    this.socket.on("MATCHING:CHECKING", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:matching-checking", { detail: data }));
    });

    this.socket.on("MATCHING:MATCH_FOUND", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:matching-match-found", { detail: data }));
    });

    this.socket.on("MATCHING:ATTEMPT", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:matching-attempt", { detail: data }));
    });

    this.socket.on("MATCHING:CYCLE_END", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:matching-cycle-end", { detail: data }));
    });

    this.socket.on("MATCHING:CYCLE_ERROR", (data: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:matching-cycle-error", { detail: data }));
    });

    this.socket.io?.on?.("reconnect_attempt", () => {
      const newToken = getToken();
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
    if (!this.socket?.connected) {
      console.warn("[Socket] Not connected — emit skipped for", event);
      return;
    }
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

  private getIconForType(type: NotificationType): string {
    switch (type) {
      case "MATCH_FOUND":
        return "fa-solid fa-handshake";
      case "PAYMENT_RECEIVED":
        return "fa-solid fa-money-bill-wave";
      case "RECOVERY_SUCCESS":
        return "fa-solid fa-circle-check";
      case "DOC_ADDED":
        return "fa-solid fa-file-circle-plus";
      default:
        return "fa-solid fa-bell";
    }
  }

  private handleNotification(notification: AppNotification): void {
    window.dispatchEvent(
      new CustomEvent("docmaster:notification", { detail: notification })
    );
  }
}

export const socketService = new SocketService();
