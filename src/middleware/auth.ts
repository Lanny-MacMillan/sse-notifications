import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthUser } from '../types';
import { verifyStreamTicket } from '../lib/streamTicket';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type FoundUser = {
  id: string;
  auth0Sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  subscriptionPlan: AuthUser['subscriptionPlan'];
};

const userSelect = {
  id: true,
  auth0Sub: true,
  email: true,
  name: true,
  picture: true,
  subscriptionPlan: true,
  subscriptionStartDate: true,
  subscriptionEndDate: true,
  createdAt: true,
} as const;

async function loadUserByAuth0Sub(auth0Sub: string): Promise<FoundUser | null> {
  const user = await prisma.user.findUnique({ where: { auth0Sub }, select: userSelect });
  if (user) return user;

  // Create test user for development only. Never auto-provision accounts in production.
  if (
    process.env.NODE_ENV !== 'production' &&
    (auth0Sub.includes('test') || auth0Sub.includes('google-oauth2'))
  ) {
    console.log(`Creating test user for auth0Sub: ${auth0Sub}`);

    return prisma.user.create({
      data: {
        auth0Sub,
        email: `test-${Date.now()}@example.com`,
        name: `Test User ${auth0Sub.slice(-6)}`,
        picture: null,
        subscriptionPlan: 'plus', // Give test users plus subscription
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      select: userSelect,
    });
  }

  return null;
}

/**
 * Authenticates a stream request from the signed, short-lived ticket the app
 * issues to a logged-in user. The user id in the URL is never trusted.
 */
export const createAuthenticateUser =
  (loadUser: (auth0Sub: string) => Promise<FoundUser | null>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const secret = process.env.API_SECRET;
      if (!secret) {
        console.error('API_SECRET environment variable not set');
        res.status(500).json({
          error: 'Server configuration error',
          message: 'Authentication not properly configured',
        });
        return;
      }

      const ticket = req.query.ticket;
      if (typeof ticket !== 'string' || !ticket) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Missing stream ticket',
        });
        return;
      }

      let auth0Sub: string;
      try {
        auth0Sub = await verifyStreamTicket(ticket, secret);
      } catch {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Invalid or expired stream ticket',
        });
        return;
      }

      const user = await loadUser(auth0Sub);
      if (!user) {
        res.status(401).json({
          error: 'User not found',
          message: 'No user exists for this ticket',
        });
        return;
      }

      req.user = {
        id: user.id,
        auth0Sub: user.auth0Sub,
        email: user.email || undefined,
        name: user.name || undefined,
        picture: user.picture || undefined,
        subscriptionPlan: user.subscriptionPlan,
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        error: 'Authentication failed',
        message: 'Internal server error during authentication',
      });
    }
  };

export const authenticateUser = createAuthenticateUser(loadUserByAuth0Sub);

/**
 * API key authentication middleware for internal endpoints
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'] as string;
    const expectedApiKey = process.env.API_SECRET;

    if (!expectedApiKey) {
      console.error('API_SECRET environment variable not set');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'API authentication not properly configured',
      });
      return;
    }

    if (!apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'Missing API key in Authorization header or x-api-key header',
      });
      return;
    }

    if (apiKey !== expectedApiKey) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during API key validation',
    });
  }
};

/**
 * Rate limiting middleware (simple implementation)
 * Prevents abuse of SSE connections
 */
const connectionAttempts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitSSE = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${clientIP}:${req.user?.auth0Sub ?? 'anonymous'}`;
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 10; // Max 10 connection attempts per minute

  const current = connectionAttempts.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    connectionAttempts.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return next();
  }

  if (current.count >= maxAttempts) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many connection attempts. Please try again later.',
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    });
    return;
  }

  current.count++;
  next();
};

/**
 * Validate notification data middleware
 */
export const validateNotificationData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { userId, notification } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'userId is required and must be a string',
      });
      return;
    }

    if (!notification || typeof notification !== 'object') {
      res.status(400).json({
        error: 'Invalid request',
        message: 'notification object is required',
      });
      return;
    }

    const { type, title } = notification;

    if (!type || typeof type !== 'string') {
      res.status(400).json({
        error: 'Invalid notification',
        message: 'notification.type is required and must be a string',
      });
      return;
    }

    if (!title || typeof title !== 'string') {
      res.status(400).json({
        error: 'Invalid notification',
        message: 'notification.title is required and must be a string',
      });
      return;
    }

    // Optional fields validation
    if (notification.message && typeof notification.message !== 'string') {
      res.status(400).json({
        error: 'Invalid notification',
        message: 'notification.message must be a string if provided',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Notification validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: 'Internal server error during validation',
    });
  }
};