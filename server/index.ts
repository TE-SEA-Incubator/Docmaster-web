/**
 * ═════════════════════════════════════════════════════════════════
 * INDEX.TS - Express Application Factory
 * Creates and configures the entire Express app with all middlewares
 * and routes. Export this app to be used in server.ts
 * ═════════════════════════════════════════════════════════════════
 */

import express, { Application, Request, Response, NextFunction } from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import * as swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swagger.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import { pool } from "./src/database/db.js";
import { errorStatus } from "./src/utils/http-error.ts";
import authRoutes from "./src/routes/auth.routes.js";
import documentRoutes from "./src/routes/document.routes.js";
import shareRoutes from "./src/routes/share.routes.js";
import deviceRoutes from "./src/routes/device.routes.js";
import declarationRoutes from "./src/routes/declaration.routes.js";
import deletionRequestRoutes from "./src/routes/deletion-request.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import subscriptionRoutes from "./src/routes/subscription.routes.js";
import planRoutes from "./src/routes/plan.routes.js";
import claimRoutes from "./src/routes/claim.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import referralRoutes from "./src/routes/referral.routes.js";
import documentTypeRoutes from "./src/routes/document-type.routes.js";
import settingRoutes from "./src/routes/setting.routes.js";
import withdrawalRoutes from "./src/routes/withdrawal.routes.js";
import smsRoutes from "./src/routes/sms.routes.js";
import earningsRoutes from "./src/routes/earnings.routes.js";
import pointsRoutes from "./src/routes/points.routes.js";
import paymentMethodRoutes from "./src/routes/payment-method.routes.js";
import promoRoutes from "./src/routes/promo.routes.js";
import deviceTransferRoutes from "./src/routes/device-transfer.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import vaultMatchRoutes from "./src/routes/vault-match.routes.js";
import { autoriteRoutes } from "./src/modules/autorites/autorites.module.js";
import { partenaireRoutes } from "./src/modules/partenaires/partenaires.module.js";
import { locationRoutes } from "./src/routes/locations.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import recoveryRoutes from "./src/routes/recovery.routes.js";
import conversationRoutes from "./src/routes/conversation.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import sharepayWebhookRoutes from "./src/routes/sharepay-webhook.routes.js";
import appleWebhookRoutes from "./src/routes/apple-webhook.routes.js";
import testimonialRoutes from "./src/routes/testimonial.routes.js";
import { authMiddleware } from "./src/middleware/auth.middleware.js";
import { partenaireAuthMiddleware } from "./src/modules/partenaires/partenaires.middleware.js";

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
            "docmaster.net",
            "www.docmaster.net",



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
    "https://www.docmaster.net",
    "www.docmaster.net",
    "docmaster.net",
  ];

  // Chiller frontend origins
  allowedOrigins.push("http://localhost:4000");

  // Add custom domains from environment if set
  if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
  if (process.env.FRONTEND_DOMAIN) allowedOrigins.push(process.env.FRONTEND_DOMAIN);

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow any localhost origin: flutter web / vite dev servers use random ports
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(null, allowedOrigins.includes(origin));
    },
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

  // JSON body parser (conserve le corps brut pour vérifier les signatures webhook)
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    })
  );

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
  app.use("/api/earnings", earningsRoutes);
  app.use("/api/points", pointsRoutes);
  app.use("/api/payment-methods", paymentMethodRoutes);
  app.use("/api/promos", promoRoutes);
  app.use("/api/device-transfers", deviceTransferRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/vault-match", vaultMatchRoutes);
  app.use("/api/conversations", authMiddleware, conversationRoutes);
  app.use("/api/autorites", autoriteRoutes);
  // Enregistré avant le module partenaires : /api/partenaires/conversations ne doit pas
  // être absorbé par les routes paramétrées du module.
  app.use("/api/partenaires/conversations", partenaireAuthMiddleware, conversationRoutes);
  app.use("/api/partenaires", partenaireRoutes);
  app.use("/api/locations", locationRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/recovery", recoveryRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/testimonials", testimonialRoutes);
  app.use("/webhooks", sharepayWebhookRoutes); // SharePay webhook route
  // Alias pour l'URL configurée dans le dashboard SharePay (https://api-v2.docmaster.net/api/sharepay-webhook)
  app.use("/api", sharepayWebhookRoutes);
  app.use("/webhooks", appleWebhookRoutes); // App Store Server Notifications v2

  // ═════════════════════════════════════════════════════════════════
  // CHILLER SUB-APPLICATION
  // ═════════════════════════════════════════════════════════════════

  try {
    const chillerModule = require("./backend-chillers/src/app.ts");
    const chillerApp = chillerModule.default || chillerModule;
    app.use("/chiller", chillerApp);
    console.log("🎬 [Chiller] API mounted at /chiller");
  } catch (err: any) {
    console.warn("⚠️  [Chiller] Could not mount Chiller app:", err.message);
  }

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

  // ═════════════════════════════════════════════════════════════════
  // GLOBAL ERROR HANDLER
  // ═════════════════════════════════════════════════════════════════

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ [Global Error Handler]", err.message || err);

    // Multer errors carry no status: translate them into readable 400s.
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Fichier trop volumineux : 5 Mo maximum."
          : err.code === "LIMIT_UNEXPECTED_FILE"
            ? "Champ de fichier inattendu."
            : err.message;
      return res.status(400).json({ success: false, message });
    }

    const statusCode = errorStatus(err);
    res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 500 && process.env.NODE_ENV === "production"
          ? "Erreur interne du serveur."
          : err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  return app;
}
