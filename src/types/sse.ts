export interface SSEMessage {
  type: 'connection' | 'notification' | 'heartbeat' | 'error';
  data?: any;
  message?: string;
  timestamp: string;
  userId?: string;
}

export interface ConnectionInfo {
  userId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  clientInfo?: {
    userAgent?: string | undefined;
    ip?: string | undefined;
  } | undefined;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  connections: number;
  uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
  };
  timestamp: string;
}