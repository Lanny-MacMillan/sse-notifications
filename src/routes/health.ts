import { Router, Request, Response } from 'express';
import { connectionManager } from '@/services/connections';
import type { HealthStatus } from '@/types';

const router = Router();

// Server start time for uptime calculation
const startTime = Date.now();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const uptime = Math.floor((now - startTime) / 1000); // uptime in seconds
    const memoryUsage = process.memoryUsage();

    // Get connection statistics
    const connectionStats = connectionManager.getConnectionStats();

    const healthStatus: HealthStatus = {
      status: 'ok',
      connections: connectionStats.totalConnections,
      uptime,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        free: Math.round((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      },
      timestamp: new Date().toISOString(),
    };

    // Add detailed connection info if requested
    if (req.query.detailed === 'true') {
      (healthStatus as any).connectionDetails = {
        activeUsers: connectionStats.activeUsers,
        userConnections: connectionStats.userStats.map(user => ({
          userId: user.userId,
          connectionCount: user.connectionCount,
          connections: user.info.map(info => ({
            connectedAt: info.connectedAt,
            lastHeartbeat: info.lastHeartbeat,
            clientInfo: info.clientInfo,
          })),
        })),
      };
    }

    // Add environment info if in development
    if (process.env.NODE_ENV === 'development') {
      (healthStatus as any).environment = {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        heartbeatInterval: process.env.HEARTBEAT_INTERVAL || '15000',
      };
    }

    res.json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorStatus: HealthStatus = {
      status: 'error',
      connections: 0,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        used: 0,
        free: 0,
        total: 0,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(500).json({
      ...errorStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Detailed system status endpoint (for monitoring)
 * GET /health/detailed
 */
router.get('/health/detailed', (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const connectionStats = connectionManager.getConnectionStats();

    const detailedStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor((Date.now() - startTime) / 1000),
        human: formatUptime(Math.floor((Date.now() - startTime) / 1000)),
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      connections: {
        total: connectionStats.totalConnections,
        activeUsers: connectionStats.activeUsers,
        users: connectionStats.userStats,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        nodeEnv: process.env.NODE_ENV,
        heartbeatInterval: process.env.HEARTBEAT_INTERVAL || '15000',
      },
    };

    res.json(detailedStatus);

  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Format uptime in human readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;