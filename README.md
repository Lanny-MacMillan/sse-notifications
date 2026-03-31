# SSE Notifications Service

A standalone Node.js Server-Sent Events (SSE) service for real-time notifications in the Next Holiday application. This service provides persistent connections for instant notification delivery while working around AWS Amplify's limitations for long-running connections.

## 🚀 Features

- **Real-time SSE Connections** - Persistent connections with automatic reconnection
- **User Authentication** - Integration with Auth0 via database lookup
- **Connection Management** - Automatic cleanup and heartbeat system
- **Database Integration** - Full Prisma ORM with MySQL support
- **Scalable Architecture** - Memory-efficient connection storage
- **Health Monitoring** - Comprehensive health checks and metrics
- **TypeScript** - Full type safety throughout

## 📋 Prerequisites

- Node.js 18+
- MySQL 8.0+
- Existing Next.js app with Prisma and Auth0
- Access to shared database

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
# Navigate to the SSE service directory
cd sse-notifications

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 2. Environment Configuration

Edit `.env` with your configuration:

```env
# Database - SAME DATABASE_URL as your main Next.js app
DATABASE_URL="mysql://username:password@localhost:3306/your_existing_database"

# Server
PORT=4000
NODE_ENV=development

# CORS (include your main app's domain)
CORS_ORIGINS="http://localhost:3000,https://yourdomain.com"

# Security (generate a strong secret)
API_SECRET="your-secure-api-secret-key"

# Features
ENABLE_LOGGING=true
HEARTBEAT_INTERVAL=15000
```

### 3. Database Setup

**Important:** This service connects to your **existing database** - the same one used by your main Next.js app. It does NOT create its own database or tables.

```bash
# Generate Prisma client (required)
# This creates the TypeScript client code to connect to your existing database
npm run prisma:generate

# DON'T run this - your tables already exist in your main app's database:
# npm run prisma:push
```

**Why `prisma:generate` is needed:** Even though your database tables already exist, this command generates the TypeScript client code that allows the SSE service to read from and write to your existing notification and user tables. It's like creating a "driver" to talk to your database - no database changes are made.

### 4. Start the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The service will start on `http://localhost:4000`

## 📡 API Endpoints

### SSE Stream Connection

```
GET /stream?auth0Sub=<auth0_sub>
```

Establishes persistent SSE connection for real-time notifications.

**Parameters:**

- `auth0Sub` (required): User's Auth0 subject ID

**Response:** `text/event-stream`

### Send Notification

```
POST /api/notify
Authorization: Bearer <API_SECRET>
Content-Type: application/json

{
  "userId": "user-id-123",
  "notification": {
    "type": "holiday_reminder",
    "title": "Holiday Reminder",
    "message": "Your holiday is tomorrow!",
    "entityType": "holiday",
    "entityId": "holiday-123",
    "holidayId": "holiday-123",
    "fromUserId": "sender-user-id"
  }
}
```

**Response:**

```json
{
  "success": true,
  "sent": true,
  "message": "Notification sent successfully"
}
```

### Health Check

```
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "connections": 5,
  "uptime": 3600,
  "memory": {
    "used": 45,
    "free": 15,
    "total": 60
  },
  "timestamp": "2024-03-31T10:00:00.000Z"
}
```

### Additional Endpoints

- `GET /api/notifications/unread?userId=<user_id>` - Get unread notifications
- `POST /api/notifications/read` - Mark notifications as read
- `POST /api/notifications/dismiss` - Dismiss notifications
- `GET /health/detailed` - Detailed system status

## 🔧 Integration with Main App

**How it works:** This SSE service connects to your existing database and notification table. When you create notifications in your main Next.js app, you'll also call this service to deliver them in real-time via SSE connections.

### 1. Update Notification Creation

In your Next.js app, **after** creating notifications in your existing database, call the SSE service:

```typescript
// After saving notification to database
const notificationResponse = await fetch("http://localhost:4000/api/notify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.SSE_API_SECRET}`,
  },
  body: JSON.stringify({
    userId: notification.userId,
    notification: {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      holidayId: notification.holidayId,
      fromUserId: notification.fromUserId,
    },
  }),
});
```

### 2. Frontend SSE Connection

Replace your current SSE implementation:

```typescript
// components/NotificationProvider.tsx
const eventSource = new EventSource(
  `http://localhost:4000/stream?auth0Sub=${user.auth0Sub}`,
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "connection":
      console.log("Connected to SSE stream");
      break;
    case "notification":
      // Handle new notification
      setNotifications((prev) => [data.data, ...prev]);
      break;
    case "heartbeat":
      // Connection is alive
      break;
  }
};

