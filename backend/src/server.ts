import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/env';
import savingsRoutes from './routes/savings.routes';
import { SchedulerService } from './services/scheduler.service';

/**
 * Express Server for AI Savings Agent Backend
 * 
 * Features:
 * - x402 payment integration
 * - Blockchain interaction (Cronos)
 * - CORS enabled for frontend
 * - Error handling middleware
 * - Request logging
 */

// Validate environment variables on startup
try {
  validateConfig();
  console.log('✅ Environment configuration validated');
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

// Initialize Express app
const app = express();

// Initialize Scheduler Service
const scheduler = new SchedulerService();

// ============================================================================
//                              MIDDLEWARE
// ============================================================================

/**
 * CORS Configuration
 * Allows frontend to make requests from different origin
 */
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

/**
 * JSON Body Parser
 * Parses incoming JSON request bodies
 */
app.use(express.json());

/**
 * URL-encoded Body Parser
 * Parses URL-encoded request bodies (form data)
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Request Logger Middleware
 * Logs all incoming requests for debugging
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
//                              ROUTES
// ============================================================================

/**
 * Root endpoint
 * Returns basic API information
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AI Savings Agent API',
    version: '1.0.0',
    description: 'Backend API with x402 payment integration for automated DeFi savings',
    endpoints: {
      health: 'GET /api/health',
      user: 'GET /api/user/:address',
      save: 'POST /api/save',
      schedulerStatus: 'GET /api/scheduler/status', // NEW
    },
    documentation: 'https://github.com/MBarralDevs/ai-saving-agent',
  });
});

// Mount savings routes under /api
app.use('/api', savingsRoutes);

// NEW: Scheduler status endpoint
app.get('/api/scheduler/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: scheduler.getStatus(),
  });
});
/**
 * 404 Handler
 * Handles requests to undefined routes
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

/**
 * Error Handler Middleware
 * Catches all errors and returns consistent error response
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server error:', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
//                           SERVER STARTUP
// ============================================================================

/**
 * Start the Express server
 */
const startServer = async () => {
  try {
    const PORT = config.port;

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log('🚀  AI Savings Agent Backend Started');
      console.log('🚀 ========================================');
      console.log('');
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`⛓️  Network: ${config.cronosChainId === 338 ? 'Cronos Testnet' : 'Cronos Mainnet'}`);
      console.log(`📍 Vault Address: ${config.savingsVaultAddress}`);
      console.log(`💵 USDC Address: ${config.usdcAddress}`);
      console.log(`🔗 CORS Origin: ${config.corsOrigin}`);
      console.log('');
      console.log('📚 Available endpoints:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/api/health`);
      console.log(`   GET  http://localhost:${PORT}/api/user/:address`);
      console.log(`   POST http://localhost:${PORT}/api/save`);
      console.log(`   GET  http://localhost:${PORT}/api/scheduler/status`); // NEW
      console.log('');
      
      // Start the AI scheduler
      console.log('🤖 Starting AI Decision Engine Scheduler...');
      scheduler.start();
      console.log('');
      
      console.log('✅ Ready to accept requests!');
      console.log('🚀 ========================================');
      console.log('');
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM signal received: closing HTTP server');
  scheduler.stop(); // NEW
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT signal received: closing HTTP server');
  scheduler.stop(); // NEW
  process.exit(0);
});