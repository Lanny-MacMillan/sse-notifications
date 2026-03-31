import { Response } from 'express';
import { SSEMessage, ConnectionInfo } from '@/types';

/**
 * SSE Connection Management Service
 * Handles persistent connections, message broadcasting, and connection cleanup
 */
class ConnectionManager {
  // Map of userId -> Set of response objects for that user
  private connections = new Map<string, Set<Response>>();
  
  // Connection metadata for monitoring
  private connectionInfo = new Map<string, ConnectionInfo[]>();
  
  // Heartbeat interval
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL || '15000');

  constructor() {
    this.startHeartbeat();
    this.setupGracefulShutdown();
  }

  /**
   * Add a new SSE connection for a user
   */
  addConnection(userId: string, response: Response, clientInfo?: { userAgent?: string | undefined; ip?: string | undefined }): void {
    try {
      // Initialize user connections if not exists
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
        this.connectionInfo.set(userId, []);
      }

      const userConnections = this.connections.get(userId)!;
      const userInfo = this.connectionInfo.get(userId)!;

      // Add the connection
      userConnections.add(response);
      
      // Add connection metadata
      const connectionMetadata: ConnectionInfo = {
        userId,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
        clientInfo,
      };
      userInfo.push(connectionMetadata);

      // Setup connection cleanup on close
      response.on('close', () => {
        this.removeConnection(userId, response);
      });

      // Send welcome message
      this.sendToConnection(response, {
        type: 'connection',
        message: `Connected to SSE stream for user ${userId}`,
        timestamp: new Date().toISOString(),
        userId,
      });

      console.log(`New SSE connection added for user ${userId}. Total connections: ${this.getTotalConnections()}`);
    } catch (error) {
      console.error(`Error adding connection for user ${userId}:`, error);
    }
  }

  /**
   * Remove a connection for a user
   */
  removeConnection(userId: string, response: Response): void {
    try {
      const userConnections = this.connections.get(userId);
      if (userConnections) {
        userConnections.delete(response);
        
        // Remove empty user entries
        if (userConnections.size === 0) {
          this.connections.delete(userId);
          this.connectionInfo.delete(userId);
        }
      }

      console.log(`SSE connection removed for user ${userId}. Total connections: ${this.getTotalConnections()}`);
    } catch (error) {
      console.error(`Error removing connection for user ${userId}:`, error);
    }
  }

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any): boolean {
    const userConnections = this.connections.get(userId);
    
    if (!userConnections || userConnections.size === 0) {
      console.log(`No active connections for user ${userId}`);
      return false;
    }

    const message: SSEMessage = {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
      userId,
    };

    let sentCount = 0;
    const deadConnections: Response[] = [];

    for (const connection of userConnections) {
      try {
        if (this.sendToConnection(connection, message)) {
          sentCount++;
        } else {
          deadConnections.push(connection);
        }
      } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
        deadConnections.push(connection);
      }
    }

    // Clean up dead connections
    deadConnections.forEach(connection => {
      this.removeConnection(userId, connection);
    });

    console.log(`Sent notification to ${sentCount} connections for user ${userId}`);
    return sentCount > 0;
  }

  /**
   * Send message to a specific connection
   */
  private sendToConnection(response: Response, message: SSEMessage): boolean {
    try {
      const formattedMessage = `data: ${JSON.stringify(message)}\n\n`;
      
      // Check if connection is still writable
      if (response.writableEnded || response.destroyed) {
        return false;
      }

      response.write(formattedMessage);
      return true;
    } catch (error) {
      console.error('Error sending message to connection:', error);
      return false;
    }
  }

  /**
   * Send heartbeat to all active connections
   */
  private sendHeartbeat(): void {
    const heartbeatMessage: SSEMessage = {
      type: 'heartbeat',
      message: 'ping',
      timestamp: new Date().toISOString(),
    };

    let totalSent = 0;
    const usersToClean: string[] = [];

    for (const [userId, userConnections] of this.connections) {
      const deadConnections: Response[] = [];
      let userSentCount = 0;

      for (const connection of userConnections) {
        if (this.sendToConnection(connection, heartbeatMessage)) {
          userSentCount++;
          totalSent++;
        } else {
          deadConnections.push(connection);
        }
      }

      // Clean up dead connections
      deadConnections.forEach(connection => {
        userConnections.delete(connection);
      });

      // Mark user for cleanup if no connections left
      if (userConnections.size === 0) {
        usersToClean.push(userId);
      }

      // Update heartbeat timestamp for user info
      const userInfo = this.connectionInfo.get(userId);
      if (userInfo) {
        userInfo.forEach(info => {
          if (userSentCount > 0) {
            info.lastHeartbeat = new Date();
          }
        });
      }
    }

    // Clean up users with no connections
    usersToClean.forEach(userId => {
      this.connections.delete(userId);
      this.connectionInfo.delete(userId);
    });

    if (process.env.ENABLE_LOGGING === 'true' && totalSent > 0) {
      console.log(`Heartbeat sent to ${totalSent} connections across ${this.connections.size} users`);
    }
  }

  /**
   * Start the heartbeat system
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL_MS);
    
    console.log(`Heartbeat system started with ${this.HEARTBEAT_INTERVAL_MS}ms interval`);
  }

  /**
   * Stop the heartbeat system
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat system stopped');
    }
  }

  /**
   * Get total number of active connections
   */
  getTotalConnections(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.size;
    }
    return total;
  }

  /**
   * Get number of users with active connections
   */
  getActiveUserCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.getTotalConnections(),
      activeUsers: this.getActiveUserCount(),
      userStats: Array.from(this.connections.entries()).map(([userId, connections]) => ({
        userId,
        connectionCount: connections.size,
        info: this.connectionInfo.get(userId) || [],
      })),
    };

    return stats;
  }

  /**
   * Broadcast message to all connected users
   */
  broadcast(message: SSEMessage): number {
    let totalSent = 0;

    for (const [userId, userConnections] of this.connections) {
      for (const connection of userConnections) {
        if (this.sendToConnection(connection, { ...message, userId })) {
          totalSent++;
        }
      }
    }

    console.log(`Broadcast message sent to ${totalSent} connections`);
    return totalSent;
  }

  /**
   * Close all connections for a user
   */
  disconnectUser(userId: string): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      for (const connection of userConnections) {
        try {
          if (!connection.writableEnded) {
            connection.end();
          }
        } catch (error) {
          console.error(`Error closing connection for user ${userId}:`, error);
        }
      }
      this.connections.delete(userId);
      this.connectionInfo.delete(userId);
      console.log(`Disconnected all connections for user ${userId}`);
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`Received ${signal}. Closing all SSE connections...`);
      
      this.stopHeartbeat();
      
      // close all connections
      for (const [userId, userConnections] of this.connections) {
        for (const connection of userConnections) {
          try {
            if (!connection.writableEnded) {
              // Send final message before closing
              this.sendToConnection(connection, {
                type: 'error',
                message: 'Server shutting down',
                timestamp: new Date().toISOString(),
                userId,
              });
              connection.end();
            }
          } catch (error) {
            console.error(`Error closing connection during shutdown:`, error);
          }
        }
      }
      
      this.connections.clear();
      this.connectionInfo.clear();
      
      console.log('All SSE connections closed');
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }
}

// Create singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;