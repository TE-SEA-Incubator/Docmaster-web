import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise';

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

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
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (socket as any).userId = decoded.id;
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;
      console.log(`🔌 User connected to socket: ${userId} (${socket.id})`);

      // Add socket to user's list
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(socket.id);
      this.userSockets.set(userId, sockets);

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected from socket: ${socket.id}`);
        const userSockets = this.userSockets.get(userId) || [];
        const filtered = userSockets.filter(id => id !== socket.id);
        if (filtered.length > 0) {
          this.userSockets.set(userId, filtered);
        } else {
          this.userSockets.delete(userId);
        }
      });
    });

    return this.io;
  }

  /**
   * Send notification to a specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach(id => {
        this.io?.to(id).emit(event, data);
      });
      console.log(`📤 Emitted ${event} to user ${userId}`);
    } else {
      console.log(`📭 User ${userId} is not connected via socket`);
    }
  }

  /**
   * Broadcast to all connected users
   */
  public broadcast(event: string, data: any): void {
    this.io?.emit(event, data);
  }
}