eventSource.onerror = (error) => {
  console.error("SSE connection error:", error);
  // Handle reconnection
};
```

### 3. Environment Variables

Add to your main app's environment:

```env
# In your main Next.js app
SSE_SERVICE_URL=http://localhost:4000
SSE_API_SECRET=your-secure-api-secret-key
```

## Production Deployment

### Cloud Platforms

**AWS EC2/Elastic Beanstalk:**

```bash
# Deploy Node.js application directly
# Use Application Load Balancer with sticky sessions for SSE
```

**Google Cloud Run:**

```yaml
# Deploy as Node.js service
# Configure for persistent connections
```

**Railway:**

```bash
# Automatic Node.js detection
# Uses package.json start script
```

**Render/Vercel:**

```bash
# Node.js deployment
# Configure environment variables
```

### Load Balancing

For multiple instances, use sticky sessions:

```nginx
# nginx.conf
upstream sse-backend {
    ip_hash;  # Sticky sessions for SSE
    server sse-1:4000;
    server sse-2:4000;
}

server {
    location / {
        proxy_pass http://sse-backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_cache_bypass 1;
        proxy_no_cache 1;
    }
}
```

## 📊 Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:4000/health

# Detailed status
curl http://localhost:4000/health/detailed
```

### Logging

The service provides structured logging for:

- Connection events (connect/disconnect)
- Authentication attempts
- Notification delivery status
- Error tracking
- Performance metrics

### Metrics

Monitor these key metrics:

- Active connections per user
- Total connections
- Memory usage
- Notification delivery success rate
- Connection duration
- Heartbeat failures

## 🔒 Security

### Authentication

- Auth0 integration via database lookup
- API key protection for internal endpoints
- Rate limiting for connection attempts

### Network Security

- CORS configuration for allowed origins
- Helmet.js security headers
- Request validation and sanitization

### Environment Security

- Secure API secrets
- Database connection encryption
- No sensitive data in logs

## 🧪 Testing

```bash
# Test SSE connection
curl -N -H "Accept: text/event-stream" \
  "http://localhost:4000/stream?auth0Sub=test|123"

# Test notification sending
curl -X POST http://localhost:4000/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-secret" \
  -d '{"userId":"user-123","notification":{"type":"test","title":"Test Notification"}}'

# Test health endpoint
curl http://localhost:4000/health
```

## 🐛 Troubleshooting

### Common Issues

**Connection Refused:**

- Check if service is running on correct port
- Verify firewall settings
- Check CORS configuration

**Database Connection:**

- Verify DATABASE_URL is correct
- Check MySQL service status
- Ensure database exists and is accessible

**Authentication Failures:**

- Verify auth0Sub parameter format
- Check if user exists in database
- Validate API secret for internal calls

**Memory Issues:**

- Monitor connection count
- Check for memory leaks
- Review heartbeat settings

### Debug Mode

```bash
# Enable verbose logging
ENABLE_LOGGING=true npm run dev

# Check connection status
curl http://localhost:4000/health/detailed
```

## 🔄 Development

### Project Structure

```
sse-notifications/
├── src/
│   ├── server.ts          # Main Express server
│   ├── routes/            # API endpoints
│   │   ├── stream.ts      # SSE endpoint
│   │   ├── notify.ts      # Notification API
│   │   └── health.ts      # Health checks
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts        # Authentication
│   │   ├── cors.ts        # CORS config
│   │   └── errorHandler.ts
│   ├── services/          # Business logic
│   │   ├── connections.ts # SSE management
│   │   └── notifications.ts
│   ├── lib/
│   │   └── prisma.ts      # Database client
│   └── types/             # TypeScript types
├── prisma/
│   └── schema.prisma      # Database schema
└── dist/                  # Compiled JavaScript
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run type-check   # Type checking only
npm run prisma:generate  # Generate Prisma client
npm run prisma:push     # Push schema changes
npm run prisma:studio   # Open Prisma Studio
```

## 📄 License

ISC License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and support:

1. Check the troubleshooting section
2. Review logs with `ENABLE_LOGGING=true`
3. Check health endpoints for system status
4. Open an issue with detailed error information
