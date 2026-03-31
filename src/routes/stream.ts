import { Router, Request, Response } from 'express';
import { connectionManager } from '@/services/connections';
import { authenticateUser, rateLimitSSE } from '@/middleware/auth';

const router = Router();

/**
 * SSE Stream endpoint
 * GET /stream?auth0Sub=<auth0_sub>
 */
router.get('/stream', rateLimitSSE, authenticateUser, (req: Request, res: Response) => {
  try {
    // user is guaranteed to exist after authenticateUser middleware
    const user = req.user!; 

    console.log(`SSE connection request for user: ${user.id} (${user.auth0Sub})`);

    // set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    // add connection to manager
    const userAgent = req.get('User-Agent');
    const ip = req.ip || req.connection.remoteAddress;
    
    const clientInfo = {
      ...(userAgent && { userAgent }),
      ...(ip && { ip }),
    };

    connectionManager.addConnection(user.id, res, Object.keys(clientInfo).length > 0 ? clientInfo : undefined);

    // handle client disconnect
    req.on('close', () => {
      console.log(`SSE connection closed for user: ${user.id}`);
      connectionManager.removeConnection(user.id, res);
    });

    req.on('error', (error) => {
      console.error(`SSE connection error for user ${user.id}:`, error);
      connectionManager.removeConnection(user.id, res);
    });

  } catch (error) {
    console.error('Error establishing SSE connection:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Connection failed',
        message: 'Failed to establish SSE connection',
      });
    }
  }
});

export default router;