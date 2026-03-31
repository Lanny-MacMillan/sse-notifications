import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import middleware
import { corsConfig } from './middleware/cors';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler';

// Import routes
import streamRoutes from './routes/stream';
import notifyRoutes from './routes/notify';
import healthRoutes from './routes/health';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Create Express app
const app = express();
// const PORT = process.env.PORT || 4000;
const PORT = Number(process.env.PORT) || 4000;

// Trust proxy for accurate client IP addresses
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for SSE
  crossOriginEmbedderPolicy: false, // Allow embedding for SSE
}));

// CORS configuration
app.use(corsConfig);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/', streamRoutes); // SSE stream endpoint at /stream
app.use('/api', notifyRoutes); // Notification API endpoints
app.use('/', healthRoutes); // Health check endpoints

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SSE Notifications Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      stream: 'GET /stream?auth0Sub=<auth0_sub>',
      notify: 'POST /api/notify',
      health: 'GET /health',
      unreadNotifications: 'GET /api/notifications/unread?userId=<user_id>',
      markRead: 'POST /api/notifications/read',
      markDismissed: 'POST /api/notifications/dismiss',
    },
    documentation: 'https://github.com/your-repo/sse-notifications',
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SSE Notifications Service started successfully`);
  console.log(`✅ SSE Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Detailed status: http://localhost:${PORT}/health/detailed`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`SSE endpoint: http://localhost:${PORT}/stream?auth0Sub=<your_auth0_sub>`);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('⚠️ HTTP server closed');
    console.log('⚠️ SSE Notifications Service stopped gracefully');
    process.exit(0);
  });

  // Force exit after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after 30 seconds timeout');
    process.exit(1);
  }, 30000);
};

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});



export default app;