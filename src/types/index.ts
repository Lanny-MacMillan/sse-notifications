// Type definitions index
export * from './notification';
export * from './user';
export * from './sse';

// Express types
export interface RequestWithUser extends Request {
  user?: import('./user').AuthUser;
}

// Environment types
export interface Environment {
  DATABASE_URL: string;
  PORT?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
  CORS_ORIGINS?: string;
  API_SECRET?: string;
  ENABLE_LOGGING?: string;
  HEARTBEAT_INTERVAL?: string;
}