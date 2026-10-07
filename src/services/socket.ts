import { io, Socket } from "socket.io-client";
import { getToken, type TokenPortal } from "../utils/cookie";
import { API_BASE_URL, refreshAccessToken } from "./api";

/** Le même serveur Socket.IO sert les 4 portails : le token doit suivre l'URL courante. */
function activePortal(): TokenPortal {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/partenaire")) return "partenaire";
  if (path.startsWith("/autorite")) return "autorite";
  return "user";
}

interface ConversationOpenedPayload {
  conversationId?: string;
  declarationId?: string;
}

interface ConversationClosedPayload {
  conversationId?: string;
}

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

/** Le middleware d'authentification du serveur rejette un jeton périmé avec ce
 *  message : la réponse doit déclencher une réauthentification, pas un abandon. */
function isAuthHandshakeError(message: string): boolean {
  return message.includes("Authentication error");
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: ListenerMap = new Map();
  private userId: string | null = null;
  private rooms: Set<string> = new Set();
  /** Le client détruit son socket quand le handshake est refusé : un tel socket
   *  ne se relance plus, il faut en créer un neuf. */
  private destroyed = false;
  private recovering = false;
  private managerHandlers: Array<{ event: string; handler: () => void }> = [];

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  init(): Socket | null {
    // Un socket déjà en cours d'ouverture ou connecté suffit : monter deux fois
    // (StrictMode) créerait un second socket et doublerait les événements.
    if (this.socket && !this.destroyed) return this.socket;
    if (this.destroyed) this.teardown();

    const token = getToken(activePortal());
    if (!token) return null;

    // URL de base pour socket.io doit être la racine du domaine/port de l'API
    // On extrait la partie base de l'URL sans le /api
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, "");

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this.destroyed = false;
      console.log("[Socket] Connected to", socketUrl);
      // Une reconnexion crée une nouvelle socket : les rooms sont perdues, il faut les redemander.
      this.rooms.forEach((conversationId) =>
        this.socket?.emit("conversation:join", { conversationId })
      );
    });

    this.socket.on("connect_error", (err) => {
      this.destroyed = true;
      console.warn("[Socket] Connection warning:", err.message);
      if (isAuthHandshakeError(err.message)) void this.recoverFromAuthError();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      if (reason === "io server disconnect") this.destroyed = true;
    });

    this.socket.on("authenticated", (payload: { userId?: string }) => {
      this.userId = payload?.userId ?? null;
    });

    this.socket.on("NEW_NOTIFICATION", (notification: AppNotification) => {
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

    this.socket.on("MESSAGE_NEW", (message: unknown) => {
      window.dispatchEvent(new CustomEvent("docmaster:conversation-message", { detail: message }));
    });

    this.socket.on("CONVERSATION_OPENED", (data: ConversationOpenedPayload) => {
      if (data?.conversationId) this.rooms.add(data.conversationId);
      window.dispatchEvent(new CustomEvent("docmaster:conversation-opened", { detail: data }));
    });

    this.socket.on("CONVERSATION_CLOSED", (data: ConversationClosedPayload) => {
      window.dispatchEvent(new CustomEvent("docmaster:conversation-closed", { detail: data }));
    });

    const refreshAuth = () => {
      const newToken = getToken(activePortal());
      if (newToken && this.socket) {
        this.socket.auth = { token: newToken };
      }
    };
    this.socket.io?.on?.("reconnect_attempt", refreshAuth);
    this.managerHandlers.push({ event: "reconnect_attempt", handler: refreshAuth });

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

  /** L'abonnement serveur vérifie la participation : un acteur non participant ne reçoit rien. */
  joinConversation(conversationId: string): void {
    this.rooms.add(conversationId);
    if (!this.socket || this.destroyed) this.init();
    if (!this.socket?.connected) return;
    this.socket.emit("conversation:join", { conversationId });
  }

  leaveConversation(conversationId: string): void {
    this.rooms.delete(conversationId);
    if (!this.socket?.connected) return;
    this.socket.emit("conversation:leave", { conversationId });
  }

  disconnect(): void {
    this.teardown();
    this.userId = null;
    this.rooms.clear();
    this.listeners.clear();
  }

  private teardown(): void {
    const socket = this.socket;
    if (socket) {
      // `off` du Manager n'ouvre ses events réservés qu'au typage interne.
      const manager = socket.io as unknown as
        { off?: (event: string, handler: () => void) => void };
      this.managerHandlers.forEach(({ event, handler }) => manager.off?.(event, handler));
      socket.removeAllListeners();
      socket.disconnect();
      this.socket = null;
    }
    this.managerHandlers = [];
    this.destroyed = false;
  }

  /** Le jeton stocké était périmé : on en obtient un neuf puis on relance la
   *  connexion — les rooms sont redemandées par le handler `connect`. */
  private async recoverFromAuthError(): Promise<void> {
    if (this.recovering) return;
    this.recovering = true;
    try {
      const token = await refreshAccessToken(activePortal());
      if (!token) return;
      this.teardown();
      this.init();
    } finally {
      this.recovering = false;
    }
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
