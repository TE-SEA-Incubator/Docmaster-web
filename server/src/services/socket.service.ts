import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

import { jwtConfig } from '../config/jwt.ts';
import { Actor, actorFromJwt, actorKey } from '../utils/actor.utils.ts';
import { conversationRepository } from '../repositories/conversation.repository.ts';

const JWT_SECRET = jwtConfig.secret;
const AUTORITE_JWT_SECRET = process.env.AUTORITE_JWT_SECRET || 'autorite-secret-change-in-production';

const conversationRoom = (conversationId: string) => `conv-${conversationId}`;

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private actorSockets: Map<string, Set<string>> = new Map(); // actorKey(type:id) -> socketIds

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(server: HttpServer): Server {
    const allowedOrigins = [
      // Local development
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:3003",
      "http://localhost:8080",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3003",
      "http://127.0.0.1:8080",
      // Production
      "http://217.154.126.24:3003",
      "http://217.154.126.24:5000",
      "http://217.154.126.24",
      "https://docmaster.net",
      // Add from env if set
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
      ...(process.env.FRONTEND_DOMAIN ? [process.env.FRONTEND_DOMAIN] : [])
    ];

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        let decoded: any = null;
        try {
          decoded = jwt.verify(token, JWT_SECRET);
        } catch {
          // Tokens AUTORITE utilisent leur propre secret
          decoded = jwt.verify(token, AUTORITE_JWT_SECRET);
        }
        const actor = actorFromJwt(decoded);
        (socket as any).userId = actor.id;
        (socket as any).userRole = decoded.role || decoded.type || 'USER';
        (socket as any).actor = actor;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const actor: Actor = (socket as any).actor;
      const userRole = (socket as any).userRole;
      const key = actorKey(actor.type, actor.id);
      console.log(`🔌 ${actor.type} connected to socket: ${actor.id} (${socket.id}) role=${userRole}`);

      // Join admin room if admin
      if (userRole === 'ADMIN') {
        socket.join('admin');
        console.log(`👑 Admin ${actor.id} joined admin room`);
      }

      // Add socket to user's list
      const sockets = this.actorSockets.get(key) || new Set<string>();
      sockets.add(socket.id);
      this.actorSockets.set(key, sockets);

      socket.on('conversation:join', async (payload: { conversationId?: string }, ack?: (r: any) => void) => {
        const conversationId = payload?.conversationId;
        if (!conversationId) {
          ack?.({ success: false, message: 'conversationId requis' });
          return;
        }
        try {
          const membership = await conversationRepository.findMembership(conversationId, actor);
          if (!membership) {
            ack?.({ success: false, message: 'Non participant' });
            return;
          }
          socket.join(conversationRoom(conversationId));
          ack?.({ success: true });
        } catch (err) {
          console.error('[Socket] conversation:join failed:', err);
          ack?.({ success: false, message: 'Erreur serveur' });
        }
      });

      socket.on('conversation:leave', (payload: { conversationId?: string }) => {
        if (payload?.conversationId) {
          socket.leave(conversationRoom(payload.conversationId));
        }
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected from socket: ${socket.id}`);
        const userSockets = this.actorSockets.get(key);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.actorSockets.delete(key);
          }
        }
      });
    });

    return this.io;
  }

  /**
   * Les ids `users` et `partenaires` ne partagent pas le même espace : le type de l'acteur
   * fait partie de la clé, sinon un message partirait vers un homonyme de l'autre table.
   */
  public sendToActor(type: Actor['type'], id: string, event: string, data: any): void {
    if (!this.io) return;

    const socketIds = this.actorSockets.get(actorKey(type, id));
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((socketId) => {
        this.io?.to(socketId).emit(event, data);
      });
      console.log(`📤 Emitted ${event} to ${type} ${id}`);
    } else {
      console.log(`📭 ${type} ${id} is not connected via socket`);
    }
  }

  /** Diffusion vers tous les socket joins d'un fil. */
  public emitToConversation(conversationId: string, event: string, data: any): void {
    this.io?.to(conversationRoom(conversationId)).emit(event, data);
  }

  /**
   * Send to admin users only
   */
  public sendToAdmins(event: string, data: any): void {
    if (!this.io) return;
    this.io.to('admin').emit(event, data);
  }

  /**
   * Broadcast to all connected users
   */
  public broadcast(event: string, data: any): void {
    this.io?.emit(event, data);
  }
}
