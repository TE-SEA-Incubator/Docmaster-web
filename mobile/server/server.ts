import 'reflect-metadata';
/**
 * ═════════════════════════════════════════════════════════════════
 * SERVER.TS - Server Start Point
 * Imports the configured app from index.ts and starts the server
 * ═════════════════════════════════════════════════════════════════
 */

import { createApp } from './index.js';
import { initCronJobs } from './src/utils/cron.utils.ts';
import { matchingService } from './src/services/matching.service.ts';
import { SocketService } from './src/services/socket.service.ts';

// Get configuration from environment
const PORT = process.env.PORT || 3003;

// Create the app (all middlewares and routes are set up in index.ts)
const app = createApp();

// Start listening on the port
const server = app.listen(PORT, () => {
  console.log(`\n🚀 DocMaster Server (TypeScript) started on http://localhost:${PORT}`);
  
  // Initialize Socket.io
  const socketService = SocketService.getInstance();
  socketService.init(server);
  console.log(`🔌 Real-time Socket.io initialized`);

  console.log(`📚 API Base: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🗄️  DB Test: http://localhost:${PORT}/api/db-test\n`);

  // Start Background Workers via Cron
  initCronJobs();

  // Run a first cycle after 30 seconds to catch up on startup
  setTimeout(() => {
    console.log('🚀 [STARTUP] Running initial matching cycle...');
    matchingService.runFullMatchingCycle();
  }, 30 * 1000);
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use.`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
