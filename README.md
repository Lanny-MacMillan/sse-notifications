<div align="center">
<h1>SSE Notifications Service</h1>

  <div id="badges">
    <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="NodeJs"/>
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="Typescript"/>
    </a>
    <a href="https://expressjs.com/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white" alt="Gmail Badge"/>
    </a>
  </div>
  <div id="badges">
    <a href="https://www.prisma.io/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/Prisma-5.11-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma"/>
    </a>
    <a href="https://pm2.keymetrics.io/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/PM2-Production-2B037A?style=for-the-badge&logo=pm2&logoColor=white" alt="PM2"/>
    </a>
    <a href="https://aws.amazon.com/ec2/" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/AWS-EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS EC2"/>
    </a>
  </div>
</div>

A production-ready Server-Sent Events (SSE) microservice that powers real-time notifications for [Next-holiday](https://github.com/Lanny-MacMillan/next-holiday), a holiday tracking and social sharing application. This service runs independently on AWS EC2 with PM2 process management, providing persistent connections that AWS Amplify's serverless environment cannot support.

---

## 📚 Table of Contents

- [Why This Service Exists](#-why-this-service-exists)
- [Architecture](#️-architecture)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#️-installation)
- [Integration with Next-holiday](#-integration-with-next-holiday)
- [API Endpoints](#-api-endpoints)
- [Production Deployment (AWS EC2 + PM2)](#-production-deployment-aws-ec2--pm2)
- [Monitoring](#-monitoring)
- [Security](#-security)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Related Projects](#-related-projects)
- [Contributing](#-contributing)

---

---

## ⚡ Quick Start

For developers who want to get started immediately:

```bash
# Clone and install
git clone <your-repo-url>
cd sse-notifications
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL and settings

# Generate Prisma client (required!)
npm run prisma:generate

# Start development server
npm run dev

# Test connection
curl -N "http://localhost:4000/stream?auth0Sub=test|123"
```

The service will be running at `http://localhost:4000`. See [Installation](#️-installation) for detailed setup.

---

## 🌟 Why This Service Exists

Next-holiday is hosted on AWS Amplify, which is excellent for serverless Next.js apps but has a critical limitation: **it cannot maintain long-running connections required for real-time features like SSE (Server-Sent Events)**.

Instead of compromising on real-time notifications or forcing users to constantly poll for updates, this dedicated SSE service was built to:

1. **Maintain persistent connections** with users for instant notification delivery
2. **Share the same database** as the Next-holiday app via Prisma ORM
3. **Run independently** on AWS EC2 with PM2 ensuring 24/7 uptime
4. **Handle real-time delivery** when the main app creates notifications

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next-holiday App                        │
│               (AWS Amplify - Next.js)                       │
│  - User actions create notifications in shared database     │
│  - Calls SSE service to deliver notifications in real-time  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP API Call
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SSE Notifications Service                      │
│                 (AWS EC2 + PM2)                             │
│  - Maintains persistent SSE connections with users          │
│  - Receives notification requests from main app             │
│  - Sends real-time notifications via SSE streams            │
│  - PM2 keeps service alive with automatic restarts          │
│  - 15-second heartbeat keeps connections fresh              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Shared MySQL Database                      │
│  - User table (Auth0 authentication)                        │
│  - Notification table (created, read, dismissed states)     │
│  - Holiday table (holiday metadata)                         │
└─────────────────────────────────────────────────────────────┘
```

### How It Works in Practice

1. **User connects**: Browser establishes SSE connection to this service via `/stream?auth0Sub=<user_id>`
2. **Main app triggers**: When someone likes your holiday or comments, Next-holiday saves notification to database
3. **Real-time delivery**: Next-holiday calls this service's `/api/notify` endpoint
4. **Instant notification**: Service pushes notification through active SSE connection to user's browser
5. **Heartbeat monitoring**: Every 15 seconds, PM2-managed process sends heartbeat to detect dead connections
6. **Auto-recovery**: If connection drops or server restarts, client auto-reconnects

## ✨ Features

- **Real-time SSE Connections** - Persistent connections with automatic reconnection
- **User Authentication** - Integration with Auth0 via database lookup
- **Connection Management** - Automatic cleanup and heartbeat system (15s intervals)
- **Database Integration** - Full Prisma ORM with MySQL support
- **Production-Ready** - PM2 process management with auto-restart on crashes
- **Scalable Architecture** - Memory-efficient connection storage
- **Health Monitoring** - Comprehensive health checks and metrics
- **TypeScript** - Full type safety throughout

### Key Technical Details

- **Event Stream Protocol**: Server-Sent Events (SSE) over HTTP
- **Connection Persistence**: Long-running HTTP connections with automatic reconnection
- **Heartbeat Frequency**: 15-second intervals to detect stale connections
- **Process Manager**: PM2 with automatic restart and zero-downtime deployments
- **Database**: Shared Prisma ORM connection with Next-holiday app
- **Authentication**: Auth0 user validation via database lookup
- **Deployment**: AWS EC2 Ubuntu behind CloudFront (HTTPS), run by PM2
- **Memory Management**: Automatic connection cleanup on disconnect

## 📋 Prerequisites

- Node.js 18+
- MySQL 8.0+
- [Next-holiday](https://github.com/Lanny-MacMillan/next-holiday) app (or similar app with Auth0 and Prisma)
- Access to shared database
- (Production) AWS EC2 instance with Ubuntu

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
CORS_ORIGINS="http://localhost:3000,https://main.xxxx.amplifyapp.com"

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

---

## 🔗 Integration with Next-holiday

This service is designed to work seamlessly with the [Next-holiday](https://github.com/Lanny-MacMillan/next-holiday) application. Here's how they work together:

### Main App → SSE Service Flow

When a user takes an action in Next-holiday (e.g., likes a holiday, adds a comment):

1. **Next-holiday creates notification** in the shared database:

   ```typescript
   // In Next-holiday app
   const notification = await prisma.notification.create({
     data: {
       userId: targetUser.id,
       type: "holiday_liked",
       title: `${currentUser.name} liked your holiday`,
       message: `"${holiday.name}" received a new like`,
       entityType: "holiday",
       entityId: holiday.id,
       fromUserId: currentUser.id,
     },
   });
   ```

2. **Next-holiday calls this SSE service** to deliver in real-time:

   ```typescript
   // Immediately after creating in database
   await fetch(`${process.env.SSE_SERVICE_URL}/api/notify`, {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${process.env.SSE_API_SECRET}`,
     },
     body: JSON.stringify({
       userId: targetUser.id,
       notification: {
         type: "holiday_liked",
         title: notification.title,
         message: notification.message,
         entityType: "holiday",
         entityId: holiday.id,
         fromUserId: currentUser.id,
       },
     }),
   });
   ```

3. **SSE service pushes notification** to connected user's browser instantly
4. **User sees notification** in real-time without refreshing

### Frontend Connection in Next-holiday

The Next-holiday app establishes an SSE connection when users log in:

```typescript
// In Next-holiday: components/NotificationProvider.tsx
const eventSource = new EventSource(
  `${process.env.NEXT_PUBLIC_SSE_URL}/stream?auth0Sub=${user.auth0Sub}`,
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "notification") {
    // Show toast/notification UI
    toast.success(data.data.title);
    // Update notification count
    setNotificationCount((prev) => prev + 1);
  }
};

// Automatic reconnection on disconnect
eventSource.onerror = () => {
  setTimeout(() => (eventSource = new EventSource(url)), 3000);
};
```

## 📡 API Endpoints

### SSE Stream Connection

```
GET /stream?auth0Sub=<auth0_sub>
```

Establishes persistent SSE connection for real-time notifications.

**Parameters:**

- `auth0Sub` (required): User's Auth0 subject ID

**Response:** `text/event-stream`

**Event Types:**

- `connection` - Initial connection confirmation
- `notification` - New notification delivery
- `heartbeat` - Keep-alive ping every 15 seconds (managed by PM2)

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
- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system status with connection metrics

---

## 🚀 Production Deployment (AWS EC2 + PM2)

This service runs on AWS EC2 with **PM2 process manager**, which provides:

- **Auto-restart** on crashes or uncaught exceptions
- **Zero-downtime restarts** during deployments
- **Log management** and monitoring
- **Startup scripts** to survive server reboots
- **Resource monitoring** (CPU, memory usage)

### PM2 Benefits for SSE Service

Unlike traditional serverless or container orchestration, PM2 is ideal for SSE because:

1. **Persistent processes** - SSE requires long-running connections that stay alive
2. **Immediate restart** - If the process crashes, PM2 restarts it in milliseconds
3. **Connection recovery** - Clients auto-reconnect seamlessly on restart
4. **Heartbeat reliability** - PM2 ensures the 15-second heartbeat never stops
5. **Simple monitoring** - `pm2 logs` and `pm2 monit` give instant visibility

### Quick PM2 Commands

```bash
# Start the service (on EC2)
pm2 start dist/server.js --name sse-notifications

# View live logs
pm2 logs sse-notifications

# Monitor resources in real-time
pm2 monit

# Restart after deployment
pm2 restart sse-notifications

# View process status
pm2 list

# Auto-start on server reboot
pm2 startup
pm2 save
```

### AWS EC2 with CloudFront (HTTPS)

This service runs on a small AWS EC2 Ubuntu instance (t4g.micro) behind a CloudFront distribution. CloudFront provides the HTTPS URL that browsers require (an `http://` EventSource is blocked as mixed content from an HTTPS site), so no domain, certificate or Nginx is needed.

```
Browser / Next-holiday (Amplify) ──HTTPS──▶ CloudFront ──HTTP :4000──▶ EC2 (PM2 → node dist/server.js) ──▶ MySQL (RDS)
```

#### 1. Security group

Create a security group for the instance with these inbound rules:

```
Port 22   (SSH)   - your IP only (x.x.x.x/32)
Port 4000 (HTTP)  - CloudFront origin-facing managed prefix list only
                    (com.amazonaws.global.cloudfront.origin-facing)
```

Also allow this security group on port 3306 in the RDS database's security group so the service can reach MySQL.

#### 2. Launch the instance

Launch an Ubuntu 22.04 instance (arm64 `t4g.micro` is enough) with a key pair, in the same VPC as the database, with a public IP. Store the key at `~/.ssh/sse-key.pem` and `chmod 400` it.

#### 3. Install and build

SSH in, then:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2

git clone https://github.com/Lanny-MacMillan/sse-notifications.git ~/sse-notifications
cd ~/sse-notifications
# copy your .env to the server first (scp), see Environment Configuration
npm install
npx prisma generate
npm run build
```

Production `.env` values: `NODE_ENV=production`, `PORT=4000`, the shared `DATABASE_URL`, `CORS_ORIGINS` set to the Next-holiday origin (no trailing slash, comma-separated, e.g. `http://localhost:3000,https://main.xxxx.amplifyapp.com`), and `API_SECRET` from `openssl rand -hex 32`.

#### 4. Run with PM2

```bash
pm2 start dist/server.js --name sse-notifications
pm2 save
pm2 startup   # run the sudo command it prints, then pm2 save again
curl http://localhost:4000/health
```

#### 5. CloudFront distribution

Create a distribution with the instance's public DNS as a custom origin:

- **Origin protocol:** HTTP only, port 4000
- **Origin response timeout:** 60s (the 15s heartbeat keeps connections well inside it)
- **Viewer protocol policy:** redirect HTTP to HTTPS
- **Allowed methods:** GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
- **Cache policy:** `CachingDisabled` (`4135ea2d-6df8-44a3-9df3-4b5a84be39ad`)
- **Origin request policy:** `AllViewer` (`216adef6-5c7f-47e4-b989-5492eafa07d3`), which forwards the `auth0Sub` query string, `Origin` and `Authorization`
- **Compression:** off

The distribution's `https://xxxx.cloudfront.net` domain works as the public URL. For a cleaner production URL, attach a custom domain (e.g. `https://api.sse-notifs.com`): request an ACM certificate in `us-east-1`, add the domain as an alternate domain name on the distribution, and point a DNS `CNAME` at the `cloudfront.net` domain. The examples below use `https://api.sse-notifs.com`.

> The EC2 public DNS name changes if the instance is stopped and started. Attach an Elastic IP (or update the CloudFront origin) if you stop it.

#### 6. Update Next-holiday environment

Set these in the Amplify environment variables (no quotes) and redeploy:

```env
SSE_SERVICE_URL=https://api.sse-notifs.com
NEXT_PUBLIC_SSE_SERVICE_URL=https://api.sse-notifs.com
SSE_API_SECRET=<same value as API_SECRET on the server>
```

#### 7. Verify

```bash
# Terminal 1: stays open, prints a connection message with your DB userId, then heartbeats
curl -N "https://api.sse-notifs.com/stream?auth0Sub=auth0%7Ctest"

# Terminal 2: userId is the DB id from the connection message, not the auth0 sub
curl -X POST https://api.sse-notifs.com/api/notify \
  -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d '{"userId":"<db user id>","notification":{"id":"1","type":"test","title":"hi","message":"hi"}}'

# Wrong secret should return 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.sse-notifs.com/api/notify \
  -H "Authorization: Bearer wrong" -H "Content-Type: application/json" -d '{}'
```

Notifications are routed by the **database user id**: the stream looks up the `auth0Sub` in the `users` table and keys the connection by that user's id, which is what Next-holiday sends as `userId` to `/api/notify`.

#### Updating the service

```bash
ssh -i ~/.ssh/sse-key.pem ubuntu@<ec2-public-dns>
cd ~/sse-notifications
git pull
npx prisma generate
npm run build
pm2 restart sse-notifications --update-env
```

#### Monitoring Your Production Service

```bash
pm2 list
pm2 logs sse-notifications --lines 50
pm2 monit
curl http://localhost:4000/health
```

The service sends a **15-second heartbeat** to all connected clients, which PM2 ensures runs continuously. If a client doesn't receive a heartbeat, it automatically reconnects.

#### Common PM2 Commands

```bash
# View running processes
pm2 list

# View logs (see heartbeats, connections, notifications)
pm2 logs sse-notifications

# Restart service (zero-downtime)
pm2 restart sse-notifications

# Stop service
pm2 stop sse-notifications

# Monitor CPU/memory in real-time
pm2 monit

# Delete process from PM2
pm2 delete sse-notifications

# Ensure service starts on server reboot
pm2 startup  # Run once, then execute the command it outputs
pm2 save     # Save current process list
```

### PM2 Process Details

When running with PM2, you'll see output like:

```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name                 │ status  │ restart │ uptime   │ cpu    │
├─────┼──────────────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ sse-notifications    │ online  │ 2       │ 5D       │ 0.2%   │
└─────┴──────────────────────┴─────────┴─────────┴──────────┴────────┘
```

This shows:

- **Status**: `online` means service is running
- **Restart count**: How many times PM2 has auto-restarted (after crashes or deployments)
- **Uptime**: How long since last restart
- **CPU/Memory**: Resource usage

The service maintains persistent SSE connections and sends heartbeats every 15 seconds to detect dead connections.

### Load Balancing (Multi-Instance Setup)

For multiple instances, configure Nginx upstream with sticky sessions:

```nginx
upstream sse-backend {
    ip_hash;  # Sticky sessions required for SSE
    server 10.0.1.10:4000;
    server 10.0.1.11:4000;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://sse-backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '';
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        chunked_transfer_encoding off;
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

### Uptime Monitoring

Production is monitored externally with [UptimeRobot](https://uptimerobot.com) (free plan):

- **Monitor:** HTTP(s) check on `https://api.sse-notifs.com/health` every 5 minutes
- **Alerts:** email plus push notifications through the UptimeRobot mobile app, on both down and recovery
- **Scope:** confirms the service responds through CloudFront. It does not verify SSE streaming itself, so use the `/stream` check under [Verify](#7-verify) after deploys

After stopping and starting the EC2 instance, `/health` stays down until the CloudFront origin is updated to the new public DNS, and the monitor will alert until then.

### Logging

The service provides structured logging for:

- Connection events (connect/disconnect)
- Authentication attempts
- Notification delivery status
- Error tracking
- Performance metrics
- Heartbeat intervals (every 15 seconds)

View logs with PM2:

```bash
# Real-time logs
pm2 logs sse-notifications

# Last 100 lines
pm2 logs sse-notifications --lines 100

# Error logs only
pm2 logs sse-notifications --err
```

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

**504 from CloudFront:**

- CloudFront can't reach the origin: check `pm2 list` shows `online`, `curl localhost:4000/health` works on the server, and the instance security group allows port 4000 from the CloudFront prefix list
- If the instance was stopped and started, its public DNS changed; update the CloudFront origin

**Prisma "could not locate the Query Engine" crash loop:**

- `prisma/schema.prisma` must set `output = "../src/generated/prisma"` (the app imports `../generated/prisma`); then run `npx prisma generate && npm run build` on the server so the client matches the server's platform

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

---

## 🔗 Related Projects

This service is part of the **Next-holiday** ecosystem:

- **[Next-holiday](https://github.com/Lanny-MacMillan/next-holiday)** - Main application for tracking and sharing holidays
  - Built with Next.js 14, TypeScript, Prisma, and Auth0
  - Hosted on AWS Amplify (serverless)
  - Shares the same MySQL database with this SSE service
  - Calls this service for real-time notification delivery

## 🤝 Contributing

Contributions are welcome! This project uses:

- **TypeScript** for type safety
- **Express** for HTTP server
- **Prisma** for database access
- **PM2** for process management in production

### Development Workflow

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/sse-notifications.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Install dependencies: `npm install`
5. Set up your `.env` file (see Installation section)
6. Start development server: `npm run dev`
7. Make your changes and test thoroughly
8. Commit your changes: `git commit -m 'Add amazing feature'`
9. Push to your branch: `git push origin feature/amazing-feature`
10. Open a Pull Request

### Code Standards

- TypeScript strict mode enabled
- ESLint for code quality
- Follow existing patterns for consistency
- Add JSDoc comments for public functions
- Test endpoints with provided curl commands

## 📞 Support

For issues and support:

1. Check the troubleshooting section
2. Review logs with `ENABLE_LOGGING=true`
3. Check health endpoints for system status
4. Open an issue with detailed error information
