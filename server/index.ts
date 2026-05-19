/**
 * ═════════════════════════════════════════════════════════════════
 * INDEX.TS - Express Application Factory
 * Creates and configures the entire Express app with all middlewares
 * and routes. Export this app to be used in server.ts
 * ═════════════════════════════════════════════════════════════════
 */

import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import * as swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swagger.ts";
import cookieParser from "cookie-parser";
import { pool } from "./src/database/db.js";
import authRoutes from "./src/routes/auth.routes.ts";
import documentRoutes from "./src/routes/document.routes.ts";
import shareRoutes from "./src/routes/share.routes.ts";
import deviceRoutes from "./src/routes/device.routes.ts";
import declarationRoutes from "./src/routes/declaration.routes.ts";
import deletionRequestRoutes from "./src/routes/deletion-request.routes.ts";
import notificationRoutes from "./src/routes/notification.routes.ts";
import subscriptionRoutes from "./src/routes/subscription.routes.ts";
import planRoutes from "./src/routes/plan.routes.ts";
import claimRoutes from "./src/routes/claim.routes.ts";
import paymentRoutes from "./src/routes/payment.routes.ts";
import referralRoutes from "./src/routes/referral.routes.ts";
import documentTypeRoutes from "./src/routes/document-type.routes.ts";
import settingRoutes from "./src/routes/setting.routes.ts";
import withdrawalRoutes from "./src/routes/withdrawal.routes.ts";
import smsRoutes from "./src/routes/sms.routes.ts";

// Load environment variables
dotenv.config();

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // ═════════════════════════════════════════════════════════════════
  // SECURITY MIDDLEWARE
  // ═════════════════════════════════════════════════════════════════

  // Helmet - Security headers with CSP adjustment for local images and Swagger UI
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": [
            "'self'",
            "data:",
            // Local development
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            // Production
            "http://217.154.126.24:5000",
            "https://217.154.126.24:5000",
            "http://217.154.126.24:3003",
            "https://217.154.126.24:3003",
            "https://docmaster.net",

            
            // Swagger validators
            "validator.swagger.io"
          ],
          "script-src": ["'self'", "'unsafe-inline'", "http://217.154.126.24:5000", "https://217.154.126.24:5000"],
          "style-src": ["'self'", "'unsafe-inline'", "http://217.154.126.24:5000", "https://217.154.126.24:5000"],
          "font-src": ["'self'", "data:", "http://217.154.126.24:5000", "https://217.154.126.24:5000"],
          "connect-src": ["'self'", "http://217.154.126.24:5000", "https://217.154.126.24:5000", "localhost:5000", "validator.swagger.io"],
        },
      },
    }),
  );

  // ═════════════════════════════════════════════════════════════════
  // CORS MIDDLEWARE
  // ═════════════════════════════════════════════════════════════════

  // Configure CORS options
  const allowedOrigins: string[] = [
    // Local development
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:3003",
    "http://localhost:5000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:5000",
    // Production (HTTP only - no HTTPS)
    "http://217.154.126.24:3003",
    "http://217.154.126.24:5000",
    "http://217.154.126.24",
    "https://docmaster.net",
  ];

  // Add custom domains from environment if set
  if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
  if (process.env.FRONTEND_DOMAIN) allowedOrigins.push(process.env.FRONTEND_DOMAIN);

  const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 3600, // Pre-flight request cache time (1 hour)
  };

  app.use(cors(corsOptions));

  // ═════════════════════════════════════════════════════════════════
  // STATIC FILES & BODY PARSER
  // ═════════════════════════════════════════════════════════════════

  // Serve static files from uploads folder
  app.use("/uploads", express.static("uploads"));

  // JSON body parser
  app.use(express.json());

  // URL-encoded body parser
  app.use(express.urlencoded({ extended: true }));

  // Cookie parser
  app.use(cookieParser(process.env.COOKIE_SECRET || "docmaster_secret_key"));

  // ═════════════════════════════════════════════════════════════════
  // MORGAN HTTP REQUEST LOGGING
  // ═════════════════════════════════════════════════════════════════

  // Create custom morgan format with emojis
  morgan.token("statusEmoji", (req: any, res: any) => {
    const statusCode = res.statusCode;
    if (statusCode >= 500) return "🔴"; // Server error
    if (statusCode >= 400) return "🔴"; // Client error
    if (statusCode >= 300) return "🟡"; // Redirect
    return "🟢"; // Success
  });

  const morganFormat =
    ":statusEmoji :status [:date[iso]] :method :url - :response-time ms";
  app.use(morgan(morganFormat));

  // ═════════════════════════════════════════════════════════════════
  // HEALTH CHECK ENDPOINT
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /health
   * Health check endpoint for monitoring
   */
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0-ts",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // DATABASE TEST ENDPOINT
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /api/db-test
   * Test database connection
   */
  app.get("/api/db-test", async (req: Request, res: Response) => {
    try {
      const result = await pool.query("SELECT NOW() as now");
      res.json({
        success: true,
        message: "Database connection is working",
        time: result.rows[0].now,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // SWAGGER DOCUMENTATION
  // ═════════════════════════════════════════════════════════════════

  /**
   * Serve Swagger API Documentation
   * Accessible at /api-docs
   */
  console.log('📑 [Swagger] Spec generated:', !!swaggerSpec);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ═════════════════════════════════════════════════════════════════
  // API ROUTES
  // ═════════════════════════════════════════════════════════════════

  /**
   * Authentication Routes
   * POST /api/auth/register
   * POST /api/auth/login
   * POST /api/auth/forgot-password
   * POST /api/auth/reset-password
   */
  app.use("/api/auth", authRoutes);

  /**
   * Document Routes
   * POST /api/documents (Create)
   * GET /api/documents (List)
   * DELETE /api/documents/:id (Delete)
   */
  app.use("/api/documents", documentRoutes);
  app.use("/api/shares", shareRoutes);
  app.use("/api/devices", deviceRoutes);
  app.use("/api/declarations", declarationRoutes);
  app.use("/api/deletion-requests", deletionRequestRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/plans", planRoutes);
  app.use("/api/claims", claimRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/referrals", referralRoutes);
  app.use("/api/document-types", documentTypeRoutes);
  app.use("/api/settings", settingRoutes);
  app.use("/api/withdrawals", withdrawalRoutes);
  app.use("/api/sms", smsRoutes);

  // ═════════════════════════════════════════════════════════════════
  // ERROR HANDLING - 404 Handler
  // ═════════════════════════════════════════════════════════════════

  /**
   * 404 - Not Found Handler (must be last route)
   */
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
